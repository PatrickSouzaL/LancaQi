"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Loader2, Search, X } from "lucide-react";

import { AnalistaCell } from "@/components/admin/AnalistaCell";
import { AuditoriaAcoes } from "@/components/admin/AuditoriaAcoes";
import {
  CabecalhoOrdenavel,
  useDespesasOrdenadas,
} from "@/components/admin/OrdenacaoDespesas";
import { StatusBadge, TipoBadge } from "@/components/admin/StatusBadges";
import {
  ClienteCombobox,
  type OpcaoCliente,
} from "@/components/ClienteCombobox";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatarBRL, formatarData, formatarKm, labelTipo } from "@/lib/format";
import type { ConfiguracoesTaxas, Despesa, TipoDespesa } from "@/lib/types";

const TIPOS = TODOS_TIPOS;
const TODOS = "TODOS";

/**
 * Relatório de Auditoria. Filtros combináveis (analista, cliente, tipo) são
 * SERVER-SIDE via URL (`?q=&cliente=&tipo=`): a busca textual entra com debounce
 * e as seleções refletem imediatamente. A exportação CSV usa exatamente os
 * mesmos filtros (mesma query string). Ações por linha: editar (só PENDENTE) e
 * excluir — restritas a admin pela RLS.
 */
export function AuditoriaClient({
  despesas,
  clientes,
  taxas,
  termoInicial,
  clienteInicial,
  tipoInicial,
  dataInicioInicial,
  dataFimInicial,
}: {
  despesas: Despesa[];
  clientes: OpcaoCliente[];
  taxas: ConfiguracoesTaxas;
  termoInicial: string;
  clienteInicial: string | null;
  tipoInicial: TipoDespesa | null;
  dataInicioInicial: string | null;
  dataFimInicial: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filtro, setFiltro] = useState(termoInicial);
  const [atualizando, startTransition] = useTransition();
  const ultimoSincronizado = useRef(termoInicial);

  // Ordenação client-side (headers clicáveis). Padrão: data desc.
  const { ordenadas, ordenacao, alternar } = useDespesasOrdenadas(despesas);

  /** Aplica mudanças de filtro na URL (preservando os demais params). */
  function aplicarFiltro(mudancas: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) params.set(chave, valor);
      else params.delete(chave);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  // Debounce do texto do analista (350ms) → ?q=.
  useEffect(() => {
    const termo = filtro.trim();
    if (termo === ultimoSincronizado.current) return;

    const t = setTimeout(() => {
      ultimoSincronizado.current = termo;
      const params = new URLSearchParams(searchParams.toString());
      if (termo) params.set("q", termo);
      else params.delete("q");
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    }, 350);

    return () => clearTimeout(t);
  }, [filtro, pathname, router, searchParams]);

  /** Limpa todos os filtros (texto, cliente, tipo, período) de uma vez. */
  function limparFiltros() {
    setFiltro("");
    ultimoSincronizado.current = "";
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  const temFiltro =
    Boolean(termoInicial) ||
    clienteInicial !== null ||
    tipoInicial !== null ||
    dataInicioInicial !== null ||
    dataFimInicial !== null;
  const qs = searchParams.toString();
  const exportHref = `/admin/auditoria/export${qs ? `?${qs}` : ""}`;

  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Relatório de Despesas</CardTitle>
          <Button variant="outline" asChild>
            {/* Export server-side: respeita os filtros atuais (mesma query). */}
            <a href={exportHref} download>
              <Download className="size-4" />
              Exportar CSV
            </a>
          </Button>
        </div>

        {/* Filtros: analista (texto), cliente (combobox), tipo (select),
            período (range picker). Todos os controles com a MESMA altura
            (h-10) para um alinhamento consistente. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por analista..."
              className="h-10 pl-8 pr-8"
              aria-label="Buscar por analista"
            />
            {atualizando && (
              <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="w-full sm:w-56">
            <ClienteCombobox
              clientes={clientes}
              value={clienteInicial}
              onChange={(id) => aplicarFiltro({ cliente: id })}
              placeholder="Todos os clientes"
              incluirTodos
              triggerClassName="h-10"
            />
          </div>

          <Select
            value={tipoInicial ?? TODOS}
            onValueChange={(v) =>
              aplicarFiltro({ tipo: v === TODOS ? null : v })
            }
          >
            <SelectTrigger className="!h-10 w-full sm:w-44" aria-label="Tipo">
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
            de={dataInicioInicial}
            ate={dataFimInicial}
            onChange={({ de, ate }) => aplicarFiltro({ de, ate })}
            className="h-10 w-full sm:w-64"
          />

          {temFiltro && (
            <Button
              variant="ghost"
              onClick={limparFiltros}
              className="h-10 text-muted-foreground"
            >
              <X className="size-4" />
              Limpar filtros
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {despesas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {temFiltro
              ? "Nenhuma despesa encontrada para os filtros aplicados."
              : "Nenhuma despesa encontrada."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
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
                  chave="destino"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                >
                  Destino
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
                <CabecalhoOrdenavel
                  chave="status"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                >
                  Status
                </CabecalhoOrdenavel>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((d) => (
                <TableRow key={d.id}>
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
                    {d.destino}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatarKm(d.quantidade_km)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatarBRL(d.valor_calculado)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <AuditoriaAcoes
                      despesa={d}
                      taxas={taxas}
                      clientes={clientes}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
