"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { marcarLotePago } from "@/app/actions/admin-actions";
import { AnalistaCell } from "@/components/admin/AnalistaCell";
import {
  CabecalhoOrdenavel,
  useDespesasOrdenadas,
} from "@/components/admin/OrdenacaoDespesas";
import { TipoBadge } from "@/components/admin/StatusBadges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarBRL, formatarData, formatarKm } from "@/lib/format";
import type { Despesa } from "@/lib/types";

/**
 * Consolidação das despesas PENDENTE para pagamento em lote.
 *
 * O total selecionado é somado em tempo real (useMemo) apenas para feedback
 * de UI. No alvo, a marcação roda numa Server Action que valida `is_admin()` e
 * processa os uuids server-side — a lista de IDs do cliente nunca é autoritativa
 * (a RLS é a barreira final).
 */
export function FechamentoClient({ pendentes }: { pendentes: Despesa[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [processando, startTransition] = useTransition();

  // Ordenação client-side (headers clicáveis). Padrão: data desc.
  const { ordenadas, ordenacao, alternar } = useDespesasOrdenadas(pendentes);

  const totalSelecionado = useMemo(
    () =>
      pendentes
        .filter((d) => selecionados.has(d.id))
        .reduce((soma, d) => soma + d.valor_calculado, 0),
    [pendentes, selecionados],
  );

  const todosMarcados =
    pendentes.length > 0 && selecionados.size === pendentes.length;
  const headerState: boolean | "indeterminate" = todosMarcados
    ? true
    : selecionados.size > 0
      ? "indeterminate"
      : false;

  function alternarTodos(marcado: boolean | "indeterminate") {
    setSelecionados(
      marcado === true ? new Set(pendentes.map((d) => d.id)) : new Set(),
    );
  }

  function alternarUm(id: string, marcado: boolean | "indeterminate") {
    setSelecionados((prev) => {
      const proximo = new Set(prev);
      if (marcado === true) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });
  }

  function pagarSelecionados() {
    const ids = [...selecionados];
    if (ids.length === 0) return;
    startTransition(async () => {
      const resultado = await marcarLotePago(ids);
      if (resultado.ok) {
        toast.success(
          resultado.atualizadas === 1
            ? "1 despesa marcada como paga."
            : `${resultado.atualizadas} despesas marcadas como pagas.`,
        );
        setSelecionados(new Set());
      } else {
        toast.error(resultado.error);
      }
    });
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Despesas Pendentes</CardTitle>
          <CardDescription>
            {pendentes.length} pendentes • {selecionados.size} selecionadas (
            {formatarBRL(totalSelecionado)})
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            {/* Download server-side (GET autenticado): todas as pendentes. */}
            <a href="/admin/fechamento/export" download>
              Exportar CSV
            </a>
          </Button>
          <Button
            disabled={selecionados.size === 0 || processando}
            onClick={pagarSelecionados}
          >
            {processando ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Marcar como Pagos"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pendentes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma despesa pendente.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={headerState}
                    onCheckedChange={alternarTodos}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                <CabecalhoOrdenavel
                  chave="usuario_nome"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                >
                  Analista
                </CabecalhoOrdenavel>
                <CabecalhoOrdenavel
                  chave="data"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                >
                  Data
                </CabecalhoOrdenavel>
                <CabecalhoOrdenavel
                  chave="tipo"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                >
                  Tipo
                </CabecalhoOrdenavel>
                <CabecalhoOrdenavel
                  chave="quantidade_km"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                >
                  KM
                </CabecalhoOrdenavel>
                <CabecalhoOrdenavel
                  chave="valor_calculado"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                >
                  Valor (R$)
                </CabecalhoOrdenavel>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((d) => {
                const marcado = selecionados.has(d.id);
                return (
                  <TableRow key={d.id} data-state={marcado ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={marcado}
                        onCheckedChange={(v) => alternarUm(d.id, v)}
                        aria-label={`Selecionar despesa de ${d.usuario_nome}`}
                      />
                    </TableCell>
                    <TableCell>
                      <AnalistaCell nome={d.usuario_nome} />
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatarData(d.data)}
                    </TableCell>
                    <TableCell>
                      <TipoBadge tipo={d.tipo} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarKm(d.quantidade_km)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatarBRL(d.valor_calculado)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
