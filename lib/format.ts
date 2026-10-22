export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

// Aceita "2026-10-30" (date) ou um timestamp completo.
// Para datas sem hora, NÃO use new Date(): ela vira UTC e mostra o dia anterior no Brasil.
export function dateBR(iso: string) {
  if (iso.length === 10) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}