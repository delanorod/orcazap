import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { mudarStatus } from "../actions";
import {
  nextStatuses,
  statusLabel,
  type QuoteStatus,
} from "@/lib/quotes/status";
import { brl } from "@/lib/format";
import { BotaoEnviarEmail } from "./botao-enviar-email";

type QuoteItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export default async function OrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, quote_items(*), clients(name, email)")
    .eq("id", id)
    .single();

  if (!quote) notFound();

  const status = quote.status as QuoteStatus;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const publicUrl = `${baseUrl}/q/${quote.public_token}`;
  const items = quote.quote_items as QuoteItem[];
  const statuses = nextStatuses(status);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">
        Orçamento — {quote.clients?.name}
      </h1>

      <p>
        Status: <strong>{statusLabel[status]}</strong>
      </p>

      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.description} — {item.quantity} × {brl(item.unit_price)} ={" "}
            {brl(item.line_total)}
          </li>
        ))}
      </ul>

      <p className="font-bold">Total: {brl(quote.total)}</p>

      {/* Botões: PDF + status + e-mail */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`/orcamentos/${quote.id}/pdf`}
          className="rounded border px-3 py-1"
        >
          Baixar PDF
        </a>

        {statuses.map((to) => (
          <form
            key={to}
            action={async () => {
              "use server";
              await mudarStatus(quote.id, to);
            }}
          >
            <button className="rounded border px-3 py-1">
              Marcar como {statusLabel[to].toLowerCase()}
            </button>
          </form>
        ))}

        <BotaoEnviarEmail
          quoteId={quote.id}
          disabled={status === "draft" || !quote.clients?.email}
        />

        {statuses.length === 0 && (
          <p className="text-sm text-gray-500">
            Status final, sem mais transições.
          </p>
        )}
      </div>

      {/* Link público: só faz sentido depois de enviado */}
      {status === "draft" ? (
        <p className="text-sm text-gray-500">
          Marque como enviado para liberar o link do cliente.
        </p>
      ) : (
        <>
          <p className="text-sm">
            Link para o cliente:{" "}
            <code className="break-all">{publicUrl}</code>
          </p>
          {!quote.clients?.email && (
            <p className="text-sm text-gray-500">
              Cadastre o e-mail do cliente para poder enviar por e-mail.
            </p>
          )}
        </>
      )}
    </main>
  );
}