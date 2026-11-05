// lib/email/enviar.ts
import { getResend, EMAIL_FROM } from "./client";
import OrcamentoEnviado from "@/emails/orcamento-enviado";
import OrcamentoEvento from "@/emails/orcamento-evento";

export async function enviarEmailOrcamento(params: {
  para: string;
  nomeCliente: string;
  nomeTecnico: string;
  numero: number | string;
  totalFormatado: string;
  urlPublica: string;
  validade?: string;
}) {
  const { data, error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to: params.para,
    subject: `Orçamento nº ${params.numero} de ${params.nomeTecnico}`,
    react: OrcamentoEnviado(params),
  });

  if (error) {
    console.error("Falha ao enviar e-mail:", error);
    return { ok: false as const, error };
  }
  return { ok: true as const, id: data?.id };
}

export async function enviarEmailEvento(p: {
  para: string; assunto: string; titulo: string; mensagem: string; url: string;
}) {
  const { error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to: p.para,
    subject: p.assunto,
    react: OrcamentoEvento({ titulo: p.titulo, mensagem: p.mensagem, url: p.url }),
  });
  if (error) console.error("Resend:", error);
}