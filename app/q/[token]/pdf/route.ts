import { createClient } from "@/lib/supabase/server";
import { generateQuotePdf } from "@/lib/pdf/generate";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new Response("Não encontrado", { status: 404 });

  const supabase = await createClient();
  const { data: q } = await supabase.rpc("get_public_quote", { p_token: token });
  if (!q) return new Response("Não encontrado", { status: 404 });

  const pdf = await generateQuotePdf({
    businessName: q.business_name ?? "Orçamento",
    businessPhone: q.business_phone,
    clientName: q.client_name,
    createdAt: q.created_at,
    validUntil: q.valid_until,
    items: q.items.map((i: any) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      lineTotal: Number(i.line_total),
    })),
    subtotal: Number(q.subtotal),
    discountPercent: Number(q.discount_percent),
    total: Number(q.total),
    notes: q.notes,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="orcamento.pdf"',
    },
  });
}