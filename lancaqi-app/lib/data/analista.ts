import "server-only";

import { getUsuarioPerfil } from "@/lib/data/auth";
import { getConfiguracoesTaxas } from "@/lib/data/configuracoes";
import {
  DESPESA_SELECT,
  mapDespesaFromDb,
  type DespesaRow,
} from "@/lib/data/mappers";
import { createClient } from "@/lib/supabase/server";
import { quinzenaAtual, type Periodo } from "@/lib/periodo";
import type {
  ConfiguracoesTaxas,
  Despesa,
  GastoDiarioTotal,
} from "@/lib/types";

/**
 * Dados do próprio analista. O isolamento é garantido pela RLS
 * (`auth.uid() = usuario_id`); adicionalmente filtramos por `usuario_id`
 * explícito como defesa em profundidade (mesmo um admin vê só o próprio aqui).
 */

/** Tarifas vigentes — usadas apenas para a prévia visual no formulário. */
export async function getTaxasVigentes(): Promise<ConfiguracoesTaxas> {
  return getConfiguracoesTaxas();
}

/** Despesas do analista; sem `periodo` retorna o histórico completo. */
export async function getDespesasDoAnalista(
  periodo?: Periodo,
): Promise<Despesa[]> {
  const perfil = await getUsuarioPerfil();
  const supabase = await createClient();

  let query = supabase
    .from("despesas")
    .select(DESPESA_SELECT)
    .eq("usuario_id", perfil.id)
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false });

  if (periodo) {
    query = query.gte("data", periodo.inicio).lte("data", periodo.fim);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "getDespesasDoAnalista: falha ao ler despesas.",
      error.message,
    );
    return [];
  }
  return (data as unknown as DespesaRow[]).map(mapDespesaFromDb);
}

/**
 * Total por dia do analista no período — uma entrada por dia COM lançamento
 * (dias sem despesa simplesmente não aparecem). Ordenado por data crescente
 * para o eixo X do gráfico. As somas rodam sobre o conjunto já restrito pela
 * RLS + período.
 */
export async function getGastosDiariosAnalista(
  periodo: Periodo,
): Promise<GastoDiarioTotal[]> {
  const despesas = await getDespesasDoAnalista(periodo);

  const porDia = new Map<string, number>();
  for (const d of despesas) {
    porDia.set(d.data, (porDia.get(d.data) ?? 0) + d.valor_calculado);
  }

  return [...porDia.entries()]
    .map(([data, total]) => ({ data, total }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

/** Total já reembolsado (status PAGO) do analista no período. */
export async function getTotalPagoAnalista(periodo: Periodo): Promise<number> {
  const despesas = await getDespesasDoAnalista(periodo);
  return despesas
    .filter((d) => d.status === "PAGO")
    .reduce((soma, d) => soma + d.valor_calculado, 0);
}

export interface ResumoAnalista {
  totalQuinzena: number;
  totalPendente: number;
  totalPago: number;
  quantidade: number;
}

export async function getResumoAnalista(): Promise<ResumoAnalista> {
  // O resumo do dashboard é da quinzena atual; o histórico mostra tudo.
  const despesas = await getDespesasDoAnalista(quinzenaAtual());
  return despesas.reduce<ResumoAnalista>(
    (acc, d) => {
      acc.totalQuinzena += d.valor_calculado;
      acc.quantidade += 1;
      if (d.status === "PENDENTE") acc.totalPendente += d.valor_calculado;
      else acc.totalPago += d.valor_calculado;
      return acc;
    },
    { totalQuinzena: 0, totalPendente: 0, totalPago: 0, quantidade: 0 },
  );
}
