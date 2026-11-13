"use client";

import { Eye } from "lucide-react";

import { StatusBadge, TipoBadge } from "@/components/admin/StatusBadges";
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
import { formatarBRL, formatarData, formatarKm } from "@/lib/format";
import type { Despesa } from "@/lib/types";

/** Uma linha rótulo/valor do painel de detalhes. */
function Linha({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Botão que abre os detalhes completos de uma despesa (leitura), com destaque
 * para o campo `descrição` — que não cabe nas colunas da tabela. Reutilizado na
 * Auditoria e na aba Aprovações. Todo texto é renderizado como conteúdo puro
 * (escape do React, sem HTML → sem XSS).
 */
export function DetalhesDespesaButton({ despesa }: { despesa: Despesa }) {
  const temTrajeto = despesa.origem !== "—" || despesa.destino !== "—";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label={`Ver detalhes da despesa de ${despesa.usuario_nome}`}
        >
          <Eye className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Detalhes da despesa</AlertDialogTitle>
          <AlertDialogDescription>
            Lançamento de {despesa.usuario_nome} em {formatarData(despesa.data)}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Linha rotulo="Analista">{despesa.usuario_nome}</Linha>
          <Linha rotulo="Data">
            <span className="tabular-nums">
              {formatarData(despesa.data)} • {despesa.hora}
            </span>
          </Linha>
          <Linha rotulo="Tipo">
            <TipoBadge tipo={despesa.tipo} />
          </Linha>
          <Linha rotulo="Status">
            <StatusBadge status={despesa.status} />
          </Linha>

          {temTrajeto && (
            <Linha rotulo="Trajeto">
              {despesa.origem} <span className="text-muted-foreground">→</span>{" "}
              {despesa.destino}
            </Linha>
          )}
          {despesa.quantidade_km > 0 && (
            <Linha rotulo="Distância">
              <span className="tabular-nums">
                {formatarKm(despesa.quantidade_km)}
              </span>
            </Linha>
          )}

          <Linha rotulo="Valor">
            <span className="font-medium tabular-nums">
              {formatarBRL(despesa.valor_calculado)}
            </span>
          </Linha>
          {despesa.valor_declarado != null && (
            <Linha rotulo="Valor declarado">
              <span className="tabular-nums">
                {formatarBRL(despesa.valor_declarado)}
              </span>
            </Linha>
          )}

          <div className="col-span-2">
            <Linha rotulo="Descrição">
              {despesa.descricao ? (
                <span className="whitespace-pre-wrap">{despesa.descricao}</span>
              ) : (
                <span className="text-muted-foreground">
                  Sem descrição informada.
                </span>
              )}
            </Linha>
          </div>

          {despesa.status === "NEGADO" && (
            <div className="col-span-2">
              <Linha rotulo="Motivo da negação">
                <span className="whitespace-pre-wrap">
                  {despesa.motivo_negacao ?? "Nenhum motivo informado."}
                </span>
              </Linha>
            </div>
          )}
        </dl>

        <AlertDialogFooter>
          <AlertDialogAction>Fechar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
