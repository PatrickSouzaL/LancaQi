"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { aprovarDespesa } from "@/app/actions/admin-actions";
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
 * Aprova uma despesa (status → PAGO) com confirmação. Autorização real na RLS
 * (`is_admin()`); a action `aprovarDespesa` só transiciona pendentes. O diálogo
 * só fecha após a conclusão (spinner no botão durante a transição).
 */
export function AprovarDespesaButton({
  id,
  nome,
}: {
  id: string;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [aprovando, startTransition] = useTransition();

  function confirmar(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      const resultado = await aprovarDespesa(id);
      if (resultado.ok) {
        toast.success(resultado.message ?? "Despesa aprovada.");
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
          className="text-muted-foreground hover:text-emerald-600"
          aria-label={`Aprovar despesa de ${nome}`}
        >
          <CheckCircle2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aprovar despesa?</AlertDialogTitle>
          <AlertDialogDescription>
            A despesa de{" "}
            <span className="font-medium text-foreground">{nome}</span> será
            marcada como <span className="font-medium">paga</span>. Despesas
            pagas não podem mais ser editadas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={aprovando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmar}
            disabled={aprovando}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {aprovando ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Aprovando...
              </>
            ) : (
              "Aprovar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
