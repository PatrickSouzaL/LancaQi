"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { excluirDespesa } from "@/app/actions/despesas-actions";
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
import { cn } from "@/lib/utils";

/**
 * Botão de exclusão de despesa com confirmação (AlertDialog). A autorização é
 * da RLS (analista: própria + PENDENTE; admin: qualquer). `onExcluido` permite
 * ao container reagir (ex.: fechar um Sheet aberto).
 */
export function ExcluirDespesaButton({
  id,
  onExcluido,
  rotulo = "Excluir",
  somenteIcone = false,
  className,
}: {
  id: string;
  onExcluido?: () => void;
  rotulo?: string;
  somenteIcone?: boolean;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [excluindo, startTransition] = useTransition();

  function confirmar(e: React.MouseEvent) {
    // Impede o fechamento automático do AlertDialog até a action concluir.
    e.preventDefault();
    startTransition(async () => {
      const resultado = await excluirDespesa(id);
      if (resultado.ok) {
        toast.success("Despesa excluída.");
        setAberto(false);
        onExcluido?.();
      } else {
        toast.error(resultado.error);
      }
    });
  }

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger asChild>
        {somenteIcone ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn("text-muted-foreground hover:text-destructive", className)}
            aria-label="Excluir despesa"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" className={className}>
            <Trash2 className="size-4" />
            {rotulo}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O lançamento será removido
            permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmar}
            disabled={excluindo}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {excluindo ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
