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