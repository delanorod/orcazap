// lib/whatsapp.ts
export function normalizarTelefoneBR(telefone: string): string | null {
  let d = telefone.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (!d.startsWith("55")) d = "55" + d;
  // 55 + DDD(2) + 8 ou 9 dígitos
  return d.length === 12 || d.length === 13 ? d : null;
}

type DadosMensagem = {
  nomeCliente: string;
  nomeTecnico: string;
  numero: number | string;
  totalFormatado: string; // ex.: "R$ 350,00"
  urlPublica: string;     // ex.: `${APP_URL}/q/${token}`
  validade?: string;      // ex.: "05/11/2026"
};

export function montarMensagemOrcamento(d: DadosMensagem): string {
  return [
    `Olá, ${d.nomeCliente}! Aqui é ${d.nomeTecnico}.`,
    ``,
    `Segue o orçamento nº ${d.numero} no valor de ${d.totalFormatado}.`,
    d.validade ? `Válido até ${d.validade}.` : null,
    ``,
    `Veja os detalhes e aprove por aqui:`,
    d.urlPublica,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function gerarLinkWhatsApp(telefone: string, mensagem: string): string | null {
  const numero = normalizarTelefoneBR(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}