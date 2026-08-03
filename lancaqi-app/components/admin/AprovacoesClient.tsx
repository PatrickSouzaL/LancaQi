"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { aprovarLote } from "@/app/actions/admin-actions";
import {
  CabecalhoOrdenavel,
  useDespesasOrdenadas,
} from "@/components/admin/OrdenacaoDespesas";
import { AnalistaCell } from "@/components/admin/AnalistaCell";
import { AprovarDespesaButton } from "@/components/admin/AprovarDespesaButton";
import { DetalhesDespesaButton } from "@/components/admin/DetalhesDespesaButton";
import { NegarDespesaButton } from "@/components/admin/NegarDespesaButton";
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
 * Painel de Aprovações (gate do Admin). Lista as despesas PENDENTES enviadas
 * pelos analistas. Duas formas de aprovar:
 *  - Em massa: seleção por checkbox + "Aprovar selecionadas" (`aprovarLote`).
 *  - Individual: negar exige um motivo por linha (`NegarDespesaButton`).
 *
 * As decisões rodam em Server Actions que revalidam esta rota — as linhas
 * decididas somem da fila na próxima renderização. A lista de ids do cliente
 * nunca é autoritativa: o servidor só transiciona PENDENTE e a RLS `is_admin()`
 * é a barreira final. Cabeçalhos ordenáveis; ordem neutra pela DATA (desc).
 */
export function AprovacoesClient({ pendentes }: { pendentes: Despesa[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [processando, startTransition] = useTransition();

  const { ordenadas, ordenacao, alternar } = useDespesasOrdenadas(pendentes);

  const total = useMemo(
    () => pendentes.reduce((soma, d) => soma + d.valor_calculado, 0),
    [pendentes],
  );
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

  function aprovarSelecionados() {
    const ids = [...selecionados];
    if (ids.length === 0) return;
    startTransition(async () => {
      const resultado = await aprovarLote(ids);
      if (resultado.ok) {
        toast.success(
          resultado.atualizadas === 1
            ? "1 despesa aprovada."
            : `${resultado.atualizadas} despesas aprovadas.`,
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
          <CardTitle>Despesas aguardando aprovação</CardTitle>
          <CardDescription>
            {pendentes.length}{" "}
            {pendentes.length === 1 ? "pendente" : "pendentes"} •{" "}
            {formatarBRL(total)}
            {selecionados.size > 0 && (
              <>
                {" "}
                • {selecionados.size} selecionadas ({formatarBRL(totalSelecionado)}
                )
              </>
            )}
          </CardDescription>
        </div>
        {pendentes.length > 0 && (
          <Button
            disabled={selecionados.size === 0 || processando}
            onClick={aprovarSelecionados}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {processando ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Aprovando...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Aprovar selecionadas
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {pendentes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma despesa pendente de aprovação.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={headerState}
                    onCheckedChange={alternarTodos}
                    aria-label="Selecionar todas"
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
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
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
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((d) => {
                const marcado = selecionados.has(d.id);
                return (
                  <TableRow
                    key={d.id}
                    data-state={marcado ? "selected" : undefined}
                  >
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
                    <TableCell className="text-muted-foreground">
                      {d.origem}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.destino}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarKm(d.quantidade_km)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatarBRL(d.valor_calculado)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <DetalhesDespesaButton despesa={d} />
                        <AprovarDespesaButton id={d.id} nome={d.usuario_nome} />
                        <NegarDespesaButton id={d.id} nome={d.usuario_nome} />
                      </div>
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
