"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { excluirCliente } from "@/app/actions/clientes-actions";
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
 * Exclusão de cliente com confirmação (AlertDialog). A autorização efetiva é da
 * RLS (apenas admin). O diálogo só fecha após a action concluir (spinner no
 * botão durante a transição).
 */
export function ExcluirClienteButton({
  id,
  nome,
}: {
  id: string;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [excluindo, startTransition] = useTransition();

  function confirmar(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      const resultado = await excluirCliente(id);
      if (resultado.ok) {
        toast.success("Cliente excluído.");
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
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Excluir ${nome}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O cliente{" "}
            <span className="font-medium text-foreground">{nome}</span> será
            removido permanentemente.
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
