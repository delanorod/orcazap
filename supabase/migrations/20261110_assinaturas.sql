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