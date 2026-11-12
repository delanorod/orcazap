import 'server-only';
import { randomUUID } from 'node:crypto';

const API = 'https://api.mercadopago.com';

export class MpError extends Error {
  constructor(public status: number, public corpo: unknown, caminho: string) {
    super(`Mercado Pago${status} em${caminho}`);
  }
}

async function mp<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('MP_ACCESS_TOKEN não configurado');

  const metodo = (init.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer${token}`,
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