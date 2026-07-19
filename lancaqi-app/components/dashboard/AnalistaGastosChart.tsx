"use client";

// Client por conta do Recharts (usa hooks/medições no browser) e do toggle de
// período no canto superior direito do card.
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

import { SegmentedToggle } from "@/components/dashboard/SegmentedToggle";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatarBRL } from "@/lib/format";
import type { GastoDiarioTotal } from "@/lib/types";

// Cor da marca (azul #5BBAE8) para a única série do gráfico.
const chartConfig = {
  total: { label: "Total do dia", color: "#5BBAE8" },
} satisfies ChartConfig;

/** "2025-06-15" → "15/06". */
function rotuloDia(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

type Janela = "sete" | "quinzena";

/** Tooltip enxuto: dia + total em BRL. */
function TooltipGasto({
  active,
  payload,
  label,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const valor = Number(payload[0]?.value ?? 0);

  return (
    <div className="grid min-w-32 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{rotuloDia(String(label))}</div>
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-1.5">
          <span
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: "var(--color-total)" }}
          />
          <span className="text-muted-foreground">Total do dia</span>
        </div>
        <span className="font-mono font-medium tabular-nums text-foreground">
          {formatarBRL(valor)}
        </span>
      </div>
    </div>
  );
}

/**
 * Gráfico de barras dos gastos diários do analista. Padrão: últimos 7 dias.
 * Toggle no canto superior direito troca para a quinzena anterior (fechada).
 * Ambos listam SÓ os dias com lançamento — a agregação server-side já omite os
 * dias vazios, então barras ausentes = dias sem despesa no período.
 */
export function AnalistaGastosChart({
  seteDias,
  quinzena,
  rotuloQuinzena,
}: {
  seteDias: GastoDiarioTotal[];
  quinzena: GastoDiarioTotal[];
  rotuloQuinzena: string;
}) {
  const [janela, setJanela] = useState<Janela>("sete");
  const dados = janela === "sete" ? seteDias : quinzena;

  return (
    <Card className="h-full shadow-sm">
      <CardHeader>
        <CardTitle>Gastos por dia</CardTitle>
        <CardDescription>
          {janela === "sete"
            ? "Últimos 7 dias — apenas dias com lançamento"
            : `Quinzena anterior (${rotuloQuinzena}) — apenas dias com lançamento`}
        </CardDescription>
        <CardAction>
          <SegmentedToggle<Janela>
            aria-label="Período do gráfico"
            value={janela}
            onChange={setJanela}
            options={[
              { value: "sete", label: "7 dias" },
              { value: "quinzena", label: "Última quinzena" },
            ]}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border sm:aspect-[21/9] lg:aspect-[3/1]">
            <p className="text-sm text-muted-foreground">
              Nenhum lançamento neste período.
            </p>
          </div>
        ) : (
          // Altura 100% responsiva via aspect-ratio no wrapper (sem px/rem
          // fixos): o ResponsiveContainer interno ocupa 100% x 100%. No lg o
          // gráfico é o elemento dominante (ratio 2/1, mais alto) — ele ancora
          // a altura da coluna direita ao lado.
          <ChartContainer
            config={chartConfig}
            className="aspect-video w-full sm:aspect-[21/9] lg:aspect-[3/1]"
          >
            <BarChart accessibilityLayer data={dados}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="data"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
                tickFormatter={rotuloDia}
              />
              <ChartTooltip content={<TooltipGasto />} />
              <Bar
                dataKey="total"
                fill="var(--color-total)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
