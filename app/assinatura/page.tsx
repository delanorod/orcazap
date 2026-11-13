import { obterAssinatura } from '@/lib/acesso';
import { LISTA_PLANOS, formatarPreco } from '@/lib/planos';
import PlanosClient from './PlanosClient';
import CancelarButton from './CancelarButton';

export default async function AssinaturaPage() {
 const { assinatura } = await obterAssinatura();

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Assinatura</h1>
      <PlanosClient
        planos={LISTA_PLANOS.map((p) => ({
          id: p.id, nome: p.nome, preco: formatarPreco(p.precoMensal), descricao: p.descricao,
        }))}
        planoAtual={null}
      />
      {assinatura.mp_preapproval_id && assinatura.status !== 'cancelada' && <CancelarButton />}
    </main>
  );
}