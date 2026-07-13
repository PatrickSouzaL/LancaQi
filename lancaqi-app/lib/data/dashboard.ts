/**
 * Agregações do Dashboard, escopadas pela QUINZENA atual.
 *
 * As somas rodam sobre as despesas do período (filtro de data server-side em
 * `getDespesas`), nunca sobre o histórico inteiro. As variações comparam a
 * quinzena atual com a anterior (não são mais hardcoded). "Analistas Ativos" é
 * derivado dos lançamentos do período (não há coluna `ativo`).
 *
 * Observação: idealmente estas agregações virariam SQL/RPC server-side; aqui
 * ainda somamos em JS sobre o conjunto já restrito pela RLS + período.
 */
import { getClientes } from "@/lib/data/clientes";
import { getDespesas, getDespesasPendentes } from "@/lib/data/despesas";
import { categoriaDe, TODOS_TIPOS } from "@/lib/despesas-tipos";
import { quinzenaAnterior, quinzenaAtual, type Periodo } from "@/lib/periodo";
import type {
  DashboardKpis,
  Despesa,
  DistribuicaoTipo,
  GastoDiario,
  ResumoFechamentoCliente,
  ResumoFechamentoUsuario,
} from "@/lib/types";

/** Variação percentual entre dois valores, arredondada a 1 casa. */
function variacaoPct(atual: number, anterior: number): number {
  if (anterior === 0) return atual === 0 ? 0 : 100;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

interface ResumoPeriodo {
  totalGasto: number;
  totalKm: number;
  pendentes: number;
  analistas: number;
}

function resumir(despesas: Despesa[]): ResumoPeriodo {
  return {
    totalGasto: despesas.reduce((s, d) => s + d.valor_calculado, 0),
    totalKm: despesas.reduce((s, d) => s + d.quantidade_km, 0),
    pendentes: despesas.filter((d) => d.status === "PENDENTE").length,
    analistas: new Set(despesas.map((d) => d.usuario_id)).size,
  };
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const atual = quinzenaAtual();
  const anterior = quinzenaAnterior(atual);

  // Duas leituras escopadas; a comparação dá as variações reais.
  const [despesasAtual, despesasAnterior] = await Promise.all([
    getDespesas(atual),
    getDespesas(anterior),
  ]);

  const a = resumir(despesasAtual);
  const b = resumir(despesasAnterior);

  return {
    totalGastoQuinzena: a.totalGasto,
    variacaoGastoPct: variacaoPct(a.totalGasto, b.totalGasto),
    totalKm: a.totalKm,
    variacaoKmPct: variacaoPct(a.totalKm, b.totalKm),
    despesasPendentes: a.pendentes,
    variacaoPendentes: a.pendentes - b.pendentes,
    analistasAtivos: a.analistas,
    variacaoAnalistas: a.analistas - b.analistas,
  };
}

/** Evolução diária por CATEGORIA (Deslocamento × Despesa) na quinzena. */
export async function getGastosPorDia(
  periodo: Periodo = quinzenaAtual(),
): Promise<GastoDiario[]> {
  const despesas = await getDespesas(periodo);

  const porDia = new Map<string, GastoDiario>();
  for (const d of despesas) {
    const atual = porDia.get(d.data) ?? {
      data: d.data,
      DESLOCAMENTO: 0,
      DESPESA: 0,
    };
    atual[categoriaDe(d.tipo)] += d.valor_calculado;
    porDia.set(d.data, atual);
  }

  return [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * Distribuição agregada por tipo na quinzena. Considera TODOS os tipos e omite
 * os sem valor no período (donut sem fatias vazias).
 */
export async function getDistribuicaoPorTipo(
  periodo: Periodo = quinzenaAtual(),
): Promise<DistribuicaoTipo[]> {
  const despesas = await getDespesas(periodo);
  return TODOS_TIPOS.map((tipo) => ({
    tipo,
    valor: despesas
      .filter((d) => d.tipo === tipo)
      .reduce((soma, d) => soma + d.valor_calculado, 0),
  })).filter((d) => d.valor > 0);
}

export async function getResumoFechamento(
  periodo?: Periodo,
): Promise<ResumoFechamentoUsuario[]> {
  const pendentes = await getDespesasPendentes(periodo);

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

/** Sentinela do agrupamento das pendentes sem cliente vinculado. */
export const SEM_CLIENTE_ID = "__sem_cliente__";

/**
 * Resumo das pendentes agrupadas por CLIENTE de destino. O nome vem do cadastro
 * de clientes; um `cliente_id` órfão cai em "Cliente removido". As despesas sem
 * cliente vinculado somam numa linha "Sem cliente" (`SEM_CLIENTE_ID`), sempre
 * ao final, para o resumo fechar o total do período.
 */
export async function getResumoFechamentoPorCliente(
  periodo?: Periodo,
): Promise<ResumoFechamentoCliente[]> {
  const [pendentes, clientes] = await Promise.all([
    getDespesasPendentes(periodo),
    getClientes(),
  ]);

  const nomePorId = new Map(clientes.map((c) => [c.id, c.nome]));

  const porCliente = new Map<string, ResumoFechamentoCliente>();
  for (const d of pendentes) {
    const chave = d.cliente_id ?? SEM_CLIENTE_ID;
    const atual = porCliente.get(chave) ?? {
      cliente_id: chave,
      cliente_nome: d.cliente_id
        ? (nomePorId.get(d.cliente_id) ?? "Cliente removido")
        : "Sem cliente",
      totalKm: 0,
      totalPendente: 0,
      quantidadeLancamentos: 0,
    };
    atual.totalKm += d.quantidade_km;
    atual.totalPendente += d.valor_calculado;
    atual.quantidadeLancamentos += 1;
    porCliente.set(chave, atual);
  }

  // Clientes por valor decrescente; "Sem cliente" fica sempre por último.
  return [...porCliente.values()].sort((a, b) => {
    if (a.cliente_id === SEM_CLIENTE_ID) return 1;
    if (b.cliente_id === SEM_CLIENTE_ID) return -1;
    return b.totalPendente - a.totalPendente;
  });
}
