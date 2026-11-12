"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { quoteSchema } from "@/lib/quotes/schema";
import { calculateQuote } from "@/lib/quotes/calculate";
import { canTransition, type QuoteStatus } from "@/lib/quotes/status";
import { enviarEmailOrcamento } from "@/lib/email/enviar";
import { brl } from "@/lib/format";

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

export async function enviarOrcamentoPorEmail(quoteId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // A RLS (user_id = auth.uid()) já garante que só o dono enxerga este orçamento
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, total, status, valid_until, public_token, clients(name, email)")
    .eq("id", quoteId)
    .single();

  if (!quote) return { error: "Orçamento não encontrado" };
  if (quote.status === "draft")
    return { error: "Marque como enviado antes de mandar o e-mail" };

  const client = Array.isArray(quote.clients) ? quote.clients[0] : quote.clients;
  if (!client?.email) return { error: "Cliente sem e-mail cadastrado" };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const result = await enviarEmailOrcamento({
    para: client.email,
    nomeCliente: client.name,
    nomeTecnico: user.user_metadata?.name ?? user.email ?? "Seu técnico",
    numero: quote.id.slice(0, 8).toUpperCase(),
    totalFormatado: brl(quote.total),
    urlPublica: `${baseUrl}/q/${quote.public_token}`,
    validade: quote.valid_until
      ? new Date(quote.valid_until).toLocaleDateString("pt-BR", { timeZone: "UTC" })
      : undefined,
  });

  if (!result.ok) return { error: "Falha ao enviar o e-mail" };
  return { error: null };
}