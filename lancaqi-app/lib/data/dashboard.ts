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
import { SEM_CLIENTE_ID, isClienteInterno } from "@/lib/clientes-fechamento";
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
  StatusDespesa,
} from "@/lib/types";

/** Variação percentual entre dois valores, arredondada a 1 casa. */
function variacaoPct(atual: number, anterior: number): number {
  if (anterior === 0) return atual === 0 ? 0 : 100;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

interface ResumoPeriodo {
  totalGasto: number;
  totalKm: number;
  analistas: number;
}

/** Consolidação sobre um conjunto já escopado (período + status APROVADO). */
function resumir(despesas: Despesa[]): ResumoPeriodo {
  return {
    totalGasto: despesas.reduce((s, d) => s + d.valor_calculado, 0),
    totalKm: despesas.reduce((s, d) => s + d.quantidade_km, 0),
    analistas: new Set(despesas.map((d) => d.usuario_id)).size,
  };
}

/**
 * Estados que representam gasto consolidado: passaram pelo gate de aprovação.
 * `APROVADO` (aguardando pagamento) + `PAGO` (fechamento já quitado, típico de
 * quinzenas/meses passados). `PENDENTE`/`NEGADO` ficam de fora das somas.
 */
const STATUS_CONSOLIDADO: StatusDespesa[] = ["APROVADO", "PAGO"];

/**
 * KPIs do dashboard escopados a um `periodo`, com comparação contra o
 * `periodoAnterior` equivalente. Regra de negócio (ver `Proximos_Passos.md`):
 * gasto/KM/analistas consolidam as despesas que passaram pela aprovação
 * (`APROVADO` + `PAGO`); o card de pendências faz COUNT das `PENDENTE` (fila de
 * aprovação). Todos os filtros rodam server-side (`.in`/`.eq`).
 */
export async function getDashboardKpis(
  periodo: Periodo = quinzenaAtual(),
  periodoAnterior: Periodo = quinzenaAnterior(periodo),
): Promise<DashboardKpis> {
  const [aprovAtual, aprovAnterior, pendAtual, pendAnterior] =
    await Promise.all([
      getDespesas(periodo, STATUS_CONSOLIDADO),
      getDespesas(periodoAnterior, STATUS_CONSOLIDADO),
      getDespesas(periodo, "PENDENTE"),
      getDespesas(periodoAnterior, "PENDENTE"),
    ]);

  const a = resumir(aprovAtual);
  const b = resumir(aprovAnterior);

  return {
    totalGastoQuinzena: a.totalGasto,
    variacaoGastoPct: variacaoPct(a.totalGasto, b.totalGasto),
    totalKm: a.totalKm,
    variacaoKmPct: variacaoPct(a.totalKm, b.totalKm),
    despesasPendentes: pendAtual.length,
    variacaoPendentes: pendAtual.length - pendAnterior.length,
    analistasAtivos: a.analistas,
    variacaoAnalistas: a.analistas - b.analistas,
  };
}

/**
 * Evolução diária na quinzena: despesa agregada + deslocamento detalhado por
 * tipo (Escritório/Carro/Moto). A soma dos três tipos reconstrói o total de
 * deslocamento; o gráfico escolhe mostrar o detalhe ou o agregado por dia.
 */
export async function getGastosPorDia(
  periodo: Periodo = quinzenaAtual(),
): Promise<GastoDiario[]> {
  // Gasto consolidado (APROVADO + PAGO): não inclui o que ainda aguarda
  // decisão (PENDENTE) nem o recusado (NEGADO).
  const despesas = await getDespesas(periodo, STATUS_CONSOLIDADO);

  const porDia = new Map<string, GastoDiario>();
  for (const d of despesas) {
    const atual = porDia.get(d.data) ?? {
      data: d.data,
      ESCRITORIO: 0,
      CARRO: 0,
      MOTO: 0,
      DESPESA: 0,
    };
    if (categoriaDe(d.tipo) === "DESPESA") {
      atual.DESPESA += d.valor_calculado;
    } else {
      // Deslocamento: o tipo é sempre ESCRITORIO | CARRO | MOTO (chaves do dia).
      atual[d.tipo as "ESCRITORIO" | "CARRO" | "MOTO"] += d.valor_calculado;
    }
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
  // Mesma base consolidada (APROVADO + PAGO) do card "Total Gasto" e do diário.
  const despesas = await getDespesas(periodo, STATUS_CONSOLIDADO);
  return TODOS_TIPOS.map((tipo) => ({
    tipo,
    valor: despesas
      .filter((d) => d.tipo === tipo)
      .reduce((soma, d) => soma + d.valor_calculado, 0),
  })).filter((d) => d.valor > 0);
}

/**
 * Resumo por analista do período. Por padrão considera apenas as APROVADAS (fila
 * de pagamento, via `getDespesasPendentes`). Com `todosStatus`, agrega todos os
 * estados — usado no modo consulta da quinzena anterior, onde o interesse é
 * conferir o histórico, não pagar.
 */
export async function getResumoFechamento(
  periodo?: Periodo,
  opts: { todosStatus?: boolean } = {},
): Promise<ResumoFechamentoUsuario[]> {
  const despesas = opts.todosStatus
    ? await getDespesas(periodo)
    : await getDespesasPendentes(periodo);

  const porUsuario = new Map<string, ResumoFechamentoUsuario>();
  for (const d of despesas) {
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

// Constante e helpers puros vivem em módulo neutro (sem deps de servidor) para
// poderem ser importados também por componentes cliente. Reexporta-se daqui por
// compatibilidade com quem já importava de dashboard.
export { SEM_CLIENTE_ID, isClienteInterno };

/**
 * Resumo das pendentes agrupadas por CLIENTE de destino. O nome vem do cadastro
 * de clientes; um `cliente_id` órfão cai em "Cliente removido". As despesas sem
 * cliente vinculado somam numa linha "Sem cliente" (`SEM_CLIENTE_ID`), sempre
 * ao final, para o resumo fechar o total do período.
 */
export async function getResumoFechamentoPorCliente(
  periodo?: Periodo,
  opts: { todosStatus?: boolean } = {},
): Promise<ResumoFechamentoCliente[]> {
  const [despesas, clientes] = await Promise.all([
    opts.todosStatus ? getDespesas(periodo) : getDespesasPendentes(periodo),
    getClientes(),
  ]);

  const nomePorId = new Map(clientes.map((c) => [c.id, c.nome]));

  const porCliente = new Map<string, ResumoFechamentoCliente>();
  for (const d of despesas) {
    const chave = d.cliente_id ?? SEM_CLIENTE_ID;
    const cliente_nome = d.cliente_id
      ? (nomePorId.get(d.cliente_id) ?? "Cliente removido")
      : "Sem cliente";
    const atual = porCliente.get(chave) ?? {
      cliente_id: chave,
      cliente_nome,
      totalKm: 0,
      totalPendente: 0,
      quantidadeLancamentos: 0,
      interno: isClienteInterno(cliente_nome),
    };
    atual.totalKm += d.quantidade_km;
    atual.totalPendente += d.valor_calculado;
    atual.quantidadeLancamentos += 1;
    porCliente.set(chave, atual);
  }

  // Clientes por valor decrescente; "Sem cliente" fica sempre por último.
  // Clientes internos (ex.: "Casa", "Hype Tecnologia") vêm marcados com
  // `interno` para que a UI possa ocultá-los opcionalmente.
  return [...porCliente.values()].sort((a, b) => {
    if (a.cliente_id === SEM_CLIENTE_ID) return 1;
    if (b.cliente_id === SEM_CLIENTE_ID) return -1;
    return b.totalPendente - a.totalPendente;
  });
}
