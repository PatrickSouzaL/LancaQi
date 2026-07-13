import { CalendarClock } from "lucide-react";

import { PageHeading } from "@/components/PageHeading";
import { AnalistaCell } from "@/components/admin/AnalistaCell";
import { FechamentoClient } from "@/components/admin/FechamentoClient";
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
import { getDespesasPendentes } from "@/lib/data/despesas";
import {
  getResumoFechamento,
  getResumoFechamentoPorCliente,
  SEM_CLIENTE_ID,
} from "@/lib/data/dashboard";
import { formatarBRL, formatarKm } from "@/lib/format";
import { quinzenaAtual } from "@/lib/periodo";

export default async function FechamentoPage() {
  // Fechamento da quinzena vigente: PENDENTE + intervalo de datas da quinzena.
  const periodo = quinzenaAtual();
  const [pendentes, resumo, resumoClientes] = await Promise.all([
    getDespesasPendentes(periodo),
    getResumoFechamento(periodo),
    getResumoFechamentoPorCliente(periodo),
  ]);

  const totalPeriodo = resumo.reduce((soma, r) => soma + r.totalPendente, 0);
  const totalClientes = resumoClientes.reduce(
    (soma, r) => soma + r.totalPendente,
    0,
  );

  return (
    <>
      <PageHeading
        titulo="Fechamento Quinzenal"
        descricao="Consolide e pague em lote as despesas pendentes do período."
        acao={
          // Legenda do período — orienta quem realiza o pagamento.
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <CalendarClock className="size-3.5" />
            Quinzena de {periodo.rotulo}
          </span>
        }
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Resumo por Analista</CardTitle>
          <CardDescription>
            Quinzena de {periodo.rotulo} • {formatarBRL(totalPeriodo)} pendentes
            de pagamento
          </CardDescription>
          {resumo.length > 0 && (
            <CardAction>
              <Button variant="outline" asChild>
                {/* Download server-side (GET autenticado): resumo por analista.
                    XLSX com uma aba por analista + aba de resumo. */}
                <a href="/admin/fechamento/export/analistas" download>
                  Exportar Excel
                </a>
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {resumo.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma despesa pendente no período.
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

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Resumo por Cliente</CardTitle>
          <CardDescription>
            Quinzena de {periodo.rotulo} • {formatarBRL(totalClientes)}{" "}
          </CardDescription>
          {resumoClientes.length > 0 && (
            <CardAction>
              <Button variant="outline" asChild>
                {/* Download server-side (GET autenticado): resumo por cliente.
                    XLSX com uma aba por cliente + aba de resumo. */}
                <a href="/admin/fechamento/export/clientes" download>
                  Exportar Excel
                </a>
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {resumoClientes.length === 0 ? (
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
                {resumoClientes.map((r) => {
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

      <FechamentoClient pendentes={pendentes} />
    </>
  );
}
