export type QuoteStatus =
  | "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";

const transitions: Record<QuoteStatus, QuoteStatus[]> = {
  draft:    ["sent"],
  sent:     ["viewed", "accepted", "rejected", "expired"],
  viewed:   ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired:  [],
};

export function canTransition(from: QuoteStatus, to: QuoteStatus) {
  return transitions[from].includes(to);
}

export function nextStatuses(from: QuoteStatus): QuoteStatus[] {
  return transitions[from];
}

export const statusLabel: Record<QuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  viewed: "Visualizado",
  accepted: "Aceito",
  rejected: "Recusado",
  expired: "Expirado",
};