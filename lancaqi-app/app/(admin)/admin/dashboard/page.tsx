import { PageHeading } from "@/components/PageHeading";
import { ExpenseCharts } from "@/components/dashboard/ExpenseCharts";
import { RecentMovements } from "@/components/dashboard/RecentMovements";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { getDespesasRecentes } from "@/lib/data/despesas";
import {
  getDashboardKpis,
  getDistribuicaoPorTipo,
  getGastosPorDia,
} from "@/lib/data/dashboard";
import { quinzenaAtual } from "@/lib/periodo";

export default async function DashboardPage() {
  // Período de referência compartilhado por todas as agregações da página.
  const periodo = quinzenaAtual();

  // Agregações server-side (nunca somadas no cliente); o cliente recebe só
  // os dados já prontos para os gráficos.
  const [kpis, gastosPorDia, distribuicao, recentes] = await Promise.all([
    getDashboardKpis(),
    getGastosPorDia(periodo),
    getDistribuicaoPorTipo(periodo),
    getDespesasRecentes(5),
  ]);

  return (
    <>
      <PageHeading
        titulo="Dashboard"
        descricao={`Visão geral das despesas de deslocamento — quinzena de ${periodo.rotulo}.`}
      />
      <SummaryCards kpis={kpis} />
      <ExpenseCharts gastosPorDia={gastosPorDia} distribuicao={distribuicao} />
      <RecentMovements despesas={recentes} />
    </>
  );
}
