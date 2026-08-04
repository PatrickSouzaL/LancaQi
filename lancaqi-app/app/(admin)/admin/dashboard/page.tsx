import { PageHeading } from "@/components/PageHeading";
import { DashboardPeriodFilter } from "@/components/dashboard/DashboardPeriodFilter";
import { ExpenseCharts } from "@/components/dashboard/ExpenseCharts";
import { RecentMovements } from "@/components/dashboard/RecentMovements";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { requireAdmin } from "@/lib/data/auth";
import { getDespesasRecentes } from "@/lib/data/despesas";
import {
  getDashboardKpis,
  getDistribuicaoPorTipo,
  getGastosPorDia,
} from "@/lib/data/dashboard";
import { resolverPeriodoDashboard } from "@/lib/periodo";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  // RBAC (defesa em profundidade): o layout já exige admin, mas os totais
  // consolidados são reforçados aqui antes de qualquer agregação. A RLS
  // (`is_admin()`) é a barreira final no banco.
  await requireAdmin();

  // Período resolvido/validado (Zod) a partir da URL. Input inválido cai em
  // fallback seguro (quinzena atual) — nenhuma data crua chega às consultas.
  const params = await searchParams;
  const { chave, periodo, periodoAnterior, from, to } =
    resolverPeriodoDashboard(params);

  // Agregações server-side (nunca somadas no cliente); o cliente recebe só
  // os dados já prontos para os gráficos. Gasto/gráficos = APROVADO; o card
  // de pendências conta as PENDENTE (ver getDashboardKpis).
  const [kpis, gastosPorDia, distribuicao, recentes] = await Promise.all([
    getDashboardKpis(periodo, periodoAnterior),
    getGastosPorDia(periodo),
    getDistribuicaoPorTipo(periodo),
    getDespesasRecentes(5),
  ]);

  return (
    <>
      {/* Filtro temporal à direita, na mesma altura do título (slot `acao` do
          PageHeading: justify-between + items-center). */}
      <PageHeading
        titulo="Dashboard"
        descricao={`Visão geral das despesas de deslocamento — ${periodo.rotulo}.`}
        acao={<DashboardPeriodFilter chave={chave} from={from} to={to} />}
      />
      <SummaryCards kpis={kpis} />
      <ExpenseCharts gastosPorDia={gastosPorDia} distribuicao={distribuicao} />
      <RecentMovements despesas={recentes} />
    </>
  );
}
