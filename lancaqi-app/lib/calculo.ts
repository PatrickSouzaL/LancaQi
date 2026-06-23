/**
 * Cálculo da prévia de reembolso.
 *
 * ⚠️ Camada de SIMULAÇÃO apenas (UX). Conforme Visao_Analista.md §2, o valor
 * financeiro real NUNCA é confiado a partir do navegador — o back-end refaz o
 * cálculo a partir de `configuracoes_taxas`. Esta função existe só para o
 * feedback visual em tempo real no formulário.
 *
 * Regra (espelha a referência do schema):
 *   ESCRITORIO → valor_fixo_escritorio (km ignorado)
 *   MOTO       → km × taxa_km_moto
 *   CARRO      → km × taxa_km_carro
 */
import type { ConfiguracoesTaxas, TipoDespesa } from "@/lib/types";

export function calcularPrevia(
  tipo: TipoDespesa,
  quantidadeKm: number,
  taxas: ConfiguracoesTaxas,
): number {
  switch (tipo) {
    case "ESCRITORIO":
      return taxas.valor_fixo_escritorio;
    case "MOTO":
      return quantidadeKm * taxas.taxa_km_moto;
    case "CARRO":
      return quantidadeKm * taxas.taxa_km_carro;
  }
}

/** Tipos que exigem quilometragem (deslocamento até o cliente). */
export function exigeKm(tipo: TipoDespesa): boolean {
  return tipo !== "ESCRITORIO";
}
