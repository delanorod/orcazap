export type PlanoId = 'basico' | 'profissional' | 'premium';
export type Recurso = 'pdf' | 'email' | 'whatsapp' | 'lembretes' | 'logo';

export type Plano = {
  id: PlanoId;
  nome: string;
  precoMensal: number; // em reais
  limiteOrcamentosMes: number | null; // null = ilimitado
  recursos: readonly Recurso[];
  descricao: string;
};

export const PLANOS: Record<PlanoId, Plano> = {
  basico: {
    id: 'basico', nome: 'Básico', precoMensal: 49, limiteOrcamentosMes: 30,
    recursos: ['pdf', 'email'],
    descricao: 'Para quem está começando: até 30 orçamentos por mês.',
  },
  profissional: {
    id: 'profissional', nome: 'Profissional', precoMensal: 79, limiteOrcamentosMes: 150,
    recursos: ['pdf', 'email', 'whatsapp', 'lembretes'],
    descricao: 'Envio por WhatsApp e lembretes de expiração.',
  },
  premium: {
    id: 'premium', nome: 'Premium', precoMensal: 129, limiteOrcamentosMes: null,
    recursos: ['pdf', 'email', 'whatsapp', 'lembretes', 'logo'],
    descricao: 'Orçamentos ilimitados e sua logo no PDF.',
  },
};

export const LISTA_PLANOS: Plano[] = [PLANOS.basico, PLANOS.profissional, PLANOS.premium];

/** Durante o trial o técnico testa o plano do meio. */
export const TRIAL_PLANO: PlanoId = 'profissional';
export const TRIAL_DIAS = 7;

export function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}