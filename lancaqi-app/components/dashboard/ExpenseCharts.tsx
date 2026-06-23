"use client";

// Client por conta do Recharts (usa hooks/medições no browser).
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  XAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatarBRL } from "@/lib/format";
import type { DistribuicaoTipo, GastoDiario } from "@/lib/types";

// Paleta harmonizada (estilo Vercel/Linear): neutro para o valor fixo de
// Escritório e tons frios coesos para os deslocamentos.
// Escritório = slate-300, Carro = indigo-500, Moto = sky-400.
const chartConfig = {
  ESCRITORIO: { label: "Escritório", color: "#cbd5e1" },
  CARRO: { label: "Carro", color: "#6366f1" },
  MOTO: { label: "Moto", color: "#38bdf8" },
} satisfies ChartConfig;

function rotuloDia(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export function ExpenseCharts({
  gastosPorDia,
  distribuicao,
}: {
  gastosPorDia: GastoDiario[];
  distribuicao: DistribuicaoTipo[];
}) {
  const total = useMemo(
    () => distribuicao.reduce((soma, d) => soma + d.valor, 0),
    [distribuicao],
  );

  const dadosDonut = useMemo(
    () =>
      distribuicao.map((d) => ({
        tipo: d.tipo,
        valor: d.valor,
        fill: chartConfig[d.tipo].color,
      })),
    [distribuicao],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle>Gastos por Deslocamento</CardTitle>
          <CardDescription>Evolução diária da quinzena por tipo</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart accessibilityLayer data={gastosPorDia}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="data"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={rotuloDia}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => rotuloDia(String(value))}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent className="text-xs" />} />
              <Bar dataKey="ESCRITORIO" stackId="a" fill="var(--color-ESCRITORIO)" />
              <Bar dataKey="CARRO" stackId="a" fill="var(--color-CARRO)" />
              <Bar
                dataKey="MOTO"
                stackId="a"
                fill="var(--color-MOTO)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Distribuição por Tipo</CardTitle>
          <CardDescription>Participação no total da quinzena</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-64"
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="tipo"
                    formatter={(value) => formatarBRL(Number(value))}
                  />
                }
              />
              <Pie
                data={dadosDonut}
                dataKey="valor"
                nameKey="tipo"
                innerRadius={70}
                strokeWidth={4}
              >
                <Label
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox)) return null;
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) - 8}
                          className="fill-foreground text-lg font-semibold tabular-nums"
                        >
                          {formatarBRL(total)}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 14}
                          className="fill-muted-foreground text-xs"
                        >
                          Total
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
