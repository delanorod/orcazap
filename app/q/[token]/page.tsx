import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { brl, dateBR } from "@/lib/format";
import { responder } from "./actions";

const mensagens: Record<string, string> = {
  accepted: "✅ Orçamento aceito. Obrigado!",
  rejected: "Orçamento recusado.",
  expired: "Este orçamento expirou. Entre em contato para uma nova proposta.",
};

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Token inválido (não é UUID) → 404 sem nem consultar o banco
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const supabase = await createClient();
  const { data: q } = await supabase.rpc("get_public_quote", { p_token: token });
  if (!q) notFound();

  const podeResponder = q.status === "sent" || q.status === "viewed";

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="border-b-2 border-black pb-3">
        <h1 className="text-2xl font-bold">{q.business_name ?? "Orçamento"}</h1>
        {q.business_phone && <p className="text-gray-600">{q.business_phone}</p>}
      </header>

      <p>
        Olá, <strong>{q.client_name}</strong>. Segue seu orçamento, válido até{" "}
        <strong>{dateBR(q.valid_until)}</strong>.
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Descrição</th>
            <th className="p-2 text-right">Qtd</th>
            <th className="p-2 text-right">Unitário</th>
            <th className="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {q.items.map((i: any, idx: number) => (
            <tr key={idx} className="border-b">
              <td className="p-2">{i.description}</td>
              <td className="p-2 text-right">{i.quantity}</td>
              <td className="p-2 text-right">{brl(i.unit_price)}</td>
              <td className="p-2 text-right">{brl(i.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-right">
        <p>Subtotal: {brl(q.subtotal)}</p>
        {Number(q.discount_percent) > 0 && <p>Desconto: {q.discount_percent}%</p>}
        <p className="text-xl font-bold">Total: {brl(q.total)}</p>
      </div>

      {q.notes && <p className="text-sm text-gray-700">Observações: {q.notes}</p>}

      <a href={`/q/${token}/pdf`} className="inline-block rounded border px-3 py-1">
        Baixar PDF
      </a>

      {podeResponder ? (
        <div className="flex gap-3">
          <form action={async () => { "use server"; await responder(token, "accepted"); }}>
            <button className="rounded bg-green-700 px-5 py-2 text-white">Aceitar orçamento</button>
          </form>
          <form action={async () => { "use server"; await responder(token, "rejected"); }}>
            <button className="rounded border px-5 py-2">Recusar</button>
          </form>
        </div>
      ) : (
        <p className="font-semibold">{mensagens[q.status] ?? ""}</p>
      )}
    </main>
  );
}