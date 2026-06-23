/**
 * Acesso às configurações de taxas (tabela single-row `configuracoes_taxas`).
 *
 * HOJE: retorna `CONFIGURACOES_TAXAS_MOCK` (valores oficiais do seed).
 * AMANHÃ: `SELECT ... LIMIT 1`; o salvamento é sempre `UPDATE` na linha
 *         existente (nunca INSERT — não há policy de INSERT), validado por
 *         Zod e `is_admin()` numa Server Action.
 */
import { CONFIGURACOES_TAXAS_MOCK } from "@/lib/mock-data";
import type { ConfiguracoesTaxas } from "@/lib/types";

export async function getConfiguracoesTaxas(): Promise<ConfiguracoesTaxas> {
  return CONFIGURACOES_TAXAS_MOCK;
}
