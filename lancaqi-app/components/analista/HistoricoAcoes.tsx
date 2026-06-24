"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { ExcluirDespesaButton } from "@/components/ExcluirDespesaButton";
import { FormularioDespesa } from "@/components/analista/FormularioDespesa";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ConfiguracoesTaxas, Despesa } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Ações do analista sobre a própria despesa: editar e excluir — disponíveis
 * apenas enquanto `PENDENTE` (a RLS bloqueia despesas já pagas). A edição abre
 * um Sheet reaproveitando o `FormularioDespesa` em modo de edição.
 */
export function HistoricoAcoes({
  despesa,
  taxas,
  className,
}: {
  despesa: Despesa;
  taxas: ConfiguracoesTaxas;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);

  // Despesas pagas são imutáveis para o analista — sem ações.
  if (despesa.status !== "PENDENTE") return null;

  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Editar despesa"
          >
            <Pencil className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar lançamento</SheetTitle>
            <SheetDescription>
              Ajuste os dados do deslocamento. O valor é recalculado pelo sistema.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <FormularioDespesa
              taxas={taxas}
              despesa={despesa}
              onSucesso={() => setAberto(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <ExcluirDespesaButton id={despesa.id} somenteIcone />
    </div>
  );
}
