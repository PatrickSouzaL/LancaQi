"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { criarCliente, editarCliente } from "@/app/actions/clientes-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Cliente } from "@/lib/types";

type Campo = "nome" | "endereco" | "cnpj" | "telefone";
type Valores = Record<Campo, string>;
type Erros = Partial<Record<Campo, string>>;

const VAZIO: Valores = { nome: "", endereco: "", cnpj: "", telefone: "" };

function valoresDe(cliente?: Cliente): Valores {
  if (!cliente) return VAZIO;
  return {
    nome: cliente.nome,
    endereco: cliente.endereco ?? "",
    cnpj: cliente.cnpj ?? "",
    telefone: cliente.telefone ?? "",
  };
}

/**
 * Formulário de criação/edição de cliente em um Sheet lateral. Reutilizável:
 * sem `cliente` → modo criação; com `cliente` → modo edição (pré-preenchido).
 * O `children` é o gatilho (botão) renderizado via `SheetTrigger asChild`.
 *
 * Validação no cliente é a 1ª camada (UX); o servidor revalida com Zod e
 * `is_admin`, e a RLS é a barreira final.
 */
export function ClienteFormSheet({
  cliente,
  children,
}: {
  cliente?: Cliente;
  children: React.ReactNode;
}) {
  const editando = cliente !== undefined;

  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<Valores>(valoresDe(cliente));
  const [erros, setErros] = useState<Erros>({});
  const [salvando, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    // Reset ao abrir (evita estado residual) — feito no handler, não em efeito.
    if (next) {
      setValores(valoresDe(cliente));
      setErros({});
    }
    setAberto(next);
  }

  function onChange(campo: Campo, valor: string) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    if (erros[campo]) setErros((prev) => ({ ...prev, [campo]: undefined }));
  }

  function validar(): Erros {
    const e: Erros = {};
    if (!valores.nome.trim()) e.nome = "Informe o nome.";
    return e;
  }

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (salvando) return;

    const novosErros = validar();
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    const fd = new FormData();
    if (editando) fd.set("id", cliente.id);
    fd.set("nome", valores.nome.trim());
    fd.set("endereco", valores.endereco.trim());
    fd.set("cnpj", valores.cnpj.trim());
    fd.set("telefone", valores.telefone.trim());

    startTransition(async () => {
      const resultado = editando
        ? await editarCliente(fd)
        : await criarCliente(fd);

      if (resultado.ok) {
        toast.success(editando ? "Cliente atualizado." : "Cliente cadastrado.");
        setAberto(false);
        return;
      }

      toast.error(resultado.error);
      if (resultado.fieldErrors) {
        setErros((prev) => ({ ...prev, ...(resultado.fieldErrors as Erros) }));
      }
    });
  }

  return (
    <Sheet open={aberto} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editando ? "Editar cliente" : "Novo cliente"}</SheetTitle>
          <SheetDescription>
            {editando
              ? "Atualize os dados do cliente."
              : "Cadastre um novo cliente. Apenas o nome é obrigatório."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="nome">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nome"
              value={valores.nome}
              onChange={(e) => onChange("nome", e.target.value)}
              placeholder="Ex.: Acme Ltda."
              className="h-11"
              autoFocus
              aria-invalid={Boolean(erros.nome)}
            />
            {erros.nome && (
              <p className="text-sm text-destructive">{erros.nome}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={valores.cnpj}
              onChange={(e) => onChange("cnpj", e.target.value)}
              placeholder="Opcional"
              className="h-11"
              aria-invalid={Boolean(erros.cnpj)}
            />
            {erros.cnpj && (
              <p className="text-sm text-destructive">{erros.cnpj}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={valores.endereco}
              onChange={(e) => onChange("endereco", e.target.value)}
              placeholder="Opcional"
              className="h-11"
              aria-invalid={Boolean(erros.endereco)}
            />
            {erros.endereco && (
              <p className="text-sm text-destructive">{erros.endereco}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              type="tel"
              value={valores.telefone}
              onChange={(e) => onChange("telefone", e.target.value)}
              placeholder="Opcional"
              className="h-11"
            />
          </div>

          <SheetFooter className="mt-auto px-0">
            <Button type="submit" disabled={salvando} className="h-11">
              {salvando ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : editando ? (
                "Salvar Alterações"
              ) : (
                "Cadastrar Cliente"
              )}
            </Button>
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={salvando}>
                Cancelar
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
