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
  revalidatePath("/admin/aprovacoes");
  revalidatePath("/admin/auditoria");
  revalidatePath("/admin/fechamento");
  revalidatePath("/admin/dashboard");
  revalidatePath("/analista/historico");
  revalidatePath("/analista/dashboard");
}

// ---------------------------------------------------------------------------
// 1. Gate de aprovação: aprovar (→ APROVADO) ou negar (→ NEGADO)
// ---------------------------------------------------------------------------
// O Admin decide antes do Fechamento: APROVADO entra na fila de pagamento;
// NEGADO é terminal e sai do fechamento (com motivo registrado). Cada decisão
// grava um registro imutável em `despesas_aprovacoes` (trilha de auditoria).
// Ver `_docs/02-Architecture/feature_expense_approval.md`.

const IdSchema = z.string().uuid("Identificador inválido.");

const NegarSchema = z.object({
  id: z.string().uuid("Identificador inválido."),
  motivo: z
    .string()
    .trim()
    .min(1, "Informe o motivo da negação.")
    .max(1000, "O motivo deve ter no máximo 1000 caracteres."),
});

export async function aprovarDespesa(id: string): Promise<ActionState> {
  const ctx = await exigirAdmin();
  if (!ctx.ok) return ctx;

  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) {
    return { ok: false, error: "Identificador inválido." };
  }

  // Só transiciona PENDENTE → APROVADO (idempotente; não "reabre" nada). O
  // `select("id")` confirma se a linha realmente mudou antes de logar a decisão.
  const { data, error } = await ctx.supabase
    .from("despesas")
    .update({
      status: "APROVADO",
      aprovador_id: ctx.userId,
      decidido_em: new Date().toISOString(),
    })
    .eq("id", parsed.data)
    .eq("status", "PENDENTE")
    .select("id");

  if (error) {
    console.error("aprovarDespesa: falha no UPDATE.", error.message);
    return { ok: false, error: "Não foi possível aprovar a despesa." };
  }

  const alterou = (data as { id: string }[] | null)?.length ?? 0;
  if (alterou === 0) {
    return { ok: false, error: "A despesa não está mais pendente." };
  }

  // Trilha de auditoria (a RLS restringe o INSERT a is_admin()).
  const { error: logError } = await ctx.supabase
    .from("despesas_aprovacoes")
    .insert({
      despesa_id: parsed.data,
      aprovador_id: ctx.userId,
      acao: "APROVADA",
    });
  if (logError) {
    console.error("aprovarDespesa: falha ao registrar auditoria.", logError.message);
  }

  revalidarDespesas();
  return { ok: true, message: "Despesa aprovada." };
}

