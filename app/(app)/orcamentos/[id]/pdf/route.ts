import { createClient } from "@/lib/supabase/server";
import { generateQuotePdf } from "@/lib/pdf/generate";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: q } = await supabase
    .from("quotes")
    .select("*, quote_items(*), clients(name)")
    .eq("id", id)
    .single();
  if (!q) return new Response("Orçamento não encontrado", { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, phone")
    .maybeSingle();

  const pdf = await generateQuotePdf({
    businessName: profile?.business_name ?? "Meu negócio",
    businessPhone: profile?.phone,
    clientName: q.clients?.name ?? "",
    createdAt: q.created_at,
    validUntil: q.valid_until,
    items: q.quote_items.map((i: any) => ({
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
      "Content-Disposition": `attachment; filename="orcamento-${id.slice(0, 8)}.pdf"`,
    },
  });
}