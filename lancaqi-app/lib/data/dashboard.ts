/**
 * Agregações do Dashboard.
 *
 * HOJE: deriva os KPIs e o resumo de fechamento a partir do mock.
 * AMANHÃ: estas agregações DEVEM rodar server-side (SQL/RPC sobre `despesas`),
 *         nunca somadas no cliente. "Analistas Ativos" é derivado dos
 *         lançamentos do período (não há coluna `ativo`).
 */
import { getDespesas, getDespesasPendentes } from "@/lib/data/despesas";
import type {
  DashboardKpis,
  DistribuicaoTipo,
  GastoDiario,
  ResumoFechamentoUsuario,
  TipoDespesa,
} from "@/lib/types";

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const despesas = await getDespesas();

  const totalGastoQuinzena = despesas.reduce(
    (soma, d) => soma + d.valor_calculado,
    0,
  );
  const totalKm = despesas.reduce((soma, d) => soma + d.quantidade_km, 0);
  const despesasPendentes = despesas.filter(
    (d) => d.status === "PENDENTE",
  ).length;
  const analistasAtivos = new Set(despesas.map((d) => d.usuario_id)).size;

  // Variações ilustrativas (no alvo: comparação com a quinzena anterior).
  return {
    totalGastoQuinzena,
    variacaoGastoPct: 12.4,
    totalKm,
    variacaoKmPct: 8.1,
    despesasPendentes,
    variacaoPendentes: -3,
    analistasAtivos,
    variacaoAnalistas: 4,
  };
}

/** Evolução diária por tipo. Alvo: GROUP BY data, tipo somando valor_calculado. */
export async function getGastosPorDia(): Promise<GastoDiario[]> {
  const despesas = await getDespesas();

  const porDia = new Map<string, GastoDiario>();
  for (const d of despesas) {
    const atual = porDia.get(d.data) ?? {
      data: d.data,
      ESCRITORIO: 0,
      CARRO: 0,
      MOTO: 0,
    };
    atual[d.tipo] += d.valor_calculado;
    porDia.set(d.data, atual);
  }

  return [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data));
}

/** Distribuição agregada por tipo. Alvo: GROUP BY tipo somando valor_calculado. */
export async function getDistribuicaoPorTipo(): Promise<DistribuicaoTipo[]> {
  const despesas = await getDespesas();
  const tipos: TipoDespesa[] = ["ESCRITORIO", "CARRO", "MOTO"];
  return tipos.map((tipo) => ({
    tipo,
    valor: despesas
      .filter((d) => d.tipo === tipo)
      .reduce((soma, d) => soma + d.valor_calculado, 0),
  }));
}

export async function getResumoFechamento(): Promise<
  ResumoFechamentoUsuario[]
> {
  const pendentes = await getDespesasPendentes();

  const porUsuario = new Map<string, ResumoFechamentoUsuario>();
  for (const d of pendentes) {
    const atual = porUsuario.get(d.usuario_id) ?? {
      usuario_id: d.usuario_id,
      usuario_nome: d.usuario_nome,
      totalKm: 0,
      totalPendente: 0,
      quantidadeLancamentos: 0,
    };
    atual.totalKm += d.quantidade_km;
    atual.totalPendente += d.valor_calculado;
    atual.quantidadeLancamentos += 1;
    porUsuario.set(d.usuario_id, atual);
  }

  return [...porUsuario.values()].sort(
    (a, b) => b.totalPendente - a.totalPendente,
  );
}
