// lib/notifications.ts
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmailEvento } from "@/lib/email/enviar";

export type EventoOrcamento = "viewed" | "accepted" | "declined";

const verbo = { viewed: "visualizou", accepted: "aceitou", declined: "recusou" } as const;
const titulo = {
  viewed: "Orçamento visualizado",
  accepted: "Orçamento aceito",
  declined: "Orçamento recusado",
} as const;

export async function notificarTecnico(quoteId: string, tipo: EventoOrcamento) {
  try {
    const admin = createAdminClient();

    const { data: q } = await admin
      .from("quotes")
      .select("id, user_id, clients(name)")
      .eq("id", quoteId)
      .single();
    if (!q) return;

    const client = Array.isArray(q.clients) ? q.clients[0] : q.clients;
    const numero = q.id.slice(0, 8).toUpperCase();
    const message = `${client?.name ?? "O cliente"} ${verbo[tipo]} o orçamento ${numero}`;

    await admin.from("notifications").insert({
      user_id: q.user_id, quote_id: q.id, type: tipo, message,
    });

    if (tipo !== "viewed") {
      const { data } = await admin.auth.admin.getUserById(q.user_id);
      const email = data.user?.email;
      if (email) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
        await enviarEmailEvento({
          para: email,
          assunto: `${titulo[tipo]}: ${numero}`,
          titulo: titulo[tipo],
          mensagem: message,
          url: `${baseUrl}/orcamentos/${q.id}`,
        });
      }
    }
  } catch (e) {
    // Falha em notificar nunca pode quebrar o aceite do cliente
    console.error("notificarTecnico:", e);
  }
}