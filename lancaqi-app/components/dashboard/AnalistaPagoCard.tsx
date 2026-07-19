"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";

import { SegmentedToggle } from "@/components/dashboard/SegmentedToggle";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatarBRL } from "@/lib/format";

type Recorte = "quinzena" | "mes";

interface TotalPeriodo {
  total: number;
  /** Rótulo amigável do período (ex.: "16–30 jun 2026", "jun 2026"). */
  rotulo: string;
}

/**
 * Bloco "Já reembolsado (pago)". Padrão: quinzena anterior (fechada). Toggle no
 * canto superior direito troca para o mês-calendário anterior. O valor em
 * destaque é o período selecionado; a linha inferior mostra o outro período,
 * para leitura comparativa num olhar. Ambos os totais já vêm somados do
 * servidor — aqui só alternamos qual fica em destaque.
 */
export function AnalistaPagoCard({
  quinzena,
  mes,
}: {
  quinzena: TotalPeriodo;
  mes: TotalPeriodo;
}) {
  const [recorte, setRecorte] = useState<Recorte>("quinzena");
  const atual = recorte === "quinzena" ? quinzena : mes;
  const outro = recorte === "quinzena" ? mes : quinzena;
  const outroLabel = recorte === "quinzena" ? "Último mês" : "Última quinzena";

  return (
    <Card className="shadow-sm gap-1">
      <CardHeader className="flex flex-row items-center justify-between pb-0">
        <CardDescription className="flex items-center gap-2 m-0 whitespace-nowrap">
          <Wallet className="size-4 text-emerald-600" />
          Já reembolsado (pago)
        </CardDescription>
        <CardAction className="self-center m-0">
          <SegmentedToggle<Recorte>
            aria-label="Período do reembolso"
            value={recorte}
            onChange={setRecorte}
            options={[
              { value: "quinzena", label: "Última quinzena" },
              { value: "mes", label: "Último mês" },
            ]}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="space-y-0">
          <CardTitle className="text-3xl font-bold tabular-nums">
            {formatarBRL(atual.total)}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{atual.rotulo}</p>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <span className="text-muted-foreground">{outroLabel}</span>
          <span className="font-medium tabular-nums text-foreground">
            {formatarBRL(outro.total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
