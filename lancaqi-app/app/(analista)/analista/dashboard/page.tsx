import Link from "next/link";
import { ArrowRight, Clock, PlusCircle, Wallet } from "lucide-react";

import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getResumoAnalista, getDespesasDoAnalista } from "@/lib/data/analista";
import { getUsuarioPerfil } from "@/lib/data/auth";
import { formatarBRL, formatarData, labelStatus, labelTipo } from "@/lib/format";
import type { StatusDespesa } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<StatusDespesa, string> = {
  PENDENTE:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  PAGO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

function StatusBadge({ status }: { status: StatusDespesa }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {labelStatus(status)}
    </span>
  );
}

export default async function AnalistaDashboardPage() {
  const [perfil, resumo, despesas] = await Promise.all([
    getUsuarioPerfil(),
    getResumoAnalista(),
    getDespesasDoAnalista(),
  ]);
  const vazio = resumo.quantidade === 0;
  const primeiroNome = perfil.nome.split(/\s+/)[0];
  const ultimasDespesas = despesas.slice(0, 5);

  return (
    <>
      <PageHeading
        titulo={`Olá, ${primeiroNome}`}
        descricao="Resumo dos seus lançamentos na quinzena atual."
        acao={
          <Button asChild className="h-11">
            <Link href="/analista/lancamento">
              <PlusCircle className="size-4" />
              Novo Lançamento
            </Link>
          </Button>
        }
      />

      {/* Hero Metric — elemento de maior peso visual (UI_UX_Guidelines §2.1). */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-accent to-card shadow-sm">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Wallet className="size-4" />
            Total acumulado na quinzena
          </CardDescription>
          <CardTitle className="text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">
            {formatarBRL(resumo.totalQuinzena)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vazio ? (
            <p className="text-sm text-muted-foreground">
              Você ainda não tem lançamentos neste ciclo.{" "}
              <Link
                href="/analista/lancamento"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Registrar o primeiro
              </Link>
              .
            </p>
          ) : (
            <p className="text-sm text-muted-foreground tabular-nums">
              {resumo.quantidade} lançamentos no período.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Clock className="size-4 text-amber-600" />
              A receber (pendente)
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {formatarBRL(resumo.totalPendente)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Wallet className="size-4 text-emerald-600" />
              Já reembolsado (pago)
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {formatarBRL(resumo.totalPago)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Últimos Lançamentos</h3>

        {ultimasDespesas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card">
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead className="w-[150px]">Tipo</TableHead>
                    <TableHead>Trajeto</TableHead>
                    <TableHead className="w-[120px] text-right">Valor (R$)</TableHead>
                    <TableHead className="w-[120px] text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ultimasDespesas.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="w-[120px] tabular-nums font-medium">
                        {formatarData(d.data)}
                      </TableCell>
                      <TableCell className="w-[150px] font-medium text-foreground">
                        {labelTipo(d.tipo)}
                      </TableCell>
                      <TableCell>
                        {d.origem === "—" && d.destino === "—" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <span>
                            {d.origem} <span className="text-muted-foreground">→</span> {d.destino}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="w-[120px] text-right font-semibold tabular-nums text-primary">
                        {formatarBRL(d.valor_calculado)}
                      </TableCell>
                      <TableCell className="w-[120px] text-center">
                        <StatusBadge status={d.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <ul className="space-y-3 md:hidden">
              {ultimasDespesas.map((d) => (
                <li
                  key={d.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatarData(d.data)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d.origem === "—" && d.destino === "—"
                          ? labelTipo(d.tipo)
                          : `${d.origem} → ${d.destino}`}
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-muted-foreground">
                      Valor Reembolso
                    </span>
                    <span className="text-base font-bold tabular-nums text-primary">
                      {formatarBRL(d.valor_calculado)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex justify-end pt-2">
              <Button
                asChild
                variant="outline"
                className="h-11 w-full justify-between sm:w-auto"
              >
                <Link href="/analista/historico">
                  Ver histórico completo
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
