import { AnalistaCell } from "@/components/admin/AnalistaCell";
import { TipoBadge } from "@/components/admin/StatusBadges";
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
import { formatarBRL, formatarData } from "@/lib/format";
import type { Despesa } from "@/lib/types";

export function RecentMovements({ despesas }: { despesas: Despesa[] }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Últimas Movimentações</CardTitle>
        <CardDescription>Lançamentos mais recentes da quinzena</CardDescription>
      </CardHeader>
      <CardContent>
        {despesas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma despesa encontrada.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Analista</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesas.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <AnalistaCell nome={d.usuario_nome} />
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatarData(d.data)}
                  </TableCell>
                  <TableCell>
                    <TipoBadge tipo={d.tipo} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatarBRL(d.valor_calculado)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
