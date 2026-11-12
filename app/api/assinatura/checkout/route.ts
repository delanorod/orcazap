import { NextResponse } from 'next/server';
import { z } from 'zod';
import { obterAssinatura } from '@/lib/acesso';
import { montarReferencia } from '@/lib/assinatura';
import { PLANOS } from '@/lib/planos';
import { MpError, criarPreferencia } from '@/lib/mercadopago/client';

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

  const { user } = await obterAssinatura();
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

    // O cartão entra no Dia 3
    return NextResponse.json({ erro: 'Cartão ainda não disponível.' }, { status: 501 });
  } catch (e) {
    console.error('[checkout]', e instanceof MpError ? { status: e.status, corpo: e.corpo } : e);
    return NextResponse.json({ erro: 'Não foi possível iniciar o pagamento. Tente novamente.' }, { status: 502 });
  }
}