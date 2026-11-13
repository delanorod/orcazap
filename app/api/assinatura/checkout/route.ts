import { NextResponse } from 'next/server';
import { z } from 'zod';
import { obterAssinatura } from '@/lib/acesso';
import { montarReferencia } from '@/lib/assinatura';
import { PLANOS } from '@/lib/planos';
import { MpError, criarPreapproval, criarPreferencia } from '@/lib/mercadopago/client';
import { createAdminClient } from '@/lib/supabase/admin';


// Zod valida o que chega do navegador. Nunca confie no corpo da requisição.
const Corpo = z.object({
  plano: z.enum(['basico', 'profissional', 'premium']),
  metodo: z.enum(['cartao', 'pix']),
});

export async function POST(request: Request) {
  const parsed = Corpo.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Plano ou método inválido.' }, { status: 400 });
  }
  const { plano: planoId, metodo } = parsed.data;
  const plano = PLANOS[planoId]; // o PREÇO vem do servidor, não do navegador

  const { user, assinatura } = await obterAssinatura();
  if (!user.email) return NextResponse.json({ erro: 'Sua conta não tem e-mail.' }, { status: 400 });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  if (!appUrl) return NextResponse.json({ erro: 'NEXT_PUBLIC_APP_URL não configurada.' }, { status: 500 });

  const referencia = montarReferencia({ userId: user.id, plano: planoId, metodo });
  const retorno = `${appUrl}/assinatura/retorno`;

  try {
    if (metodo === 'pix') {
      const pref = await criarPreferencia({
        items: [{
          id: `orcazap-${planoId}`,
          title: `OrçaZap${plano.nome} · 1 mês`,
          quantity: 1,
          unit_price: plano.precoMensal,
          currency_id: 'BRL',
        }],
        payer: { email: user.email },
        external_reference: referencia,
        back_urls: { success: retorno, failure: retorno, pending: retorno },
        // auto_return só aceita https
        ...(appUrl.startsWith('https://') ? { auto_return: 'approved' } : {}),
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
        statement_descriptor: 'ORCAZAP',
        // Só Pix: tira cartões e boleto da tela
        payment_methods: {
          excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }],
          installments: 1,
        },
      });
      return NextResponse.json({ url: pref.init_point });
    }

       // ---------------------------------------------- Cartão (recorrente)
    // Já tem assinatura no cartão funcionando? Evita duas cobranças ao mesmo tempo.
    if (assinatura.mp_preapproval_id && assinatura.status === 'ativa' && assinatura.metodo === 'cartao') {
      return NextResponse.json(
        { erro: 'Você já tem uma assinatura no cartão. Cancele a atual antes de trocar de plano.' },
        { status: 409 },
      );
    }

    const pre = await criarPreapproval({
      reason: `OrçaZap ${plano.nome}`,
      external_reference: referencia,
      payer_email: user.email,
      back_url: retorno,
      status: 'pending', // o cliente informa o cartão na tela do Mercado Pago
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plano.precoMensal,
        currency_id: 'BRL',
      },
    });

    if (!pre.init_point) throw new Error('Mercado Pago não retornou init_point');

    // Guarda o id ANTES de mandar o usuário embora: o webhook usa isso para casar a assinatura.
    const { error } = await createAdminClient()
      .from('assinaturas')
      .update({ mp_preapproval_id: pre.id })
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ url: pre.init_point });
  } catch (err) {
    if (err instanceof MpError) {
      console.error('[mp]', err.status, JSON.stringify(err.corpo));
      return NextResponse.json({ erro: 'Erro no Mercado Pago. Tente novamente mais tarde.' }, { status: 500 });
    } else {
      console.error(err);
      return NextResponse.json({ erro: 'Erro interno. Tente novamente mais tarde.' }, { status: 500 });
    }
  }
}