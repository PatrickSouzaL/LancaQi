"use client";

import { useState, useTransition } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { reverterAprovacao } from "@/app/actions/admin-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Reverte uma aprovação feita por engano (status APROVADO → PENDENTE): a despesa
 * volta para a fila de Aprovações e sai do Fechamento. Autorização real na RLS
 * (`is_admin()`); a action só transiciona quem está APROVADO. Confirmação com
 * spinner; o diálogo só fecha após a conclusão.
 */
export function ReverterAprovacaoButton({
  id,
  nome,
}: {
  id: string;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [revertendo, startTransition] = useTransition();

  function confirmar(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      const resultado = await reverterAprovacao(id);
      if (resultado.ok) {
        toast.success(resultado.message ?? "Aprovação revertida.");
        setAberto(false);
      } else {
        toast.error(resultado.error);
      }
    });
  }

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-amber-600"
          aria-label={`Reverter aprovação da despesa de ${nome}`}
        >
          <Undo2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reverter aprovação?</AlertDialogTitle>
          <AlertDialogDescription>
            A despesa de{" "}
            <span className="font-medium text-foreground">{nome}</span> voltará
            para <span className="font-medium">pendente</span> e sairá do próximo
            fechamento, podendo ser aprovada ou negada novamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={revertendo}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmar}
            disabled={revertendo}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {revertendo ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Revertendo...
              </>
            ) : (
              "Reverter"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
