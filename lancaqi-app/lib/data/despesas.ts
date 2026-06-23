/**
 * Acesso a despesas.
 *
 * HOJE: retorna `DESPESAS_MOCK`.
 * AMANHÃ: substituir o corpo por queries Supabase em Server Components
 *         (admin lê tudo via RLS `is_admin()`), mantendo estas assinaturas.
 *         O filtro por nome deve ir como `ilike` server-side, e não filtrar
 *         um array já carregado no cliente.
 *
 * Funções `async` de propósito: a fronteira já é assíncrona para o futuro
 * `await supabase...`, então as telas não mudam quando o banco entrar.
 */
import { DESPESAS_MOCK } from "@/lib/mock-data";
import type { Despesa } from "@/lib/types";

function ordenarPorRecente(a: Despesa, b: Despesa): number {
  // Mais recente primeiro (data + hora). Alvo: ORDER BY criado_em DESC.
  return `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`);
}

export async function getDespesas(): Promise<Despesa[]> {
  return [...DESPESAS_MOCK].sort(ordenarPorRecente);
}

/** Últimas N movimentações para o Dashboard. Alvo: ORDER BY criado_em DESC LIMIT N. */
export async function getDespesasRecentes(limite = 5): Promise<Despesa[]> {
  const despesas = await getDespesas();
  return despesas.slice(0, limite);
}

/** Fila do Fechamento Quinzenal. Alvo: WHERE status = 'PENDENTE'. */
export async function getDespesasPendentes(): Promise<Despesa[]> {
  const despesas = await getDespesas();
  return despesas.filter((d) => d.status === "PENDENTE");
}
