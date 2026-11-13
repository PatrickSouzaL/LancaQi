"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { ExcluirDespesaButton } from "@/components/ExcluirDespesaButton";
import { MotivoNegacaoButton } from "@/components/MotivoNegacaoButton";
import { FormularioDespesa } from "@/components/analista/FormularioDespesa";
import type { OpcaoCliente } from "@/components/ClienteCombobox";
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
 * Ações do analista sobre a própria despesa:
 * - `PENDENTE`: editar e excluir (a RLS bloqueia despesas já decididas/pagas).
 *   A edição abre um Sheet reaproveitando o `FormularioDespesa`.
 * - `NEGADO`: ver o motivo documentado pelo Admin (leitura). O texto é renderizado
 *   como conteúdo puro (escape do React), sem HTML — sem vetor de XSS.
 * - `APROVADO`/`PAGO`: sem ações (imutáveis para o analista).
 */
export function HistoricoAcoes({
  despesa,
  taxas,
  clientes,
  className,
}: {
  despesa: Despesa;
  taxas: ConfiguracoesTaxas;
  clientes: OpcaoCliente[];
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);

  // Despesa negada: única ação é consultar o motivo da negação.
  if (despesa.status === "NEGADO") {
    return (
      <div className={cn("flex items-center justify-end gap-1", className)}>
        <MotivoNegacaoButton motivo={despesa.motivo_negacao} />
      </div>
    );
  }

  // Aprovadas e pagas são imutáveis para o analista — sem ações.
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
              clientes={clientes}
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
