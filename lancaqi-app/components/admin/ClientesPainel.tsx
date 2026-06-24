import { Pencil, PlusCircle, Users } from "lucide-react";

import { ClienteFormSheet } from "@/components/admin/ClienteFormSheet";
import { ExcluirClienteButton } from "@/components/admin/ExcluirClienteButton";
import { EmptyState } from "@/components/analista/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Cliente } from "@/lib/types";

/**
 * Listagem de clientes (Server Component). A interatividade vive nos componentes
 * folha client-side: `ClienteFormSheet` (criar/editar) e `ExcluirClienteButton`
 * (excluir com confirmação). Sem clientes, mostra o estado vazio com CTA.
 */
export function ClientesPainel({ clientes }: { clientes: Cliente[] }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Clientes</CardTitle>
          <CardDescription>
            {clientes.length === 1
              ? "1 cliente cadastrado"
              : `${clientes.length} clientes cadastrados`}
          </CardDescription>
        </div>
        <ClienteFormSheet>
          <Button>
            <PlusCircle className="size-4" />
            Novo Cliente
          </Button>
        </ClienteFormSheet>
      </CardHeader>
      <CardContent>
        {clientes.length === 0 ? (
          <EmptyState
            icone={Users}
            titulo="Nenhum cliente cadastrado"
            descricao="Cadastre o primeiro cliente para começar a organizar os deslocamentos."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {c.cnpj ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.endereco ?? "—"}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {c.telefone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ClienteFormSheet cliente={c}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Editar ${c.nome}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </ClienteFormSheet>
                      <ExcluirClienteButton id={c.id} nome={c.nome} />
                    </div>
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
