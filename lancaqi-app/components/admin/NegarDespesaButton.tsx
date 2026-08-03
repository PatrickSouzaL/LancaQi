"use client";

import { useState, useTransition } from "react";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { negarDespesa } from "@/app/actions/admin-actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_MOTIVO = 1000;

/**
 * Nega uma despesa (status PENDENTE → NEGADO) exigindo um "Motivo da Negação".
 * O motivo é obrigatório: a validação client-side dá feedback imediato, mas a
 * regra real vive no servidor (Zod em `negarDespesa`) + CHECK no banco. O texto
 * é gravado parametrizado (sem SQLi) e exibido ao analista como texto puro
 * (escape do React, sem HTML → sem XSS). Autorização real na RLS (`is_admin()`).
 */
export function NegarDespesaButton({
  id,
  nome,
}: {
  id: string;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [negando, startTransition] = useTransition();

  function fechar(proximo: boolean) {
    // Ao fechar, limpa o rascunho e o erro para a próxima abertura.
    if (!proximo) {
      setMotivo("");
      setErro(null);
    }
    setAberto(proximo);
  }

  function confirmar() {
    const limpo = motivo.trim();
    if (limpo.length === 0) {
      setErro("Informe o motivo da negação.");
      return;
    }
    startTransition(async () => {
      const resultado = await negarDespesa(id, limpo);
      if (resultado.ok) {
        toast.success(resultado.message ?? "Despesa negada.");
        fechar(false);
      } else {
        setErro(resultado.error);
        toast.error(resultado.error);
      }
    });
  }

  return (
    <AlertDialog open={aberto} onOpenChange={fechar}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-rose-600"
          aria-label={`Negar despesa de ${nome}`}
        >
          <XCircle className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Negar despesa?</AlertDialogTitle>
          <AlertDialogDescription>
            A despesa de{" "}
            <span className="font-medium text-foreground">{nome}</span> será
            marcada como <span className="font-medium">negada</span> e ficará
            fora do fechamento. O analista poderá ver o motivo abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor={`motivo-${id}`}>Motivo da negação</Label>
          <Textarea
            id={`motivo-${id}`}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              if (erro) setErro(null);
            }}
            maxLength={MAX_MOTIVO}
            rows={4}
            placeholder="Explique por que esta despesa está sendo negada..."
            aria-invalid={erro ? true : undefined}
            disabled={negando}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-destructive">{erro}</span>
            <span className="text-muted-foreground tabular-nums">
              {motivo.length}/{MAX_MOTIVO}
            </span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={negando}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={confirmar}
            disabled={negando}
          >
            {negando ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Negando...
              </>
            ) : (
              "Negar despesa"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
