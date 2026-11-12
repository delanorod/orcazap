import { PLANOS, type PlanoId } from './planos';

export type StatusAssinatura =
  | 'trial' | 'pendente' | 'ativa' | 'pausada' | 'cancelada' | 'inadimplente';

export type MetodoPagamento = 'cartao' | 'pix';

/** Linha da tabela public.assinaturas */
export type AssinaturaRow = {
  user_id: string;
  plano: PlanoId | null;
  status: StatusAssinatura;
  metodo: MetodoPagamento | null;
  trial_ends_at: string;
  periodo_fim: string | null;
  mp_preapproval_id: string | null;
};

// external_reference: liga o pagamento do Mercado Pago ao usuário.
// Formato: oz|<userId>|<plano>|<metodo>
export type Referencia = { userId: string; plano: PlanoId; metodo: MetodoPagamento };

export function montarReferencia(r: Referencia): string {
  return `oz|${r.userId}|${r.plano}|${r.metodo}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lerReferencia(valor: unknown): Referencia | null {
  if (typeof valor !== 'string') return null;
  const [prefixo, userId, plano, metodo] = valor.split('|');
  if (prefixo !== 'oz' || !UUID.test(userId ?? '')) return null;
  if (!(plano in PLANOS)) return null;
  if (metodo !== 'cartao' && metodo !== 'pix') return null;
  return { userId, plano: plano as PlanoId, metodo };
}