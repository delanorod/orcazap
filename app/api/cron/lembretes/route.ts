import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmailEvento } from "@/lib/email/enviar";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const agora = new Date();
  const hoje = agora.toISOString().slice(0, 10);
  const limite = new Date(agora.getTime() + 2 * 86_400_000).toISOString().slice(0, 10);

  // Enviados, sem resposta, vencendo hoje ou nos próximos 2 dias, ainda sem lembrete
  const { data: quotes, error } = await admin
    .from("quotes")
    .select("id, public_token, valid_until, clients(name, email)")
    .eq("status", "sent")
    .is("reminded_at", null)
    .gte("valid_until", hoje)
    .lte("valid_until", limite);

  if (error) {
    console.error("cron lembretes:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  let enviados = 0;

  for (const q of quotes ?? []) {
    const client = Array.isArray(q.clients) ? q.clients[0] : q.clients;
    if (!client?.email) continue;

    const validade = new Date(q.valid_until).toLocaleDateString("pt-BR", { timeZone: "UTC" });

    await enviarEmailEvento({
      para: client.email,
      assunto: "Seu orçamento está perto de vencer",
      titulo: "Seu orçamento está perto de vencer",
      mensagem: `Olá, ${client.name}! O orçamento enviado para você vale até ${validade}. Veja os detalhes e responda pelo link.`,
      url: `${baseUrl}/q/${q.public_token}`,
    });

    await admin.from("quotes").update({ reminded_at: new Date().toISOString() }).eq("id", q.id);
    enviados++;
  }

  return NextResponse.json({ ok: true, enviados });
}