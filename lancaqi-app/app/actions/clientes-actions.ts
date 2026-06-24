"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirAdmin } from "@/lib/data/guards";

/**
 * Server Actions de Clientes (CRUD). Mesma disciplina das demais ações admin:
 * `exigirAdmin()` (getUser + is_admin) → Zod → operação tipada →
 * `revalidatePath`. A RLS (policy "modificacao apenas para administradores") é
 * a barreira final; a checagem aqui é defesa em profundidade e dá feedback claro.
 */

export type ClienteState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type ExcluirClienteState = { ok: true } | { ok: false; error: string };

/**
 * Validação da entrada (contrato Migracao_002). Só `nome` é obrigatório; os
 * demais são opcionais e, quando vazios, persistem como NULL.
 */
const ClienteSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome.").max(255),
  endereco: z.string().trim().max(500, "Endereço muito longo.").optional(),
  cnpj: z.string().trim().max(20, "CNPJ muito longo.").optional(),
  telefone: z.string().trim().max(30, "Telefone muito longo.").optional(),
});

/** Normaliza um campo de FormData: string vazia → undefined (vira NULL no banco). */
function campoOpcional(valor: FormDataEntryValue | null): string | undefined {
  const s = typeof valor === "string" ? valor.trim() : "";
  return s === "" ? undefined : s;
}

/** Coleta e valida os campos do formulário (compartilhado por criar/editar). */
function parseCliente(formData: FormData) {
  return ClienteSchema.safeParse({
    nome: formData.get("nome"),
    endereco: campoOpcional(formData.get("endereco")),
    cnpj: campoOpcional(formData.get("cnpj")),
    telefone: campoOpcional(formData.get("telefone")),
  });
}

/** Converte os issues do Zod no formato consumido pelo formulário. */
function fieldErrorsDe(parsed: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.issues) {
    const campo = String(issue.path[0] ?? "form");
    fieldErrors[campo] ??= issue.message;
  }
  return fieldErrors;
}

/** Payload de escrita: campos ausentes viram NULL explícito. */
function payloadDe(dados: z.infer<typeof ClienteSchema>) {
  return {
    nome: dados.nome,
    endereco: dados.endereco ?? null,
    cnpj: dados.cnpj ?? null,
    telefone: dados.telefone ?? null,
  };
}

// ---------------------------------------------------------------------------
// Criar
// ---------------------------------------------------------------------------

export async function criarCliente(formData: FormData): Promise<ClienteState> {
  const ctx = await exigirAdmin();
  if (!ctx.ok) return ctx;

  const parsed = parseCliente(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: fieldErrorsDe(parsed.error),
    };
  }

  const { error } = await ctx.supabase
    .from("clientes")
    .insert(payloadDe(parsed.data));

  if (error) {
    console.error("criarCliente: falha no INSERT.", error.message);
    return { ok: false, error: "Não foi possível cadastrar o cliente." };
  }

  revalidatePath("/admin/clientes");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Editar
// ---------------------------------------------------------------------------

export async function editarCliente(formData: FormData): Promise<ClienteState> {
  const ctx = await exigirAdmin();
  if (!ctx.ok) return ctx;

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) {
    return { ok: false, error: "Identificador inválido." };
  }

  const parsed = parseCliente(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: fieldErrorsDe(parsed.error),
    };
  }

  const { data, error } = await ctx.supabase
    .from("clientes")
    .update(payloadDe(parsed.data))
    .eq("id", id.data)
    .select("id");

  if (error) {
    console.error("editarCliente: falha no UPDATE.", error.message);
    return { ok: false, error: "Não foi possível salvar as alterações." };
  }

  if (!data || data.length === 0) {
    return { ok: false, error: "Cliente não encontrado." };
  }

  revalidatePath("/admin/clientes");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Excluir
// ---------------------------------------------------------------------------

export async function excluirCliente(
  id: string,
): Promise<ExcluirClienteState> {
  const ctx = await exigirAdmin();
  if (!ctx.ok) return ctx;

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, error: "Identificador inválido." };
  }

  const { data, error } = await ctx.supabase
    .from("clientes")
    .delete()
    .eq("id", parsedId.data)
    .select("id");

  if (error) {
    console.error("excluirCliente: falha no DELETE.", error.message);
    return { ok: false, error: "Não foi possível excluir o cliente." };
  }

  if (!data || data.length === 0) {
    return { ok: false, error: "Cliente não encontrado." };
  }

  revalidatePath("/admin/clientes");
  return { ok: true };
}
