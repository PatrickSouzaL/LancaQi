import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { PageHeading } from "@/components/PageHeading";
import { AnalistaCell } from "@/components/admin/AnalistaCell";
import { FechamentoClient } from "@/components/admin/FechamentoClient";
import { ResumoClientesCard } from "@/components/admin/ResumoClientesCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { getDespesas, getDespesasPendentes } from "@/lib/data/despesas";
import {
  getResumoFechamento,
  getResumoFechamentoPorCliente,
} from "@/lib/data/dashboard";
import { formatarBRL, formatarKm } from "@/lib/format";
import { quinzenaAnterior, quinzenaAtual } from "@/lib/periodo";
import { cn } from "@/lib/utils";

export default async function FechamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo: paramPeriodo } = await searchParams;

  // Modo consulta: `?periodo=anterior` troca a página inteira para a quinzena
  // passada, exibindo TODAS as despesas (PAGO + PENDENTE) — sem ações de
  // pagamento nem export (que sempre cobrem a quinzena vigente).
  const consulta = paramPeriodo === "anterior";
  const periodo = consulta ? quinzenaAnterior() : quinzenaAtual();

  // Sufixo repassado aos endpoints de export para cobrirem a mesma quinzena da
  // tela (vigente ou anterior).
  const queryPeriodo = consulta ? "?periodo=anterior" : "";

  // Na quinzena vigente, a fila é só PENDENTE (pagamento em lote). No modo
  // consulta, trazemos tudo do período para conferência.
  const [pendentes, resumo, resumoClientes] = await Promise.all([
    consulta ? getDespesas(periodo) : getDespesasPendentes(periodo),
    getResumoFechamento(periodo, { todosStatus: consulta }),
    getResumoFechamentoPorCliente(periodo, { todosStatus: consulta }),
  ]);

  const totalPeriodo = resumo.reduce((soma, r) => soma + r.totalPendente, 0);

  return (
    <>
      <PageHeading
        titulo="Fechamento Quinzenal"
        descricao="Consolide e pague em lote as despesas aprovadas do período."
        acao={
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {/* Legenda do período — orienta quem realiza o pagamento. */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <CalendarClock className="size-3.5" />
              Quinzena de {periodo.rotulo}
            </span>
            {/* Alterna entre a quinzena vigente e a anterior (consulta rápida). */}
            <div className="inline-flex rounded-lg border border-border p-0.5">
              <Button
                asChild
                size="sm"
                variant={consulta ? "ghost" : "secondary"}
                className={cn("h-8", !consulta && "shadow-sm")}
              >
                <Link href="/admin/fechamento">Quinzena atual</Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant={consulta ? "secondary" : "ghost"}
                className={cn("h-8", consulta && "shadow-sm")}
              >
                <Link href="/admin/fechamento?periodo=anterior">
                  Quinzena anterior
                </Link>
              </Button>
            </div>
          </div>
        }
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Resumo por Analista</CardTitle>
          <CardDescription>
            Quinzena de {periodo.rotulo} • {formatarBRL(totalPeriodo)}{" "}
            {consulta ? "no período" : "aprovadas para pagamento"}
          </CardDescription>
          {resumo.length > 0 && (
            <CardAction className="flex gap-2">
              {/* Downloads server-side (GET autenticado): resumo por analista.
                  O `?periodo=anterior` acompanha a quinzena consultada na tela. */}
              <Button variant="outline" asChild>
                <a
                  href={`/admin/fechamento/export/analistas${queryPeriodo}`}
                  download
                >
                  Exportar Excel
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={`/admin/fechamento/export/analistas/pdf${queryPeriodo}`}
                  download="resumo-analistas.pdf"
                >
                  Exportar PDF
                </a>
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {resumo.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {consulta
                ? "Nenhuma despesa no período."
                : "Nenhuma despesa aprovada no período."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Analista</TableHead>
                  <TableHead className="text-right">Lançamentos</TableHead>
                  <TableHead className="text-right">KM</TableHead>
                  <TableHead className="text-right">Total (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumo.map((r) => (
                  <TableRow key={r.usuario_id}>
                    <TableCell>
                      <AnalistaCell nome={r.usuario_nome} />
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ResumoClientesCard
        resumoClientes={resumoClientes}
        periodoRotulo={periodo.rotulo}
        queryPeriodo={queryPeriodo}
      />

      <FechamentoClient
        pendentes={pendentes}
        consulta={consulta}
        queryPeriodo={queryPeriodo}
      />
    </>
  );
}
