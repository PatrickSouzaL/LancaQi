import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Route,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatarBRL, formatarKm } from "@/lib/format";
import type { DashboardKpis } from "@/lib/types";

interface ItemKpi {
  titulo: string;
  valor: string;
  variacao: string;
  /** `true` quando a variação representa um resultado positivo para o negócio. */
  positiva: boolean;
  icone: LucideIcon;
}

function VariacaoBadge({
  variacao,
  positiva,
}: {
  variacao: string;
  positiva: boolean;
}) {
  const Icone = positiva ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        positiva
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700",
      )}
    >
      <Icone className="size-3" />
      {variacao}
    </span>
  );
}

export function SummaryCards({ kpis }: { kpis: DashboardKpis }) {
  // Semântica de "bom/ruim" conforme Visao_Administrador.md → Cards de Indicadores.
  const itens: ItemKpi[] = [
    {
      titulo: "Total Gasto (Quinzena)",
      valor: formatarBRL(kpis.totalGastoQuinzena),
      variacao: `+${kpis.variacaoGastoPct.toLocaleString("pt-BR")}%`,
      positiva: false, // alta de gasto = ruim
      icone: Wallet,
    },
    {
      titulo: "Total de KM Rodado",
      valor: formatarKm(kpis.totalKm),
      variacao: `+${kpis.variacaoKmPct.toLocaleString("pt-BR")}%`,
      positiva: true,
      icone: Route,
    },
    {
      titulo: "Despesas Pendentes",
      valor: String(kpis.despesasPendentes),
      variacao: `${kpis.variacaoPendentes}`,
      positiva: kpis.variacaoPendentes <= 0, // queda = bom
      icone: Clock,
    },
    {
      titulo: "Analistas Ativos",
      valor: String(kpis.analistasAtivos),
      variacao: `+${kpis.variacaoAnalistas}`,
      positiva: true,
      icone: Users,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((item) => {
        const Icone = item.icone;
        return (
          <Card key={item.titulo} className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icone className="size-4" />
                {item.titulo}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums">
                {item.valor}
              </span>
              <VariacaoBadge
                variacao={item.variacao}
                positiva={item.positiva}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
