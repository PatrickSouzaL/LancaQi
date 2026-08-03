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
    .order("data", { ascending: false })
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
  /** Data inicial do período (inclusiva, ISO `YYYY-MM-DD`). */
  dataInicio?: string;
  /** Data final do período (inclusiva, ISO `YYYY-MM-DD`). */
  dataFim?: string;
}

/**
 * Auditoria (relatório) com filtros server-side combináveis: analista (`ilike`
 * no nome), cliente (`cliente_id`), tipo e período (intervalo de `data`). Tudo
 * restrito pela RLS `is_admin()`. O filtro por analista exige o join `!inner`
 * para restringir as linhas-pai.
 */
export async function getDespesasParaAuditoria(
  filtros: AuditoriaFiltros = {},
): Promise<Despesa[]> {
  const supabase = await createClient();
  const busca = filtros.termo?.trim();

  let query = supabase
    .from("despesas")
    .select(busca ? DESPESA_SELECT_BUSCA : DESPESA_SELECT)
    .order("data", { ascending: false })
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
  if (filtros.dataInicio) {
    query = query.gte("data", filtros.dataInicio);
  }
  if (filtros.dataFim) {
    query = query.lte("data", filtros.dataFim);
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

/**
 * Últimas N movimentações (Dashboard). Ordena pela DATA da despesa (mais nova
 * primeiro) — não pela ordem de criação no banco — com `criado_em` como
 * desempate para lançamentos do mesmo dia.
 */
export async function getDespesasRecentes(limite = 5): Promise<Despesa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("despesas")
    .select(DESPESA_SELECT)
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (error) {
    console.error("getDespesasRecentes: falha ao ler despesas.", error.message);
    return [];
  }
  return (data as unknown as DespesaRow[]).map(mapDespesaFromDb);
}

/**
 * Fila do Fechamento Quinzenal — apenas despesas já **APROVADAS** pelo Admin
 * (o gate de aprovação precede o pagamento). Com `periodo`, restringe à quinzena
 * vigente (intervalo de `data`), para o pagamento não misturar aprovadas de
 * quinzenas anteriores. NEGADAS ficam de fora; PENDENTES aguardam decisão.
 *
 * Nome mantido por compatibilidade com os consumidores (fechamento, resumos e
 * exports); o que muda é o estado consumido (PENDENTE → APROVADO). Ver
 * `_docs/02-Architecture/feature_expense_approval.md`.
 */
export async function getDespesasPendentes(
  periodo?: Periodo,
): Promise<Despesa[]> {
  const supabase = await createClient();
  let query = supabase
    .from("despesas")
    .select(DESPESA_SELECT)
    .eq("status", "APROVADO")
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false });

  if (periodo) {
    query = query.gte("data", periodo.inicio).lte("data", periodo.fim);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "getDespesasPendentes: falha ao ler despesas.",
      error.message,
    );
    return [];
  }
  return (data as unknown as DespesaRow[]).map(mapDespesaFromDb);
}

/**
 * Fila de Aprovações do Admin — despesas ainda **PENDENTES**, aguardando a
 * decisão (aprovar/negar). Com `periodo`, restringe à quinzena informada. Ordena
 * pelas mais antigas primeiro (`criado_em ASC`) para o Admin decidir por ordem
 * de chegada. Restrito pela RLS `is_admin()`.
 */
export async function getDespesasParaAprovacao(
  periodo?: Periodo,
): Promise<Despesa[]> {
  const supabase = await createClient();
  let query = supabase
    .from("despesas")
    .select(DESPESA_SELECT)
    .eq("status", "PENDENTE")
    .order("data", { ascending: true })
    .order("criado_em", { ascending: true });

  if (periodo) {
    query = query.gte("data", periodo.inicio).lte("data", periodo.fim);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "getDespesasParaAprovacao: falha ao ler despesas.",
      error.message,
    );
    return [];
  }
  return (data as unknown as DespesaRow[]).map(mapDespesaFromDb);
}
