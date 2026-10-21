import { createClient } from "@/lib/supabase/server";
import QuoteForm from "../../../app/quote-form";

export default async function NewQuotePage() {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id, name");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Novo orçamento</h1>
      <QuoteForm clients={clients ?? []} />
    </main>
  );
}