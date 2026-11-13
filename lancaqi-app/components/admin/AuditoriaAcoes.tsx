"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { DetalhesDespesaButton } from "@/components/admin/DetalhesDespesaButton";
import { ReverterAprovacaoButton } from "@/components/admin/ReverterAprovacaoButton";
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

/**
 * Ações do admin na Auditoria: auditar, editar e excluir uma despesa.
 *
 * A decisão de aprovar/negar NÃO vive aqui — pertence à aba "Aprovações". A
 * Auditoria é o relatório completo: consultar, corrigir e excluir.
 *
 * - Detalhes: sempre; abre a despesa completa (inclui a descrição).
 * - Reverter aprovação: só APROVADO; desfaz aprovação por engano (→ PENDENTE).
 * - Ver motivo: só NEGADO; abre o motivo documentado (leitura).
 * - Editar: só PENDENTE (aprovadas/pagas/negadas são imutáveis); abre um Sheet
 *   com o `FormularioDespesa` em modo admin (`comoAdmin` → action sem filtro de dono).
 * - Excluir: confirmação via AlertDialog (RLS permite admin excluir qualquer uma).
 */
export function AuditoriaAcoes({
  despesa,
  taxas,
  clientes,
}: {
  despesa: Despesa;
  taxas: ConfiguracoesTaxas;
  clientes: OpcaoCliente[];
}) {
  const [aberto, setAberto] = useState(false);
  const pendente = despesa.status === "PENDENTE";

  return (
    <div className="flex items-center justify-end gap-1">
      <DetalhesDespesaButton despesa={despesa} />
      {despesa.status === "APROVADO" && (
        <ReverterAprovacaoButton id={despesa.id} nome={despesa.usuario_nome} />
      )}
      {despesa.status === "NEGADO" && (
        <MotivoNegacaoButton
          motivo={despesa.motivo_negacao}
          nome={despesa.usuario_nome}
        />
      )}
      {pendente && (
        <Sheet open={aberto} onOpenChange={setAberto}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Editar despesa de ${despesa.usuario_nome}`}
            >
              <Pencil className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Editar despesa</SheetTitle>
              <SheetDescription>
                {despesa.usuario_nome} — o valor é recalculado pelo sistema.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <FormularioDespesa
                taxas={taxas}
                clientes={clientes}
                despesa={despesa}
                comoAdmin
                onSucesso={() => setAberto(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <ExcluirDespesaButton id={despesa.id} somenteIcone />
    </div>
  );
}
