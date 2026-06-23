import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ConfiguracoesTaxas } from "@/lib/types";

interface ConfiguracoesTaxasRow {
  id: number;
  valor_fixo_escritorio: number | string;
  taxa_km_moto: number | string;
  taxa_km_carro: number | string;
}

// Defaults do seed do schema (30 / 0,50 / 1,00) — fallback resiliente.
const FALLBACK: ConfiguracoesTaxas = {
  id: 0,
  valor_fixo_escritorio: 30,
  taxa_km_moto: 0.5,
  taxa_km_carro: 1,
};

/**
 * Lê a linha única de `configuracoes_taxas` (RLS: leitura para autenticados).
 * Decimais podem vir como string do PostgREST → normaliza para number.
 */
export async function getConfiguracoesTaxas(): Promise<ConfiguracoesTaxas> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("configuracoes_taxas")
    .select("id, valor_fixo_escritorio, taxa_km_moto, taxa_km_carro")
    .limit(1)
    .single();

  if (error || !data) {
    console.error(
      "getConfiguracoesTaxas: falha ao ler taxas; usando fallback do seed.",
      error?.message,
    );
    return FALLBACK;
  }

  const row = data as ConfiguracoesTaxasRow;
  return {
    id: row.id,
    valor_fixo_escritorio: Number(row.valor_fixo_escritorio),
    taxa_km_moto: Number(row.taxa_km_moto),
    taxa_km_carro: Number(row.taxa_km_carro),
  };
}
