"use client";

import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SEM_CLIENTE_ID } from "@/lib/clientes-fechamento";
import { formatarBRL, formatarKm } from "@/lib/format";
import type { ResumoFechamentoCliente } from "@/lib/types";

/**
 * Resumo das pendentes por cliente com filtro opcional de clientes internos
 * (ex.: "Casa", "Hype Tecnologia"). O toggle apenas ajusta a visão da tela; o
 * total exibido acompanha as linhas visíveis. Client component só por causa do
 * estado do checkbox — os dados chegam prontos do servidor.
 */
export function ResumoClientesCard({
  resumoClientes,
  periodoRotulo,
  queryPeriodo = "",
}: {
  resumoClientes: ResumoFechamentoCliente[];
  periodoRotulo: string;
  /** `"?periodo=anterior"` no modo consulta; vazio na quinzena vigente. */
  queryPeriodo?: string;
}) {
  const [ocultarInternos, setOcultarInternos] = useState(true);
  const checkboxId = useId();

  // Combina os filtros no link de download: `internos=1` espelha o toggle e
  // `periodo=anterior` acompanha a quinzena consultada na tela.
  function hrefExport(base: string): string {
    const partes: string[] = [];
    if (!ocultarInternos) partes.push("internos=1");
    if (queryPeriodo) partes.push("periodo=anterior");
    return partes.length ? `${base}?${partes.join("&")}` : base;
  }

  // Só faz sentido oferecer o toggle quando há algum cliente interno no período.
  const temInternos = useMemo(
    () => resumoClientes.some((r) => r.interno),
    [resumoClientes],
  );

  const visiveis = useMemo(
    () =>
      ocultarInternos
        ? resumoClientes.filter((r) => !r.interno)
        : resumoClientes,
    [resumoClientes, ocultarInternos],
  );

  const totalVisivel = useMemo(
    () => visiveis.reduce((soma, r) => soma + r.totalPendente, 0),
    [visiveis],
  );

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Resumo por Cliente</CardTitle>
        <CardDescription>
          Quinzena de {periodoRotulo} • {formatarBRL(totalVisivel)}
        </CardDescription>
        {temInternos && (
          <div className="mt-2 flex items-center gap-2">
            <Checkbox
              id={checkboxId}
              checked={ocultarInternos}
              onCheckedChange={(estado) => setOcultarInternos(estado === true)}
            />
            <Label
              htmlFor={checkboxId}
              className="text-xs font-normal text-muted-foreground"
            >
              Ocultar clientes internos (Casa, Hype Tecnologia)
            </Label>
          </div>
        )}
        {visiveis.length > 0 && (
          <CardAction className="flex gap-2">
            {/* Downloads server-side (GET autenticado): resumo por cliente, com
                uma aba/seção por cliente + resumo. Os filtros da tela (internos
                e quinzena) viajam na query. */}
            <Button variant="outline" asChild>
              <a
                href={hrefExport("/admin/fechamento/export/clientes")}
                download
              >
                Exportar Excel
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={hrefExport("/admin/fechamento/export/clientes/pdf")}
                download="resumo-clientes.pdf"
              >
                Exportar PDF
              </a>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {visiveis.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma despesa pendente no período.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Lançamentos</TableHead>
                <TableHead className="text-right">KM</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((r) => {
                const semCliente = r.cliente_id === SEM_CLIENTE_ID;
                return (
                  <TableRow key={r.cliente_id}>
                    <TableCell
                      className={
                        semCliente
                          ? "italic text-muted-foreground"
                          : "font-medium"
                      }
                    >
                      {r.cliente_nome}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.quantidadeLancamentos}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarKm(r.totalKm)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatarBRL(r.totalPendente)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
