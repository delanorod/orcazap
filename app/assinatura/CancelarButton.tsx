'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CancelarButton() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function cancelar() {
    if (!confirm('Cancelar a renovação automática? Você mantém o acesso até o fim do período pago.')) return;
    setCarregando(true);
    setErro(null);
    const res = await fetch('/api/assinatura/cancelar', { method: 'POST' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErro(json.erro ?? 'Não foi possível cancelar.');
      setCarregando(false);
      return;
    }
    router.refresh(); // pede ao servidor para recarregar os dados da página
    setCarregando(false);
  }

  return (
    <div className="space-y-2">
      <button onClick={cancelar} disabled={carregando} className="text-sm text-red-700 underline disabled:opacity-50">
        {carregando ? 'Cancelando…' : 'Cancelar assinatura'}
      </button>
      {erro && <p className="text-sm text-red-700">{erro}</p>}
    </div>
  );
}