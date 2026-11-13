import { NextResponse } from 'next/server';
import { obterAssinatura } from '@/lib/acesso';
import { MpError, cancelarPreapproval } from '@/lib/mercadopago/client';
import { createAdminClient } from '@/lib/supabase/admin';

/** Cancela a renovação. O acesso continua até o fim do período já pago. */
export async function POST() {
  const { user, assinatura } = await obterAssinatura();

  if (!assinatura.mp_preapproval_id) {
    return NextResponse.json({ erro: 'Nenhuma assinatura recorrente para cancelar.' }, { status: 400 });
  }

  try {
    await cancelarPreapproval(assinatura.mp_preapproval_id);
    await createAdminClient().from('assinaturas').update({ status: 'cancelada' }).eq('user_id', user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[cancelar]', e instanceof MpError ? { status: e.status, corpo: e.corpo } : e);
    return NextResponse.json({ erro: 'Não foi possível cancelar agora.' }, { status: 502 });
  }
}