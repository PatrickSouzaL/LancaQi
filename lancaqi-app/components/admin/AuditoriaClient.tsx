"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Loader2, Search } from "lucide-react";

import { AnalistaCell } from "@/components/admin/AnalistaCell";
import { AuditoriaAcoes } from "@/components/admin/AuditoriaAcoes";
import { StatusBadge, TipoBadge } from "@/components/admin/StatusBadges";
import {
  ClienteCombobox,
  type OpcaoCliente,
} from "@/components/ClienteCombobox";
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
import { formatarBRL, formatarData, formatarKm, labelTipo } from "@/lib/format";
import type { ConfiguracoesTaxas, Despesa, TipoDespesa } from "@/lib/types";

const TIPOS: TipoDespesa[] = ["ESCRITORIO", "MOTO", "CARRO"];
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
}: {
  despesas: Despesa[];
  clientes: OpcaoCliente[];
  taxas: ConfiguracoesTaxas;
  termoInicial: string;
  clienteInicial: string | null;
  tipoInicial: TipoDespesa | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filtro, setFiltro] = useState(termoInicial);
  const [atualizando, startTransition] = useTransition();
  const ultimoSincronizado = useRef(termoInicial);

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

  const temFiltro =
    Boolean(termoInicial) || clienteInicial !== null || tipoInicial !== null;
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

        {/* Filtros: analista (texto), cliente (combobox), tipo (select). */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por analista..."
              className="pl-8 pr-8"
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
            />
          </div>

          <Select
            value={tipoInicial ?? TODOS}
            onValueChange={(v) =>
              aplicarFiltro({ tipo: v === TODOS ? null : v })
            }
          >
            <SelectTrigger className="h-11 w-full sm:w-44" aria-label="Tipo">
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
                <TableHead>Analista</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">KM</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesas.map((d) => (
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
