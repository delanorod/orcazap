import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AssinaturaRow } from '@/lib/assinatura';

const COLUNAS =
  'user_id, plano, status, metodo, trial_ends_at, periodo_fim, mp_preapproval_id' as const;

/** Lê a assinatura do usuário logado (a RLS garante que é a dele). */
export async function obterAssinatura() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect('/login');

  let { data: linha } = await supabase
    .from('assinaturas')
    .select(COLUNAS)
    .eq('user_id', user.id)
    .maybeSingle<AssinaturaRow>();

  // Rede de segurança: usuário sem linha ganha uma (valores padrão = trial)
  if (!linha) {
    const admin = createAdminClient();
    await admin.from('assinaturas').upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true });
    const reler = await admin.from('assinaturas').select(COLUNAS).eq('user_id', user.id).single<AssinaturaRow>();
    linha = reler.data;
  }
  if (!linha) throw new Error('Não foi possível carregar a assinatura');

  return { user, supabase, assinatura: linha };
}