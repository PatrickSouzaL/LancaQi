import "server-only";

import {
  DESPESA_SELECT,
  DESPESA_SELECT_BUSCA,
  mapDespesaFromDb,
  type DespesaRow,
} from "@/lib/data/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Periodo } from "@/lib/periodo";
import type { Despesa, TipoDespesa } from "@/lib/types";

/**
 * Leitura de despesas via Supabase. O acesso é controlado pela RLS:
 * admin (`is_admin()`) enxerga tudo; analista, apenas as próprias
 * (`auth.uid() = usuario_id`). Ordenado por `criado_em DESC`.
 *
 * O filtro opcional de `periodo` restringe por intervalo de datas (quinzena),
 * aplicado server-side sobre a coluna `data` (DATE).
 */
export async function getDespesas(periodo?: Periodo): Promise<Despesa[]> {
  const supabase = await createClient();
  let query = supabase
    .from("despesas")
    .select(DESPESA_SELECT)
    .order("criado_em", { ascending: false });

  if (periodo) {
    query = query.gte("data", periodo.inicio).lte("data", periodo.fim);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getDespesas: falha ao ler despesas.", error.message);
    return [];
  }
  return (data as unknown as DespesaRow[]).map(mapDespesaFromDb);
}

export interface AuditoriaFiltros {
  /** Busca por nome do analista (`ilike`, case-insensitive). */
  termo?: string;
  /** Filtra por cliente (FK `cliente_id`). */
  clienteId?: string;
  /** Filtra por tipo de deslocamento. */
  tipo?: TipoDespesa;
}

/**
 * Auditoria (relatório) com filtros server-side combináveis: analista (`ilike`
 * no nome), cliente (`cliente_id`) e tipo. Tudo restrito pela RLS `is_admin()`.
 * O filtro por analista exige o join `!inner` para restringir as linhas-pai.
 */
export async function getDespesasParaAuditoria(
  filtros: AuditoriaFiltros = {},
): Promise<Despesa[]> {
  const supabase = await createClient();
  const busca = filtros.termo?.trim();

  let query = supabase
    .from("despesas")
    .select(busca ? DESPESA_SELECT_BUSCA : DESPESA_SELECT)
    .order("criado_em", { ascending: false });

  if (busca) {
    // `%` e `,` quebrariam o filtro do PostgREST — neutraliza-os.
    query = query.ilike("usuarios.nome", `%${busca.replace(/[%,]/g, " ")}%`);
  }
  if (filtros.clienteId) {
    query = query.eq("cliente_id", filtros.clienteId);
  }
  if (filtros.tipo) {
    query = query.eq("tipo", filtros.tipo);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "getDespesasParaAuditoria: falha ao buscar despesas.",
      error.message,
    );
    return [];
  }
  return (data as unknown as DespesaRow[]).map(mapDespesaFromDb);
}

/** Últimas N movimentações (Dashboard). */
export async function getDespesasRecentes(limite = 5): Promise<Despesa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("despesas")
    .select(DESPESA_SELECT)
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (error) {
    console.error("getDespesasRecentes: falha ao ler despesas.", error.message);
    return [];
  }
  return (data as unknown as DespesaRow[]).map(mapDespesaFromDb);
}

/** Fila do Fechamento Quinzenal (apenas PENDENTE). */
export async function getDespesasPendentes(): Promise<Despesa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("despesas")
    .select(DESPESA_SELECT)
    .eq("status", "PENDENTE")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(
      "getDespesasPendentes: falha ao ler despesas.",
      error.message,
    );
    return [];
  }
  return (data as unknown as DespesaRow[]).map(mapDespesaFromDb);
}
