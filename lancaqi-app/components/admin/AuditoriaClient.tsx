"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";

import { AnalistaCell } from "@/components/admin/AnalistaCell";
import { SheetAuditoria } from "@/components/admin/SheetAuditoria";
import { StatusBadge, TipoBadge } from "@/components/admin/StatusBadges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
 * Tabela de auditoria. A busca por nome do analista é SERVER-SIDE: o input
 * sincroniza o termo na URL (`?q=`, com debounce) e o Server Component refaz a
 * query com `ilike`. A lista chega já filtrada e restrita pela RLS `is_admin()`.
 */
export function AuditoriaClient({
  despesas,
  termoInicial,
}: {
  despesas: Despesa[];
  termoInicial: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filtro, setFiltro] = useState(termoInicial);
  const [buscando, startTransition] = useTransition();
  const [selecionada, setSelecionada] = useState<Despesa | null>(null);
  const [aberto, setAberto] = useState(false);

  // Última versão já refletida na URL — evita re-disparar o push em loop.
  const ultimoSincronizado = useRef(termoInicial);

  // Debounce: 350ms após parar de digitar, reflete o termo na URL → refetch.
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

  function abrir(despesa: Despesa) {
    setSelecionada(despesa);
    setAberto(true);
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Auditoria de Despesas</CardTitle>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por analista..."
            className="pl-8 pr-8"
            aria-label="Buscar por analista"
          />
          {buscando && (
            <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {despesas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {termoInicial
              ? `Nenhum analista encontrado para "${termoInicial}".`
              : "Nenhuma despesa encontrada."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Analista</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrir(d)}
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <SheetAuditoria
        despesa={selecionada}
        open={aberto}
        onOpenChange={setAberto}
      />
    </Card>
  );
}
