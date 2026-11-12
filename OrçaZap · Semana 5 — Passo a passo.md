# OrçaZap · Semana 5 — Passo a passo

Nov 10, 2026 · @Delano Rodrigues

Sete dias para construir a cobrança do OrçaZap: em cada passo você digita o arquivo, entende por que ele existe e confere o resultado antes de seguir.

## Passo 0 — Preparar o projeto (30 min)

A ideia da semana: o **Mercado Pago cobra**, o **webhook avisa** o seu servidor, e o **banco guarda até quando o técnico pode usar o app**. O navegador nunca decide se alguém pagou.

1. Na raiz do projeto, instale as dependências:

```bash
npm i zod @supabase/supabase-js server-only
npm i -D vitest
```

2. No `package.json`, em `scripts`, acrescente `"test": "vitest run"`.
3. Crie `vitest.config.ts` na raiz (ensina o teste a entender o atalho `@/`):

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
```

4. Crie `.env.local` (este arquivo **não** vai para o Git) com estas chaves; os valores você preenche ao longo da semana:

```bash
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://SEU-TUNEL.exemplo.app
```

As chaves do Supabase (`NEXT_PUBLIC_SUPABASE_URL` e `..._ANON_KEY`) você já tem das semanas anteriores.

**Por que `SUPABASE_SERVICE_ROLE_KEY` sem `NEXT_PUBLIC_`?** No Next.js, variável com esse prefixo vai para o navegador, onde qualquer pessoa a lê. A *service role* ignora todas as regras de segurança do banco; ela só pode existir no servidor.

5. **Organize as páginas protegidas.** Crie a pasta `src/app/(app)/` e mova para dentro dela as pastas `clientes` e `orcamentos` (e as outras que exigem login). Parênteses no nome da pasta criam um *grupo de rotas*: a URL continua `/clientes`, mas o grupo ganha um `layout.tsx` só dele. Isso vai servir de portaria no Dia 5.

Ficam **fora** do grupo: `login`, `assinatura`, `q/[token]` (o cliente final aceita o orçamento sem ter conta) e `api/webhooks`.

**Confira:** `npm run dev` abre sem erros e `/clientes` continua funcionando.

**Se `/clientes` der 404 depois de mover**, confira nesta ordem:

1. **Reinicie o Next com o cache limpo.** Pare o `npm run dev`, apague a pasta `.next` e rode `npm run dev` de novo. O Next guarda o mapa de rotas e, depois de mover pastas, às vezes continua procurando a rota no lugar antigo. É a causa mais comum.
2. **Confira o caminho exato.** O arquivo precisa estar em `src/app/(app)/clientes/page.js` (ou `page.tsx`). Erros típicos: `(app)` criada fora de `app` (em `src/(app)`), uma pasta `src/app/app/clientes` (sem parênteses), ou o `page.js` ter ficado na pasta antiga enquanto só as subpastas foram movidas.
3. **Pasta duplicada.** Se ainda existir `src/app/clientes` além de `src/app/(app)/clientes`, apague a antiga.
4. **Nome do arquivo.** Tem que ser `page` (minúsculo, sem espaço). `Page.js` ou `index.js` não viram rota no App Router.

Se continuar, abra o terminal na raiz do projeto, rode `find src/app -name "page.*"` (no Windows PowerShell: `Get-ChildItem src/app -Recurse -Filter "page.*"`) e cole o resultado aqui.

## Dias 1–2 — Banco, planos e checkout Pix

### O que você vai aprender

- **Checkout Pro:** você cria no servidor uma *preferência* (o pedido de pagamento) e redireciona o cliente para a tela do Mercado Pago. O cartão e o Pix são digitados lá, nunca no seu site.
- **`external_reference`:** um texto seu que viaja junto com o pagamento e volta no webhook. É como você descobre *quem* pagou *qual plano*.
- **Back URLs:** para onde o cliente volta depois de pagar. São só experiência: voltar à página não prova que pagou. Quem libera o acesso é o webhook (Dia 4).
- **Pix é pagamento avulso**, sem renovação automática. Por isso vendemos "1 mês no Pix" (30 dias) e deixamos a recorrência para o cartão (Dia 3).

### Passo 1 — Tabelas no Supabase

Abra o **SQL Editor** do Supabase, cole e rode. Crie também o arquivo `supabase/migrations/20261110_assinaturas.sql` com o mesmo texto, para ficar no Git.

```sql
-- Uma assinatura por usuário (mesmo modelo user_id = auth.uid() do resto do projeto)
create table if not exists public.assinaturas (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  plano             text check (plano in ('basico', 'profissional', 'premium')),
  status            text not null default 'trial'
                    check (status in ('trial', 'pendente', 'ativa', 'pausada', 'cancelada', 'inadimplente')),
  metodo            text check (metodo in ('cartao', 'pix')),
  trial_ends_at     timestamptz not null default (now() + interval '7 days'),
  periodo_fim       timestamptz,
  mp_preapproval_id text unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Histórico de pagamentos aprovados; a chave primária também garante idempotência (Dia 4)
create table if not exists public.pagamentos_mp (
  mp_payment_id text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  plano         text not null,
  metodo        text not null,
  valor         numeric(10, 2) not null,
  created_at    timestamptz not null default now()
);
create index if not exists pagamentos_mp_user_idx on public.pagamentos_mp (user_id);

-- RLS: o usuário só LÊ a própria linha. Ninguém escreve pelo navegador.
alter table public.assinaturas enable row level security;
alter table public.pagamentos_mp enable row level security;

drop policy if exists "assinatura_select_own" on public.assinaturas;
create policy "assinatura_select_own" on public.assinaturas
  for select using (user_id = auth.uid());

drop policy if exists "pagamentos_select_own" on public.pagamentos_mp;
create policy "pagamentos_select_own" on public.pagamentos_mp
  for select using (user_id = auth.uid());

-- updated_at automático
create or replace function public.tg_assinaturas_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists assinaturas_updated_at on public.assinaturas;
create trigger assinaturas_updated_at
  before update on public.assinaturas
  for each row execute function public.tg_assinaturas_updated_at();
```

**Leia com calma:** não existe policy de `insert` nem de `update`. Com RLS ligado, isso significa "proibido". Só o servidor, usando a *service role*, grava. Assim ninguém se dá o plano Premium pelo navegador.

Ainda faltam duas peças de SQL (o trial automático, Dia 6, e a função que registra pagamento, Dia 4). Você as rodará nesses dias.

**Confira:** em *Table Editor* aparecem `assinaturas` e `pagamentos_mp`.

### Passo 2 — Os planos num único lugar

Crie `src/lib/planos.ts`. Preço, limite e recursos de cada plano ficam aqui; o resto do código só consulta este arquivo.

```ts
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
```

`Record<PlanoId, Plano>` é TypeScript pedindo: "tem que existir uma entrada para *cada* id". Se você esquecer um, o editor avisa. Se você ainda usa `.js`, apague os tipos e deixe só os objetos.

### Passo 3 — Cliente do Supabase com poderes de servidor

Crie `src/lib/supabase/admin.ts`:

```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

/** Ignora RLS. Use SOMENTE no servidor (webhook e rotas de API). */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
```

`import 'server-only'` é um cinto de segurança: se alguém importar este arquivo por engano num componente do navegador, o *build* quebra em vez de vazar a chave.

### Passo 4 — Tipos e a "etiqueta" do pagamento

Crie `src/lib/assinatura.ts`. Hoje ele terá só os tipos e a `external_reference`; as regras de acesso entram no Dia 5.

```ts
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
```

`lerReferencia` desconfia de tudo: se o texto vier fora do formato, devolve `null`. O webhook é uma porta pública, e qualquer um pode mandar lixo para ela.

### Passo 5 — Conversar com o Mercado Pago

Primeiro, crie sua aplicação em **mercadopago.com.br/developers → Suas integrações**. Em *Credenciais de teste*, copie o **Access Token** para `MP_ACCESS_TOKEN` no `.env.local`.

Depois crie `src/lib/mercadopago/client.ts`. Uma função `mp()` cuida do que se repete (token, JSON, erros) e cada chamada fica com uma linha:

```ts
import 'server-only';
import { randomUUID } from 'node:crypto';

const API = 'https://api.mercadopago.com';

export class MpError extends Error {
  constructor(public status: number, public corpo: unknown, caminho: string) {
    super(`Mercado Pago ${status} em ${caminho}`);
  }
}

async function mp<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('MP_ACCESS_TOKEN não configurado');

  const metodo = (init.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  // Idempotência: se a rede falhar e houver retry, o MP não cria duas cobranças
  if (metodo === 'POST') headers['X-Idempotency-Key'] = randomUUID();

  const res = await fetch(`${API}${caminho}`, { ...init, headers, cache: 'no-store' });
  const texto = await res.text();
  const corpo = texto ? JSON.parse(texto) : null;
  if (!res.ok) throw new MpError(res.status, corpo, caminho);
  return corpo as T;
}

export type Preferencia = { id: string; init_point: string };

/** Checkout Pro: pagamento avulso (usado para o Pix de 1 mês). */
export function criarPreferencia(body: Record<string, unknown>) {
  return mp<Preferencia>('/checkout/preferences', { method: 'POST', body: JSON.stringify(body) });
}
```

`cache: 'no-store'` é importante no Next.js: sem ele o `fetch` pode devolver uma resposta guardada em cache, o que seria desastroso numa API de pagamento.

### Passo 6 — Ler a assinatura do usuário logado

Crie `src/lib/acesso.ts`. Por enquanto só busca a linha; no Dia 5 ele ganha os "porteiros".

```ts
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
```

Ajuste o `import` de `createClient` para o arquivo onde você já criou o cliente de servidor do Supabase na Semana 1, se o caminho for outro.

### Passo 7 — A rota que cria o pagamento Pix

Crie `src/app/api/assinatura/checkout/route.ts`. Uma *Route Handler* é um endpoint: o navegador chama com `fetch`, ela responde JSON.

```ts
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
          title: `OrçaZap ${plano.nome} · 1 mês`,
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
```

O ponto mais importante: o **preço** sai de `PLANOS[planoId]`, no servidor. Se o preço viesse do navegador, qualquer pessoa pagaria R$ 1 pelo plano Premium.

### Passo 8 — A tela de planos

Crie `src/app/assinatura/PlanosClient.tsx`. O `'use client'` na primeira linha avisa o Next.js que este componente roda no navegador (precisa de `useState` e de cliques):

```tsx
'use client';

import { useState } from 'react';

type PlanoView = { id: string; nome: string; preco: string; descricao: string };

export default function PlanosClient({ planos, planoAtual }: { planos: PlanoView[]; planoAtual: string | null }) {
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function iniciar(plano: string, metodo: 'cartao' | 'pix') {
    setErro(null);
    setCarregando(`${plano}:${metodo}`);
    try {
      const res = await fetch('/api/assinatura/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano, metodo }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.erro ?? 'Falha ao iniciar o pagamento.');
      window.location.href = json.url; // vai para a tela do Mercado Pago
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado.');
      setCarregando(null);
    }
  }

  return (
    <section className="space-y-4">
      {erro && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {planos.map((p) => (
          <article key={p.id} className={`flex flex-col gap-3 rounded-lg border p-4 ${p.id === planoAtual ? 'border-green-600 ring-1 ring-green-600' : 'border-neutral-200'}`}>
            <h2 className="text-lg font-medium">{p.nome}</h2>
            <p className="text-2xl font-semibold">{p.preco}<span className="text-sm font-normal text-neutral-500"> /mês</span></p>
            <p className="flex-1 text-sm text-neutral-600">{p.descricao}</p>
            <button onClick={() => iniciar(p.id, 'cartao')} disabled={carregando !== null} className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50">
              {carregando === `${p.id}:cartao` ? 'Abrindo…' : 'Assinar no cartão'}
            </button>
            <button onClick={() => iniciar(p.id, 'pix')} disabled={carregando !== null} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50">
              {carregando === `${p.id}:pix` ? 'Abrindo…' : 'Pagar 1 mês no Pix'}
            </button>
          </article>
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        Cartão: renovação automática todo mês, cancele quando quiser. Pix: pagamento avulso de 30 dias, sem renovação automática.
      </p>
    </section>
  );
}
```

E a página, `src/app/assinatura/page.tsx` (um *Server Component*: roda no servidor, lê o banco direto):

```tsx
import { obterAssinatura } from '@/lib/acesso';
import { LISTA_PLANOS, formatarPreco } from '@/lib/planos';
import PlanosClient from './PlanosClient';

export default async function AssinaturaPage() {
  await obterAssinatura(); // garante login

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Assinatura</h1>
      <PlanosClient
        planos={LISTA_PLANOS.map((p) => ({
          id: p.id, nome: p.nome, preco: formatarPreco(p.precoMensal), descricao: p.descricao,
        }))}
        planoAtual={null}
      />
    </main>
  );
}
```

O motivo da divisão: a página (servidor) busca dados e não expõe segredos; o componente (navegador) cuida de clique e estado. Os dois conversam por *props*.

**Confira:** logado, abra `/assinatura`, clique em **Pagar 1 mês no Pix** e você deve cair numa tela do Mercado Pago **só com Pix**. Se aparecer "Não foi possível iniciar", olhe o terminal: o `console.error` mostra a resposta do MP (token errado costuma ser 401). Ainda não vai liberar acesso ao pagar: isso é o webhook, no Dia 4.
