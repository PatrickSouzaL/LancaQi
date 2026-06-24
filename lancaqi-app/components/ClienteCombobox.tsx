"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface OpcaoCliente {
  id: string;
  nome: string;
}

/**
 * Combobox de cliente com busca: digita → filtra resultados parecidos
 * (case-insensitive); o valor só pode ser definido SELECIONANDO um item da
 * lista (não aceita texto livre). Sem correspondência, mostra "Não encontrado".
 *
 * Componente controlado: `value` é o id do cliente selecionado (ou null).
 * Sem dependências novas — usa apenas Popover + Input já presentes.
 */
export function ClienteCombobox({
  clientes,
  value,
  onChange,
  placeholder = "Selecione um cliente",
  id,
  invalid = false,
  disabled = false,
  incluirTodos = false,
  labelTodos = "Todos os clientes",
}: {
  clientes: OpcaoCliente[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** Mostra uma opção "todos" (limpa o filtro → onChange(null)). Uso em filtros. */
  incluirTodos?: boolean;
  labelTodos?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");

  const selecionado = clientes.find((c) => c.id === value) ?? null;

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter((c) => c.nome.toLowerCase().includes(termo));
  }, [clientes, busca]);

  function onOpenChange(next: boolean) {
    if (next) setBusca(""); // reset da busca ao abrir (handler, não efeito)
    setAberto(next);
  }

  function escolher(novoValor: string | null) {
    onChange(novoValor);
    setAberto(false);
  }

  return (
    <Popover open={aberto} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          aria-invalid={invalid}
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between px-3 font-normal",
            !selecionado && "text-muted-foreground",
            invalid && "border-destructive focus-visible:ring-destructive/20",
          )}
        >
          <span className="truncate">
            {selecionado ? selecionado.nome : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar cliente..."
              className="h-9 pl-8"
              aria-label="Pesquisar cliente"
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {incluirTodos && busca.trim() === "" && (
            <button
              type="button"
              onClick={() => escolher(null)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                value === null && "bg-accent",
              )}
            >
              <span className="truncate">{labelTodos}</span>
              {value === null && (
                <Check className="size-4 shrink-0 text-primary" />
              )}
            </button>
          )}
          {filtrados.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Não encontrado.
            </p>
          ) : (
            filtrados.map((opcao) => (
              <button
                key={opcao.id}
                type="button"
                onClick={() => escolher(opcao.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                  opcao.id === value && "bg-accent",
                )}
              >
                <span className="truncate">{opcao.nome}</span>
                {opcao.id === value && (
                  <Check className="size-4 shrink-0 text-primary" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
