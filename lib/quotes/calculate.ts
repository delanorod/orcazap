export type ItemInput = { description: string; quantity: number; unitPrice: number };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculateQuote(items: ItemInput[], discountPercent = 0) {
  const lines = items.map((i) => ({
    ...i,
    lineTotal: round2(i.quantity * i.unitPrice),
  }));
  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const discount = round2(subtotal * (discountPercent / 100));
  const total = round2(subtotal - discount);
  return { lines, subtotal, discount, total };
}