export async function negarDespesa(
  id: string,
  motivo: string,
): Promise<ActionState> {
  const ctx = await exigirAdmin();
  if (!ctx.ok) return ctx;

  const parsed = NegarSchema.safeParse({ id, motivo });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  // Só transiciona PENDENTE → NEGADO. O motivo é gravado como texto puro
  // (parametrizado pelo PostgREST — sem concatenação de SQL). A renderização no
  // histórico usa escape do React (sem HTML), fechando o vetor de XSS.
  const { data, error } = await ctx.supabase
    .from("despesas")
    .update({
      status: "NEGADO",
      motivo_negacao: parsed.data.motivo,
      aprovador_id: ctx.userId,
      decidido_em: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("status", "PENDENTE")
    .select("id");

  if (error) {
    console.error("negarDespesa: falha no UPDATE.", error.message);
    return { ok: false, error: "Não foi possível negar a despesa." };
  }

  const alterou = (data as { id: string }[] | null)?.length ?? 0;
  if (alterou === 0) {
    return { ok: false, error: "A despesa não está mais pendente." };
  }

  const { error: logError } = await ctx.supabase
    .from("despesas_aprovacoes")
    .insert({
      despesa_id: parsed.data.id,
      aprovador_id: ctx.userId,
      acao: "NEGADA",
      motivo: parsed.data.motivo,
    });
  if (logError) {
    console.error("negarDespesa: falha ao registrar auditoria.", logError.message);
  }

  revalidarDespesas();
  return { ok: true, message: "Despesa negada." };
}

export async function reverterAprovacao(id: string): Promise<ActionState> {
  const ctx = await exigirAdmin();
  if (!ctx.ok) return ctx;

  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) {
    return { ok: false, error: "Identificador inválido." };
  }

  // Desfaz uma aprovação acidental: só APROVADO → PENDENTE (volta à fila e
  // sai do fechamento). Não toca em PAGO/NEGADO. Limpa a decisão anterior.
  const { data, error } = await ctx.supabase
    .from("despesas")
    .update({ status: "PENDENTE", aprovador_id: null, decidido_em: null })
    .eq("id", parsed.data)
    .eq("status", "APROVADO")
    .select("id");

  if (error) {
    console.error("reverterAprovacao: falha no UPDATE.", error.message);
    return { ok: false, error: "Não foi possível reverter a aprovação." };
  }

  const alterou = (data as { id: string }[] | null)?.length ?? 0;
  if (alterou === 0) {
    return { ok: false, error: "A despesa não está aprovada." };
  }

  // Registra a reversão na trilha (requer `REVERTIDA` no CHECK — Migracao_006).
  // Defensivo: se a migração ainda não rodou, o INSERT falha e apenas logamos —
  // a reversão em si já foi aplicada.
  const { error: logError } = await ctx.supabase
    .from("despesas_aprovacoes")
    .insert({
      despesa_id: parsed.data,
      aprovador_id: ctx.userId,
      acao: "REVERTIDA",
    });
  if (logError) {
    console.error(
      "reverterAprovacao: falha ao registrar auditoria.",
      logError.message,
    );
  }

  revalidarDespesas();
  return { ok: true, message: "Aprovação revertida." };
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

  // Os ids do cliente NÃO são autoritativos: o filtro `status='APROVADO'`
  // garante que só despesas aprovadas (que passaram pelo gate) sejam pagas; a
  // RLS `is_admin()` é a barreira final. `select()` devolve as linhas
  // efetivamente afetadas para contagem real.
  const { data, error } = await ctx.supabase
    .from("despesas")
    .update({ status: "PAGO" })
    .in("id", parsed.data)
    .eq("status", "APROVADO")
    .select("id");

  if (error) {
    console.error("marcarLotePago: falha no UPDATE em lote.", error.message);
    return { ok: false, error: "Não foi possível concluir o pagamento." };
  }

  revalidarDespesas();
  return { ok: true, atualizadas: (data as { id: string }[] | null)?.length ?? 0 };
}

// ---------------------------------------------------------------------------
// 2b. Aprovar várias despesas de uma vez (gate em lote na aba Aprovações)
// ---------------------------------------------------------------------------

export async function aprovarLote(ids: string[]): Promise<MarcarLoteState> {
  const ctx = await exigirAdmin();
  if (!ctx.ok) return ctx;

  const parsed = IdsSchema.safeParse(ids);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Seleção inválida.",
    };
  }

  const agora = new Date().toISOString();

  // Só PENDENTE → APROVADO (o filtro de estado ignora ids já decididos). O
  // `select("id")` devolve as que realmente mudaram — base para a contagem e
  // para a trilha de auditoria (um registro por decisão). RLS é a barreira final.
  const { data, error } = await ctx.supabase
    .from("despesas")
    .update({
      status: "APROVADO",
      aprovador_id: ctx.userId,
      decidido_em: agora,
    })
    .in("id", parsed.data)
    .eq("status", "PENDENTE")
    .select("id");

  if (error) {
    console.error("aprovarLote: falha no UPDATE em lote.", error.message);
    return { ok: false, error: "Não foi possível aprovar as despesas." };
  }

  const aprovadas = (data as { id: string }[] | null) ?? [];
  if (aprovadas.length > 0) {
    const { error: logError } = await ctx.supabase
      .from("despesas_aprovacoes")
      .insert(
        aprovadas.map((d) => ({
          despesa_id: d.id,
          aprovador_id: ctx.userId,
          acao: "APROVADA" as const,
        })),
      );
    if (logError) {
      console.error(
        "aprovarLote: falha ao registrar auditoria em lote.",
        logError.message,
      );
    }
  }

  revalidarDespesas();
  return { ok: true, atualizadas: aprovadas.length };
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
