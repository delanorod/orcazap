"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { quoteSchema } from "@/lib/quotes/schema";
import { calculateQuote } from "@/lib/quotes/calculate";
import { canTransition, type QuoteStatus } from "@/lib/quotes/status";

export async function criarOrcamento(raw: unknown) {
  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) return { error: "Dados inválidos" };

  const data = parsed.data;
  const { lines, subtotal, total } = calculateQuote(data.items, data.discountPercent);

  const supabase = await createClient();

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      client_id: data.clientId,
      valid_until: data.validUntil,
      discount_percent: data.discountPercent,
      notes: data.notes,
      subtotal,
      total,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: itemsError } = await supabase.from("quote_items").insert(
    lines.map((l) => ({
      quote_id: quote.id,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      line_total: l.lineTotal,
    }))
  );

  if (itemsError) return { error: itemsError.message };

  redirect(`/orcamentos/${quote.id}`);
}

export async function mudarStatus(quoteId: string, to: QuoteStatus) {
  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("quotes").select("status").eq("id", quoteId).single();

  if (!quote) return { error: "Orçamento não encontrado" };
  if (!canTransition(quote.status, to))
    return { error: `Transição ${quote.status} → ${to} não permitida` };

  const { error } = await supabase.from("quotes").update({ status: to }).eq("id", quoteId);
  if (error) return { error: error.message };

  revalidatePath(`/orcamentos/${quoteId}`);
}