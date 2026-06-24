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
  sobe,
}: {
  variacao: string;
  /** `true` quando a variação é boa para o negócio (define a cor). */
  positiva: boolean;
  /** Direção numérica da variação (define a seta), independente de bom/ruim. */
  sobe: boolean;
}) {
  const Icone = sobe ? ArrowUpRight : ArrowDownRight;
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

/** "+12,4%" / "-3,1%" — sinal explícito, separador pt-BR, 1 casa. */
function pct(valor: number): string {
  const sinal = valor > 0 ? "+" : "";
  return `${sinal}${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/** "+2" / "-1" / "0" — variação absoluta com sinal. */
function inteiro(valor: number): string {
  return valor > 0 ? `+${valor}` : String(valor);
}

interface ItemKpiCompleto extends ItemKpi {
  sobe: boolean;
}

export function SummaryCards({ kpis }: { kpis: DashboardKpis }) {
  // Semântica de "bom/ruim" conforme Visao_Administrador.md → Cards de Indicadores.
  // `positiva` = bom para o negócio (cor); `sobe` = direção numérica (seta).
  const itens: ItemKpiCompleto[] = [
    {
      titulo: "Total Gasto (Quinzena)",
      valor: formatarBRL(kpis.totalGastoQuinzena),
      variacao: pct(kpis.variacaoGastoPct),
      positiva: kpis.variacaoGastoPct <= 0, // alta de gasto = ruim
      sobe: kpis.variacaoGastoPct >= 0,
      icone: Wallet,
    },
    {
      titulo: "Total de KM Rodado",
      valor: formatarKm(kpis.totalKm),
      variacao: pct(kpis.variacaoKmPct),
      positiva: kpis.variacaoKmPct >= 0,
      sobe: kpis.variacaoKmPct >= 0,
      icone: Route,
    },
    {
      titulo: "Despesas Pendentes",
      valor: String(kpis.despesasPendentes),
      variacao: inteiro(kpis.variacaoPendentes),
      positiva: kpis.variacaoPendentes <= 0, // queda = bom
      sobe: kpis.variacaoPendentes >= 0,
      icone: Clock,
    },
    {
      titulo: "Analistas Ativos",
      valor: String(kpis.analistasAtivos),
      variacao: inteiro(kpis.variacaoAnalistas),
      positiva: kpis.variacaoAnalistas >= 0,
      sobe: kpis.variacaoAnalistas >= 0,
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
                sobe={item.sobe}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
