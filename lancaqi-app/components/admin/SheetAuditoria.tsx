"use client";

import { StatusBadge, TipoBadge } from "@/components/admin/StatusBadges";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatarBRL, formatarData, formatarKm } from "@/lib/format";
import type { Despesa } from "@/lib/types";

interface SheetAuditoriaProps {
  despesa: Despesa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="text-right font-medium tabular-nums">{valor}</span>
    </div>
  );
}

/**
 * Painel lateral de detalhes da despesa (Auditoria).
 *
 * "Aprovar Despesa" → no alvo, Server Action que valida sessão + `is_admin()`
 * e faz UPDATE status='PAGO' WHERE id = $1 (o id e a transição são validados
 * no servidor; nunca confiar no payload do cliente). Aqui é apenas console.log.
 */
export function SheetAuditoria({
  despesa,
  open,
  onOpenChange,
}: SheetAuditoriaProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-md">
        {despesa && (
          <>
            <SheetHeader>
              <SheetTitle>Detalhes da Despesa</SheetTitle>
              <SheetDescription>{despesa.usuario_nome}</SheetDescription>
              <div className="flex items-center gap-2 pt-1">
                <TipoBadge tipo={despesa.tipo} />
                <StatusBadge status={despesa.status} />
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4">
              <Linha rotulo="Data" valor={formatarData(despesa.data)} />
              <Separator />
              {/* "Hora" é exibição apenas — não persiste no schema atual. */}
              <Linha rotulo="Hora" valor={despesa.hora} />
              <Separator />
              <Linha rotulo="Origem" valor={despesa.origem} />
              <Separator />
              <Linha rotulo="Destino" valor={despesa.destino} />
              <Separator />
              <Linha rotulo="KM" valor={formatarKm(despesa.quantidade_km)} />
              {despesa.observacao && (
                <>
                  <Separator />
                  <div className="py-2 text-sm">
                    <p className="text-muted-foreground">Observação</p>
                    <p className="pt-1">{despesa.observacao}</p>
                  </div>
                </>
              )}

              <div className="mt-4 rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground">Valor total</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatarBRL(despesa.valor_calculado)}
                </p>
              </div>
            </div>

            <SheetFooter>
              <Button
                onClick={() =>
                  console.log("aprovar despesa", { id: despesa.id })
                }
                disabled={despesa.status === "PAGO"}
              >
                Aprovar Despesa
              </Button>
              <SheetClose asChild>
                <Button variant="outline">Cancelar</Button>
              </SheetClose>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
