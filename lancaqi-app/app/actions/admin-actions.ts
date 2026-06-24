"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirAdmin } from "@/lib/data/guards";

/**
 * Server Actions administrativas. Mesma disciplina de `criarDespesa`:
 * `getUser()` → autorização (`is_admin`) → Zod → operação tipada →
 * `revalidatePath`. São endpoints POST públicos: NUNCA confiar no cliente.
 *
 * A RLS é a barreira final (policies `is_admin()` em `despesas`/
 * `configuracoes_taxas`); a checagem aqui (`exigirAdmin`) é defesa em
 * profundidade e dá feedback claro em vez de um erro de RLS opaco.
 */

export type ActionState =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/** Revalida todas as telas afetadas por uma mudança de status de despesa. */
function revalidarDespesas() {
  revalidatePath("/admin/auditoria");
  revalidatePath("/admin/fechamento");
  revalidatePath("/admin/dashboard");
  revalidatePath("/analista/historico");
  revalidatePath("/analista/dashboard");
}

// ---------------------------------------------------------------------------
// 1. Aprovar uma despesa (status → PAGO)
// ---------------------------------------------------------------------------

const IdSchema = z.string().uuid("Identificador inválido.");

export async function aprovarDespesa(id: string): Promise<ActionState> {
  const ctx = await exigirAdmin();
  if (!ctx.ok) return ctx;

  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) {
    return { ok: false, error: "Identificador inválido." };
  }

  // Só transiciona pendentes → pagas (idempotente; não "reabre" nada).
  const { error } = await ctx.supabase
    .from("despesas")
    .update({ status: "PAGO" })
    .eq("id", parsed.data)
    .eq("status", "PENDENTE");

  if (error) {
    console.error("aprovarDespesa: falha no UPDATE.", error.message);
    return { ok: false, error: "Não foi possível aprovar a despesa." };
  }

  revalidarDespesas();
  return { ok: true, message: "Despesa aprovada." };
}

// ---------------------------------------------------------------------------
// 2. Marcar várias despesas como PAGO (fechamento em lote)
// ---------------------------------------------------------------------------

const IdsSchema = z
  .array(z.string().uuid())
  .min(1, "Selecione ao menos uma despesa.")
  .max(1000, "Seleção muito grande.");

export type MarcarLoteState =
  | { ok: true; atualizadas: number }
  | { ok: false; error: string };

export async function marcarLotePago(
  ids: string[],
): Promise<MarcarLoteState> {
  const ctx = await exigirAdmin();
  if (!ctx.ok) return ctx;

  const parsed = IdsSchema.safeParse(ids);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Seleção inválida.",
    };
  }

  // Os ids do cliente NÃO são autoritativos: o filtro `status='PENDENTE'`
  // garante que só pendentes mudem; a RLS `is_admin()` é a barreira final.
  // `select()` devolve as linhas efetivamente afetadas para contagem real.
  const { data, error } = await ctx.supabase
    .from("despesas")
    .update({ status: "PAGO" })
    .in("id", parsed.data)
    .eq("status", "PENDENTE")
    .select("id");

  if (error) {
    console.error("marcarLotePago: falha no UPDATE em lote.", error.message);
    return { ok: false, error: "Não foi possível concluir o pagamento." };
  }

  revalidarDespesas();
  return { ok: true, atualizadas: (data as { id: string }[] | null)?.length ?? 0 };
}

// ---------------------------------------------------------------------------
// 3. Salvar as taxas de reembolso (UPDATE na linha única; nunca INSERT)
// ---------------------------------------------------------------------------

const TaxasSchema = z.object({
  valor_fixo_escritorio: z.coerce
    .number()
    .min(0, "O valor não pode ser negativo.")
    .finite(),
  taxa_km_moto: z.coerce
    .number()
    .min(0, "O valor não pode ser negativo.")
    .finite(),
  taxa_km_carro: z.coerce
    .number()
    .min(0, "O valor não pode ser negativo.")
    .finite(),
});

export type SalvarTaxasState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function salvarTaxas(
  formData: FormData,
): Promise<SalvarTaxasState> {
  const ctx = await exigirAdmin();
  if (!ctx.ok) return ctx;

  const parsed = TaxasSchema.safeParse({
    valor_fixo_escritorio: formData.get("valor_fixo_escritorio"),
    taxa_km_moto: formData.get("taxa_km_moto"),
    taxa_km_carro: formData.get("taxa_km_carro"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const campo = String(issue.path[0] ?? "form");
      fieldErrors[campo] ??= issue.message;
    }
    return { ok: false, error: "Verifique os valores informados.", fieldErrors };
  }

  // Tabela single-row: descobrimos o id da linha existente e atualizamos por
  // ele — jamais INSERT (mantém a unicidade garantida pelo schema).
  const { data: existente, error: leituraError } = await ctx.supabase
    .from("configuracoes_taxas")
    .select("id")
    .limit(1)
    .single();

  const linha = existente as { id: number } | null;
  if (leituraError || !linha) {
    console.error(
      "salvarTaxas: linha de configuracoes_taxas não encontrada.",
      leituraError?.message,
    );
    return { ok: false, error: "Não foi possível localizar as taxas vigentes." };
  }

  const { error: updateError } = await ctx.supabase
    .from("configuracoes_taxas")
    .update(parsed.data)
    .eq("id", linha.id);

  if (updateError) {
    console.error("salvarTaxas: falha no UPDATE.", updateError.message);
    return { ok: false, error: "Não foi possível salvar as configurações." };
  }

  // As taxas alimentam a prévia do formulário e o recálculo de novas despesas.
  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/lancamento");
  revalidatePath("/analista/lancamento");

  return { ok: true };
}
