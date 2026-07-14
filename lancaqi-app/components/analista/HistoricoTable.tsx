"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import {
  CabecalhoOrdenavel,
  useDespesasOrdenadas,
} from "@/components/admin/OrdenacaoDespesas";
import { HistoricoAcoes } from "@/components/analista/HistoricoAcoes";
import {
  ClienteCombobox,
  type OpcaoCliente,
} from "@/components/ClienteCombobox";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TODOS_TIPOS } from "@/lib/despesas-tipos";
import {
  formatarBRL,
  formatarData,
  formatarKm,
  labelStatus,
  labelTipo,
} from "@/lib/format";
import type {
  ConfiguracoesTaxas,
  Despesa,
  StatusDespesa,
  TipoDespesa,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const TIPOS = TODOS_TIPOS;
const TODOS = "TODOS";

// Classes exatas das badges de status (UI_UX_Guidelines §2.3).
const STATUS_CLASSES: Record<StatusDespesa, string> = {
  PENDENTE:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  PAGO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

function StatusBadge({ status }: { status: StatusDespesa }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {labelStatus(status)}
    </span>
  );
}

/**
 * Histórico de reembolsos do analista. Responsivo: tabela em telas md+ e cards
 * empilhados no mobile (UI_UX_Guidelines §2.3). Datas/textos à esquerda;
 * KM e valores à direita com `tabular-nums`.
 *
 * Filtros combináveis (texto sobre origem/destino, cliente, tipo, período) são
 * CLIENT-SIDE: o analista já recebe todo o histórico, então filtramos em
 * memória. Os cabeçalhos são ordenáveis (mesmo ciclo do Auditoria) e a ordem
 * neutra segue a DATA da despesa, mais nova primeiro (não a ordem de criação
 * do banco).
 */
export function HistoricoTable({
  despesas,
  taxas,
  clientes,
}: {
  despesas: Despesa[];
  taxas: ConfiguracoesTaxas;
  clientes: OpcaoCliente[];
}) {
  const [termo, setTermo] = useState("");
  const [cliente, setCliente] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoDespesa | null>(null);
  const [periodo, setPeriodo] = useState<{
    de: string | null;
    ate: string | null;
  }>({ de: null, ate: null });

  const filtradas = useMemo(() => {
    const t = termo.trim().toLowerCase();
    return despesas.filter((d) => {
      if (t && !`${d.origem} ${d.destino}`.toLowerCase().includes(t))
        return false;
      if (cliente && d.cliente_id !== cliente) return false;
      if (tipo && d.tipo !== tipo) return false;
      if (periodo.de && d.data < periodo.de) return false;
      if (periodo.ate && d.data > periodo.ate) return false;
      return true;
    });
  }, [despesas, termo, cliente, tipo, periodo]);

  // Ordenação client-side (headers clicáveis). Neutro: pela DATA (desc).
  const { ordenadas, ordenacao, alternar } = useDespesasOrdenadas(filtradas);

  const temFiltro =
    termo.trim() !== "" ||
    cliente !== null ||
    tipo !== null ||
    periodo.de !== null ||
    periodo.ate !== null;

  function limparFiltros() {
    setTermo("");
    setCliente(null);
    setTipo(null);
    setPeriodo({ de: null, ate: null });
  }

  return (
    <div className="space-y-4">
      {/* Filtros: texto (origem/destino), cliente (combobox), tipo (select),
          período (range picker). Todos com a MESMA altura (h-10). */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:min-w-0 sm:flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar por origem ou destino..."
            className="h-9 pl-8"
            aria-label="Buscar por origem ou destino"
          />
        </div>

        <div className="w-full sm:w-40">
          <ClienteCombobox
            clientes={clientes}
            value={cliente}
            onChange={setCliente}
            placeholder="Todos os clientes"
            incluirTodos
            triggerClassName="h-9"
          />
        </div>

        <Select
          value={tipo ?? TODOS}
          onValueChange={(v) => setTipo(v === TODOS ? null : (v as TipoDespesa))}
        >
          <SelectTrigger className="!h-9 w-full sm:w-36" aria-label="Tipo">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os tipos</SelectItem>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {labelTipo(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Período: intervalo inclusivo [de, até] sobre a coluna `data`. */}
        <DateRangePicker
          de={periodo.de}
          ate={periodo.ate}
          onChange={setPeriodo}
          className="h-9 w-full sm:w-52"
        />

        {temFiltro && (
          <Button
            variant="ghost"
            onClick={limparFiltros}
            className="h-9 shrink-0 px-2 text-muted-foreground"
          >
            <X className="size-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      {ordenadas.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma despesa encontrada para os filtros aplicados.
        </p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <CabecalhoOrdenavel
                    chave="data"
                    ordenacao={ordenacao}
                    onOrdenar={alternar}
                    align="center"
                  >
                    Data
                  </CabecalhoOrdenavel>
                  <CabecalhoOrdenavel
                    chave="origem"
                    ordenacao={ordenacao}
                    onOrdenar={alternar}
                    align="center"
                  >
                    Origem
                  </CabecalhoOrdenavel>
                  <CabecalhoOrdenavel
                    chave="destino"
                    ordenacao={ordenacao}
                    onOrdenar={alternar}
                    align="center"
                  >
                    Destino
                  </CabecalhoOrdenavel>
                  <CabecalhoOrdenavel
                    chave="tipo"
                    ordenacao={ordenacao}
                    onOrdenar={alternar}
                    align="center"
                  >
                    Tipo
                  </CabecalhoOrdenavel>
                  <CabecalhoOrdenavel
                    chave="quantidade_km"
                    ordenacao={ordenacao}
                    onOrdenar={alternar}
                    align="center"
                  >
                    KM
                  </CabecalhoOrdenavel>
                  <CabecalhoOrdenavel
                    chave="valor_calculado"
                    ordenacao={ordenacao}
                    onOrdenar={alternar}
                    align="center"
                  >
                    Valor (R$)
                  </CabecalhoOrdenavel>
                  <CabecalhoOrdenavel
                    chave="status"
                    ordenacao={ordenacao}
                    onOrdenar={alternar}
                    align="center"
                  >
                    Status
                  </CabecalhoOrdenavel>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenadas.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-center tabular-nums">
                      {formatarData(d.data)}
                    </TableCell>
                    <TableCell className="text-center">{d.origem}</TableCell>
                    <TableCell className="text-center">{d.destino}</TableCell>
                    <TableCell className="text-center">
                      {labelTipo(d.tipo)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {formatarKm(d.quantidade_km)}
                    </TableCell>
                    <TableCell className="text-center font-medium tabular-nums text-primary">
                      {formatarBRL(d.valor_calculado)}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={d.status} />
                    </TableCell>
                    <TableCell className="text-center">
                      <HistoricoAcoes
                        despesa={d}
                        taxas={taxas}
                        clientes={clientes}
                        className="justify-center"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cada lançamento vira um card */}
          <ul className="space-y-3 md:hidden">
            {ordenadas.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium tabular-nums">
                      {formatarData(d.data)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {labelTipo(d.tipo)}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <p className="mt-2 text-sm">
                  {d.origem} <span className="text-muted-foreground">→</span>{" "}
                  {d.destino}
                </p>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatarKm(d.quantidade_km)}
                  </span>
                  <span className="text-base font-semibold tabular-nums">
                    {formatarBRL(d.valor_calculado)}
                  </span>
                </div>
                {d.status === "PENDENTE" && (
                  <div className="mt-2 border-t pt-2">
                    <HistoricoAcoes
                      despesa={d}
                      taxas={taxas}
                      clientes={clientes}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
