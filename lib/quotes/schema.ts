import { z } from "zod";

export const quoteSchema = z.object({
  clientId: z.string().uuid("Selecione um cliente"),
  validUntil: z.string().min(1, "Informe a validade"),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Descrição obrigatória"),
        quantity: z.coerce.number().positive("Quantidade > 0"),
        unitPrice: z.coerce.number().min(0),
      })
    )
    .min(1, "Adicione pelo menos um item"),
});

export type QuoteFormData = z.infer<typeof quoteSchema>;