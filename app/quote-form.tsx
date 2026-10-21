"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quoteSchema, type QuoteFormData } from "@/lib/quotes/schema";
import { calculateQuote } from "@/lib/quotes/calculate";
import { criarOrcamento } from "../lib/quotes/actions";
import { useState, useTransition } from "react";

export default function QuoteForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [serverError, setServerError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const { register, control, handleSubmit, formState: { errors } } =
    useForm({
      resolver: zodResolver(quoteSchema),
      defaultValues: {
        discountPercent: 0,
        items: [{ description: "", quantity: 1, unitPrice: 0 }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // Pré-visualização do total (apenas visual; o servidor recalcula)
  const items = useWatch({ control, name: "items" });
  const discount = useWatch({ control, name: "discountPercent" });
  const preview = calculateQuote(
    (items ?? []).map((i) => ({
      description: i.description,
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
    })),
    Number(discount) || 0
  );

  const onSubmit = (values: QuoteFormData) => {
    startTransition(async () => {
      const res = await criarOrcamento(values);
      if (res?.error) setServerError(res.error);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <select {...register("clientId")} className="w-full rounded border p-2">
        <option value="">Selecione o cliente…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {errors.clientId && <p className="text-sm text-red-600">{errors.clientId.message}</p>}

      <input type="date" {...register("validUntil")} className="rounded border p-2" />

      <h2 className="font-semibold">Itens</h2>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <input placeholder="Descrição" {...register(`items.${index}.description`)}
                 className="flex-1 rounded border p-2" />
          <input type="number" step="0.01" {...register(`items.${index}.quantity`)}
                 className="w-20 rounded border p-2" />
          <input type="number" step="0.01" {...register(`items.${index}.unitPrice`)}
                 className="w-28 rounded border p-2" />
          <button type="button" onClick={() => remove(index)}>✕</button>
        </div>
      ))}
      {errors.items && <p className="text-sm text-red-600">Revise os itens</p>}

      <button type="button"
              onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
              className="rounded border px-3 py-1">
        + Adicionar item
      </button>

      <input type="number" step="0.01" placeholder="Desconto %"
             {...register("discountPercent")} className="block rounded border p-2" />

      <div className="text-right">
        <p>Subtotal: R$ {preview.subtotal.toFixed(2)}</p>
        <p className="text-lg font-bold">Total: R$ {preview.total.toFixed(2)}</p>
      </div>

      {serverError && <p className="text-red-600">{serverError}</p>}
      <button disabled={pending} className="rounded bg-black px-4 py-2 text-white">
        {pending ? "Salvando…" : "Criar orçamento"}
      </button>
    </form>
  );
}