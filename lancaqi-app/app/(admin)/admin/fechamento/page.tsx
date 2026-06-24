import { CalendarClock } from "lucide-react";

import { PageHeading } from "@/components/PageHeading";
import { AnalistaCell } from "@/components/admin/AnalistaCell";
import { FechamentoClient } from "@/components/admin/FechamentoClient";
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
import { getDespesasPendentes } from "@/lib/data/despesas";
import { getResumoFechamento } from "@/lib/data/dashboard";
import { formatarBRL, formatarKm } from "@/lib/format";
import { quinzenaAtual } from "@/lib/periodo";

export default async function FechamentoPage() {
  // Apenas status = 'PENDENTE' entra no fechamento (no alvo: WHERE status = 'PENDENTE').
  const [pendentes, resumo] = await Promise.all([
    getDespesasPendentes(),
    getResumoFechamento(),
  ]);

  const totalPeriodo = resumo.reduce((soma, r) => soma + r.totalPendente, 0);
  const periodo = quinzenaAtual();

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

      <FechamentoClient pendentes={pendentes} />
    </>
  );
}
