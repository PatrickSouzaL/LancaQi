"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

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
 * Tabela de auditoria com busca por nome do analista (case-insensitive) e
 * Sheet de detalhes ao clicar em "Ver".
 *
 * Nesta iteração o filtro roda sobre o array mockado recebido por props. No
 * alvo, a busca deve ir como `ilike` server-side (não filtrar no cliente) e a
 * lista chega já restrita pela RLS `is_admin()`.
 */
export function AuditoriaClient({ despesas }: { despesas: Despesa[] }) {
  const [filtro, setFiltro] = useState("");
  const [selecionada, setSelecionada] = useState<Despesa | null>(null);
  const [aberto, setAberto] = useState(false);

  const filtradas = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (!termo) return despesas;
    return despesas.filter((d) =>
      d.usuario_nome.toLowerCase().includes(termo),
    );
  }, [despesas, filtro]);

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
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filtradas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {filtro.trim()
              ? `Nenhum analista encontrado para "${filtro.trim()}".`
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
              {filtradas.map((d) => (
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
