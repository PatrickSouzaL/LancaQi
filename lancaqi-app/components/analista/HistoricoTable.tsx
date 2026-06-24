import { HistoricoAcoes } from "@/components/analista/HistoricoAcoes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarBRL, formatarData, formatarKm, labelStatus, labelTipo } from "@/lib/format";
import type { ConfiguracoesTaxas, Despesa, StatusDespesa } from "@/lib/types";
import { cn } from "@/lib/utils";

// Classes exatas das badges de status (UI_UX_Guidelines §2.3).
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

/**
 * Histórico de reembolsos do analista. Responsivo: tabela em telas md+ e cards
 * empilhados no mobile (UI_UX_Guidelines §2.3). Datas/textos à esquerda;
 * KM e valores à direita com `tabular-nums`.
 */
export function HistoricoTable({
  despesas,
  taxas,
}: {
  despesas: Despesa[];
  taxas: ConfiguracoesTaxas;
}) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">KM</TableHead>
              <TableHead className="text-right">Valor (R$)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {despesas.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="tabular-nums">
                  {formatarData(d.data)}
                </TableCell>
                <TableCell>{d.origem}</TableCell>
                <TableCell>{d.destino}</TableCell>
                <TableCell>{labelTipo(d.tipo)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatarKm(d.quantidade_km)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatarBRL(d.valor_calculado)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
                <TableCell className="text-right">
                  <HistoricoAcoes despesa={d} taxas={taxas} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: cada lançamento vira um card */}
      <ul className="space-y-3 md:hidden">
        {despesas.map((d) => (
          <li
            key={d.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium tabular-nums">
                  {formatarData(d.data)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {labelTipo(d.tipo)}
                </p>
              </div>
              <StatusBadge status={d.status} />
            </div>
            <p className="mt-2 text-sm">
              {d.origem} <span className="text-muted-foreground">→</span>{" "}
              {d.destino}
            </p>
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatarKm(d.quantidade_km)}
              </span>
              <span className="text-base font-semibold tabular-nums">
                {formatarBRL(d.valor_calculado)}
              </span>
            </div>
            {d.status === "PENDENTE" && (
              <div className="mt-2 border-t pt-2">
                <HistoricoAcoes despesa={d} taxas={taxas} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
