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
import type { TooltipContentProps } from "recharts";

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
  OUTROS: { label: "Outros", color: "#6b7280" },
} satisfies ChartConfig;

function rotuloDia(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/** Séries empilhadas do gráfico de barras (chaves de dado). */
type SerieBarra = "ESCRITORIO" | "CARRO" | "MOTO" | "DESLOCAMENTO" | "DESPESA";

/** Canto arredondado aplicado ao topo da pilha. */
const RAIO_TOPO: [number, number, number, number] = [4, 4, 0, 0];

/**
 * Tooltip do gráfico de barras. Lista só as séries com valor > 0 (nos dias com
 * despesa, os 3 tipos de deslocamento vêm zerados; nos dias sem, o agregado),
 * cada uma com sua cor, rótulo e valor em BRL.
 */
function TooltipGastos({
  active,
  payload,
  label,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const itens = payload.filter((p) => Number(p.value) > 0);
  if (!itens.length) return null;

  return (
    <div className="grid min-w-40 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{rotuloDia(String(label))}</div>
      <div className="grid gap-1.5">
        {itens.map((item) => {
          const chave = String(item.dataKey) as keyof typeof chartConfig;
          return (
            <div
              key={String(item.dataKey)}
              className="flex items-center justify-between gap-6"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">
                  {chartConfig[chave]?.label ?? String(item.name)}
                </span>
              </div>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {formatarBRL(Number(item.value))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
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

  // Barras empilhadas por dia. Valor 0 vira null → recharts não desenha o
  // segmento nem lista no tooltip. Dias COM despesa: deslocamento agregado numa
  // barra + despesa. Dias SEM despesa: deslocamento detalhado nos 3 tipos.
  const dadosBarra = useMemo(() => {
    const naoZero = (v: number) => (v > 0 ? v : null);
    return gastosPorDia.map((g) => {
      const semDespesa = g.DESPESA === 0;
      const deslocamento = g.ESCRITORIO + g.CARRO + g.MOTO;
      return {
        data: g.data,
        ESCRITORIO: semDespesa ? naoZero(g.ESCRITORIO) : null,
        CARRO: semDespesa ? naoZero(g.CARRO) : null,
        MOTO: semDespesa ? naoZero(g.MOTO) : null,
        DESLOCAMENTO: semDespesa ? null : naoZero(deslocamento),
        DESPESA: semDespesa ? null : naoZero(g.DESPESA),
      };
    });
  }, [gastosPorDia]);

  // Séries que de fato têm dado no período — só elas viram barra e entram na
  // legenda (que fica dinâmica). Sem despesa no período, "Despesa" e o
  // "Deslocamento" agregado somem; sobram só Escritório/Carro/Moto.
  const seriesAtivas = useMemo(() => {
    const tem = (k: SerieBarra) => dadosBarra.some((d) => d[k] != null);
    return {
      ESCRITORIO: tem("ESCRITORIO"),
      CARRO: tem("CARRO"),
      MOTO: tem("MOTO"),
      DESLOCAMENTO: tem("DESLOCAMENTO"),
      DESPESA: tem("DESPESA"),
    };
  }, [dadosBarra]);

  // Topo de cada grupo (recebe o canto arredondado). Detalhe e agregado são
  // mutuamente exclusivos por dia, então cada grupo arredonda seu próprio topo.
  const topoDetalhe = seriesAtivas.MOTO
    ? "MOTO"
    : seriesAtivas.CARRO
      ? "CARRO"
      : seriesAtivas.ESCRITORIO
        ? "ESCRITORIO"
        : null;
  const topoAgregado = seriesAtivas.DESPESA
    ? "DESPESA"
    : seriesAtivas.DESLOCAMENTO
      ? "DESLOCAMENTO"
      : null;

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
            Evolução diária da quinzena — deslocamento detalhado por tipo nos
            dias sem despesa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart accessibilityLayer data={dadosBarra}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="data"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={rotuloDia}
              />
              <ChartTooltip content={<TooltipGastos />} />
              <ChartLegend content={<ChartLegendContent className="text-xs" />} />
              {/* Detalhe do deslocamento (dias sem despesa). Só renderiza a
                  série que tem dado — a legenda acompanha. */}
              {seriesAtivas.ESCRITORIO && (
                <Bar
                  dataKey="ESCRITORIO"
                  stackId="a"
                  fill="var(--color-ESCRITORIO)"
                  radius={topoDetalhe === "ESCRITORIO" ? RAIO_TOPO : undefined}
                />
              )}
              {seriesAtivas.CARRO && (
                <Bar
                  dataKey="CARRO"
                  stackId="a"
                  fill="var(--color-CARRO)"
                  radius={topoDetalhe === "CARRO" ? RAIO_TOPO : undefined}
                />
              )}
              {seriesAtivas.MOTO && (
                <Bar
                  dataKey="MOTO"
                  stackId="a"
                  fill="var(--color-MOTO)"
                  radius={topoDetalhe === "MOTO" ? RAIO_TOPO : undefined}
                />
              )}
              {/* Deslocamento agregado + despesa (dias com despesa). */}
              {seriesAtivas.DESLOCAMENTO && (
                <Bar
                  dataKey="DESLOCAMENTO"
                  stackId="a"
                  fill="var(--color-DESLOCAMENTO)"
                  radius={topoAgregado === "DESLOCAMENTO" ? RAIO_TOPO : undefined}
                />
              )}
              {seriesAtivas.DESPESA && (
                <Bar
                  dataKey="DESPESA"
                  stackId="a"
                  fill="var(--color-DESPESA)"
                  radius={topoAgregado === "DESPESA" ? RAIO_TOPO : undefined}
                />
              )}
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
