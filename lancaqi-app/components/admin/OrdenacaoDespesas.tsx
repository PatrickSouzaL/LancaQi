"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { labelTipo } from "@/lib/format";
import type { Despesa } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Colunas ordenáveis das tabelas de despesa (Fechamento e Auditoria). */
export type ChaveDespesa =
  | "usuario_nome"
  | "data"
  | "tipo"
  | "destino"
  | "quantidade_km"
  | "valor_calculado"
  | "status";

export interface Ordenacao {
  coluna: ChaveDespesa | null;
  direcao: "asc" | "desc";
}

function comparar(a: Despesa, b: Despesa, chave: ChaveDespesa): number {
  switch (chave) {
    case "quantidade_km":
    case "valor_calculado":
      return a[chave] - b[chave];
    case "data":
      return a.data.localeCompare(b.data); // ISO — comparável lexicograficamente
    case "tipo":
      return labelTipo(a.tipo).localeCompare(labelTipo(b.tipo), "pt-BR");
    default:
      return String(a[chave]).localeCompare(String(b[chave]), "pt-BR");
  }
}

/**
 * Ordenação client-side de despesas com ciclo de 3 estados por coluna:
 * neutro → crescente → decrescente → neutro.
 *
 * No estado neutro (padrão), lista pela DATA da despesa — mais nova primeiro —
 * sem depender da data de criação do banco. O sort é estável, então despesas do
 * mesmo dia preservam a ordem original recebida (desempate).
 */
export function useDespesasOrdenadas(despesas: Despesa[]) {
  const [ordenacao, setOrdenacao] = useState<Ordenacao>({
    coluna: null,
    direcao: "asc",
  });

  function alternar(coluna: ChaveDespesa) {
    setOrdenacao((prev) => {
      if (prev.coluna !== coluna) return { coluna, direcao: "asc" };
      if (prev.direcao === "asc") return { coluna, direcao: "desc" };
      return { coluna: null, direcao: "asc" }; // volta ao neutro
    });
  }

  const ordenadas = useMemo(() => {
    const base = [...despesas];
    if (ordenacao.coluna === null) {
      return base.sort((a, b) => b.data.localeCompare(a.data));
    }
    const fator = ordenacao.direcao === "asc" ? 1 : -1;
    const chave = ordenacao.coluna;
    return base.sort((a, b) => fator * comparar(a, b, chave));
  }, [despesas, ordenacao]);

  return { ordenadas, ordenacao, alternar };
}

/**
 * Cabeçalho de tabela clicável com indicador de ordenação. Sem coluna ativa,
 * mostra o ícone neutro (setas duplas); ativo, mostra a seta do sentido.
 */
export function CabecalhoOrdenavel({
  children,
  chave,
  ordenacao,
  onOrdenar,
  className,
  align = "left",
}: {
  children: React.ReactNode;
  chave: ChaveDespesa;
  ordenacao: Ordenacao;
  onOrdenar: (coluna: ChaveDespesa) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const ativo = ordenacao.coluna === chave;
  const Icone = ativo
    ? ordenacao.direcao === "asc"
      ? ChevronUp
      : ChevronDown
    : ChevronsUpDown;

  return (
    <TableHead className={cn(align === "right" && "text-right", className)}>
      <button
        type="button"
        onClick={() => onOrdenar(chave)}
        aria-pressed={ativo}
        className={cn(
          "inline-flex select-none items-center gap-1 transition-colors hover:text-foreground",
          align === "right" && "flex-row-reverse",
        )}
      >
        {children}
        <Icone
          className={cn(
            "size-3.5 shrink-0",
            ativo ? "text-foreground" : "text-muted-foreground/40",
          )}
        />
      </button>
    </TableHead>
  );
}
