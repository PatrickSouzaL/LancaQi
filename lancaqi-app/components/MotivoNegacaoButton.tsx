"use client";

import { MessageSquareWarning } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Botão que abre o motivo da negação de uma despesa (leitura). Reutilizado no
 * Histórico do analista e na Auditoria do admin. O texto é renderizado como
 * conteúdo puro (escape do React, sem HTML) — sem vetor de XSS. `whitespace-pre-wrap`
 * preserva as quebras de linha que o admin digitou.
 */
export function MotivoNegacaoButton({
  motivo,
  nome,
}: {
  motivo: string | null;
  /** Nome do analista, usado apenas no rótulo acessível. */
  nome?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-rose-600"
          aria-label={
            nome ? `Ver motivo da negação de ${nome}` : "Ver motivo da negação"
          }
        >
          <MessageSquareWarning className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Motivo da negação</AlertDialogTitle>
          <AlertDialogDescription>
            Este lançamento foi negado pelo administrador e não entra no
            fechamento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground">
          {motivo ?? "Nenhum motivo informado."}
        </p>
        <AlertDialogFooter>
          <AlertDialogAction>Fechar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
