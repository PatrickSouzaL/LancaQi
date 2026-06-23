/**
 * Acesso aos dados do próprio analista (usuário comum).
 *
 * HOJE: filtra o mock pelo `usuario_id` do analista atual.
 * AMANHÃ: o isolamento é garantido pela RLS (`auth.uid() = usuario_id`) — o
 *         analista lê/insere apenas as próprias despesas (Visao_Analista.md §2).
 */
import { getDespesas } from "@/lib/data/despesas";
import { CONFIGURACOES_TAXAS_MOCK } from "@/lib/mock-data";
import type { ConfiguracoesTaxas, Despesa, Usuario } from "@/lib/types";

const ANALISTA_MOCK: Usuario = {
  id: "u-002",
  nome: "Bruno Carvalho",
  email: "bruno.carvalho@empresa.com",
  is_admin: false,
};

export async function getAnalistaAtual(): Promise<Usuario> {
  return ANALISTA_MOCK;
}

/** Tarifas vigentes — usadas só para a prévia visual no formulário. */
export async function getTaxasVigentes(): Promise<ConfiguracoesTaxas> {
  return CONFIGURACOES_TAXAS_MOCK;
}

export async function getDespesasDoAnalista(): Promise<Despesa[]> {
  const analista = await getAnalistaAtual();
  const todas = await getDespesas();
  return todas.filter((d) => d.usuario_id === analista.id);
}

export interface ResumoAnalista {
  totalQuinzena: number;
  totalPendente: number;
  totalPago: number;
  quantidade: number;
}

export async function getResumoAnalista(): Promise<ResumoAnalista> {
  const despesas = await getDespesasDoAnalista();
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
