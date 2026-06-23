import "server-only";

import {
  DESPESA_SELECT,
  mapDespesaFromDb,
  type DespesaRow,
} from "@/lib/data/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Despesa } from "@/lib/types";

/**
 * Leitura de despesas via Supabase. O acesso é controlado pela RLS:
 * admin (`is_admin()`) enxerga tudo; analista, apenas as próprias
 * (`auth.uid() = usuario_id`). Ordenado por `criado_em DESC`.
 */
export async function getDespesas(): Promise<Despesa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("despesas")
    .select(DESPESA_SELECT)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("getDespesas: falha ao ler despesas.", error.message);
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
