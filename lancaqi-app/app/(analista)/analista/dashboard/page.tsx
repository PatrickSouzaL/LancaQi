import Link from "next/link";
import { ArrowRight, PlusCircle, Receipt, Wallet } from "lucide-react";

import { PageHeading } from "@/components/PageHeading";
import { AnalistaGastosChart } from "@/components/dashboard/AnalistaGastosChart";
import { AnalistaPagoCard } from "@/components/dashboard/AnalistaPagoCard";
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
import {
  getDespesasDoAnalista,
  getGastosDiariosAnalista,
  getResumoAnalista,
  getTotalPagoAnalista,
} from "@/lib/data/analista";
import { getUsuarioPerfil } from "@/lib/data/auth";
import { formatarBRL, formatarData, labelStatus, labelTipo } from "@/lib/format";
import {
  mesAnterior,
  quinzenaAnterior,
  quinzenaAtual,
  ultimosDias,
} from "@/lib/periodo";
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
  // Recortes de período: gráfico (7 dias móveis vs. quinzena anterior fechada)
  // e bloco de reembolso (quinzena anterior vs. mês-calendário anterior).
  const janela7 = ultimosDias(7);
  const quinzenaAnt = quinzenaAnterior();
  const mesAnt = mesAnterior();
  const quinzenaCorrente = quinzenaAtual();

  const [perfil, resumo, despesas, gastos7, gastosQuinzena, pagoQuinzena, pagoMes] =
    await Promise.all([
      getUsuarioPerfil(),
      getResumoAnalista(),
      getDespesasDoAnalista(),
      getGastosDiariosAnalista(janela7),
      getGastosDiariosAnalista(quinzenaAnt),
      getTotalPagoAnalista(quinzenaAnt),
      getTotalPagoAnalista(mesAnt),
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
        {/* Card focado apenas no valor total. A contagem de lançamentos foi
            movida para o mini-card da coluna direita. O CTA de "primeiro
            lançamento" só aparece quando o ciclo está vazio. */}
        {vazio && (
          <CardContent>
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
          </CardContent>
        )}
      </Card>

      {/* Seção principal: gráfico ocupa ~66% (2/3) e é o elemento dominante; a
          coluna direita (1/3) é um stack vertical. O grid estica as colunas à
          mesma altura (definida pelo gráfico). Na direita, o card de reembolso
          é fit-content no topo e o mini-card cresce (`flex-1`) até encostar a
          base exatamente na base do gráfico — sem ultrapassar. Empilha no
          mobile. */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AnalistaGastosChart
            seteDias={gastos7}
            quinzena={gastosQuinzena}
            rotuloQuinzena={quinzenaAnt.rotulo}
          />
        </div>

        <div className="flex h-full flex-col gap-4 lg:col-span-2">
          {/* Já reembolsado — altura só do conteúdo (fit-content), no topo. */}
          <AnalistaPagoCard
            quinzena={{ total: pagoQuinzena, rotulo: quinzenaAnt.rotulo }}
            mes={{ total: pagoMes, rotulo: mesAnt.rotulo }}
          />

          {/* Mini-card: total de lançamentos da quinzena atual. `flex-1` +
              `min-h-0` faz a base ancorar na base do gráfico à esquerda. */}
          <Card className="flex min-h-0 flex-1 flex-col justify-center shadow-sm">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                Lançamentos no período
              </CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums">
                {resumo.quantidade}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                quinzena atual · {quinzenaCorrente.rotulo}
              </p>
            </CardHeader>
          </Card>
        </div>
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
