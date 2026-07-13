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

// Paleta harmonizada com a cor da marca (azul #5BBAE8). As duas primeiras
// chaves (categorias) alimentam a barra empilhada; as demais (tipos) alimentam
// o donut de distribuição.
const chartConfig = {
  // Categorias (barra empilhada)
  DESLOCAMENTO: { label: "Deslocamento", color: "#1f7fb5" },
  DESPESA: { label: "Despesa", color: "#5BBAE8" },
  // Tipos (donut)
  ESCRITORIO: { label: "Escritório", color: "#cbd5e1" },
  CARRO: { label: "Carro", color: "#1f7fb5" },
  MOTO: { label: "Moto", color: "#5BBAE8" },
  PEDAGIO: { label: "Pedágio", color: "#f97316" },
  ESTACIONAMENTO: { label: "Estacionamento", color: "#eab308" },
  ALIMENTACAO_EXTERNA: { label: "Alimentação", color: "#f43f5e" },
  ALMOCO_CLIENTE: { label: "Almoço c/ cliente", color: "#ec4899" },
  LICENCA_SOFTWARE: { label: "Licença de software", color: "#8b5cf6" },
  EQUIPAMENTO: { label: "Equipamento", color: "#6366f1" },
  HOSPEDAGEM: { label: "Hospedagem", color: "#14b8a6" },
  PASSAGEM: { label: "Passagem", color: "#06b6d4" },
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
          <CardTitle>Gastos por Dia</CardTitle>
          <CardDescription>
            Evolução diária da quinzena por categoria
          </CardDescription>
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
                    // Linha custom: separa a categoria do valor (gap) e formata
                    // em BRL — sem o número colado no rótulo, mais legível.
                    formatter={(value, name, item) => (
                      <div className="flex w-full items-center justify-between gap-6">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2.5 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-muted-foreground">
                            {chartConfig[name as keyof typeof chartConfig]
                              ?.label ?? name}
                          </span>
                        </div>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {formatarBRL(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent className="text-xs" />} />
              <Bar
                dataKey="DESLOCAMENTO"
                stackId="a"
                fill="var(--color-DESLOCAMENTO)"
              />
              <Bar
                dataKey="DESPESA"
                stackId="a"
                fill="var(--color-DESPESA)"
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
                    hideLabel
                    // Linha custom: cor da fatia + tipo + valor em BRL, com folga
                    // entre o rótulo e o valor para leitura clara.
                    formatter={(value, name, item) => (
                      <div className="flex w-full items-center justify-between gap-6">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2.5 shrink-0 rounded-[2px]"
                            style={{
                              backgroundColor: item.payload?.fill ?? item.color,
                            }}
                          />
                          <span className="text-muted-foreground">
                            {chartConfig[name as keyof typeof chartConfig]
                              ?.label ?? name}
                          </span>
                        </div>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {formatarBRL(Number(value))}
                        </span>
                      </div>
                    )}
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
