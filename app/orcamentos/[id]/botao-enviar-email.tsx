"use client";

import { useState, useTransition } from "react";
import { enviarOrcamentoPorEmail } from "../actions";

export function BotaoEnviarEmail({
  quoteId,
  disabled,
}: {
  quoteId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div>
      <button
        className="rounded border px-3 py-1 disabled:opacity-50"
        disabled={disabled || pending}
        onClick={() =>
          startTransition(async () => {
            const r = await enviarOrcamentoPorEmail(quoteId);
            setMsg(r.error ?? "E-mail enviado!");
          })
        }
      >
        {pending ? "Enviando..." : "Enviar por e-mail"}
      </button>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}