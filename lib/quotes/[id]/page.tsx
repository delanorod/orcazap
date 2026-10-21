import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // no Next 15/16 params é uma Promise
  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("*, quote_items(*), clients(name)")
    .eq("id", id)
    .single();

  if (!quote) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Orçamento — {quote.clients?.name}</h1>
      <p>Status: {quote.status}</p>
      <ul>
        {quote.quote_items.map((i: any) => (
          <li key={i.id}>{i.description} — {i.quantity} × R$ {i.unit_price} = R$ {i.line_total}</li>
        ))}
      </ul>
      <p className="font-bold">Total: R$ {quote.total}</p>
    </main>
  );
}