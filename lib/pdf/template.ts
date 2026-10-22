import { brl, dateBR } from "@/lib/format";
import type { QuotePdfData } from "./types";

// Escapa HTML: as descrições são digitadas por usuários e o Chrome do
// servidor vai renderizar esse HTML. Sem isso, alguém poderia injetar tags.
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
   .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderQuoteHtml(d: QuotePdfData) {
  const rows = d.items
    .map(
      (i) => `<tr>
        <td>${esc(i.description)}</td>
        <td class="r">${i.quantity}</td>
        <td class="r">${brl(i.unitPrice)}</td>
        <td class="r">${brl(i.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const discount = d.subtotal - d.total;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<style>
  @page { size: A4; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start;
           border-bottom: 3px solid #111; padding-bottom: 12px; margin-bottom: 20px; }
  h1 { font-size: 22px; margin: 0; }
  .muted { color: #555; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { text-align: left; background: #f1f1f1; padding: 8px; font-size: 11px; }
  td { padding: 8px; border-bottom: 1px solid #ddd; }
  .r { text-align: right; }
  tr { page-break-inside: avoid; }
  .totais { margin-top: 16px; margin-left: auto; width: 240px; }
  .totais div { display: flex; justify-content: space-between; padding: 3px 0; }
  .total { font-size: 16px; font-weight: bold; border-top: 2px solid #111; margin-top: 6px; padding-top: 6px; }
  .notes { margin-top: 24px; }
</style></head>
<body>
  <header>
    <div>
      <h1>${esc(d.businessName)}</h1>
      ${d.businessPhone ? `<div class="muted">${esc(d.businessPhone)}</div>` : ""}
    </div>
    <div class="r">
      <strong>ORÇAMENTO</strong>
      <div class="muted">Emitido em ${dateBR(d.createdAt)}</div>
      <div class="muted">Válido até ${dateBR(d.validUntil)}</div>
    </div>
  </header>

  <div><span class="muted">Cliente:</span> <strong>${esc(d.clientName)}</strong></div>

  <table>
    <thead><tr><th>Descrição</th><th class="r">Qtd</th><th class="r">Unitário</th><th class="r">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totais">
    <div><span>Subtotal</span><span>${brl(d.subtotal)}</span></div>
    ${d.discountPercent > 0 ? `<div><span>Desconto (${d.discountPercent}%)</span><span>- ${brl(discount)}</span></div>` : ""}
    <div class="total"><span>Total</span><span>${brl(d.total)}</span></div>
  </div>

  ${d.notes ? `<div class="notes"><strong>Observações</strong><p>${esc(d.notes)}</p></div>` : ""}
</body></html>`;
}