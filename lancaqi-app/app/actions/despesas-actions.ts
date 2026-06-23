"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { calcularPrevia } from "@/lib/calculo";
import { createClient } from "@/lib/supabase/server";
import type { ConfiguracoesTaxas } from "@/lib/types";

/**
 * Resultado tipado da action (consumível por `useActionState` no cliente).
 */
export type CriarDespesaState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Validação Zod da entrada. NUNCA inclui `valor_calculado` — o valor financeiro
 * é recalculado no servidor a partir de `configuracoes_taxas`.
 * Para deslocamentos até o cliente (MOTO/CARRO) a quilometragem é obrigatória.
 */
const CriarDespesaSchema = z
  .object({
    data: z.string().min(1, "Informe a data."),
    tipo: z.enum(["ESCRITORIO", "MOTO", "CARRO"]),
    origem: z.string().trim().max(255).optional(),
    destino: z.string().trim().max(255).optional(),
    quantidade_km: z.coerce
      .number()
      .min(0, "A quilometragem não pode ser negativa.")
      .optional(),
    observacao: z.string().trim().max(1000).optional(),
  })
  .refine(
    (d) =>
      d.tipo === "ESCRITORIO" ||
      (typeof d.quantidade_km === "number" && d.quantidade_km > 0),
    { path: ["quantidade_km"], message: "Informe uma quilometragem maior que zero." },
  );

/** Linha de `configuracoes_taxas` (tipagem estrita da resposta do banco). */
interface ConfiguracoesTaxasRow {
  id: number;
  valor_fixo_escritorio: number;
  taxa_km_moto: number;
  taxa_km_carro: number;
}

/**
 * Cria uma nova despesa.
 *
 * Regra arquitetural crítica (Zero Trust): o `valor_calculado` é SEMPRE refeito
 * no servidor. O cliente envia apenas tipo/km/data/origem/destino — nunca o
 * valor final. O `usuario_id` vem de `auth.getUser()`, jamais do formulário.
 */
export async function criarDespesa(
  formData: FormData,
): Promise<CriarDespesaState> {
  const supabase = await createClient();

  // 1. Autenticação — a action é acessível via POST direto; valide sempre.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("criarDespesa: usuário não autenticado.", authError?.message);
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  // 2. Validação da entrada (camada 1 — Zod).
  const parsed = CriarDespesaSchema.safeParse({
    data: formData.get("data"),
    tipo: formData.get("tipo"),
    origem: formData.get("origem") ?? undefined,
    destino: formData.get("destino") ?? undefined,
    quantidade_km: formData.get("quantidade_km") ?? undefined,
    observacao: formData.get("observacao") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const campo = String(issue.path[0] ?? "form");
      fieldErrors[campo] ??= issue.message;
    }
    return { ok: false, error: "Verifique os campos do formulário.", fieldErrors };
  }

  // `observacao` é validada mas NÃO persistida: a coluna não existe no schema
  // atual de `despesas` (ver Schema_RLS_Seguranca.md → evoluções sugeridas).
  const { data, tipo, origem, destino, quantidade_km } = parsed.data;
  const ehCliente = tipo !== "ESCRITORIO";
  const km = ehCliente ? (quantidade_km ?? 0) : 0;

  // 3. Tarifa oficial do banco (camada 2 — recálculo server-side).
  const { data: taxasRowRaw, error: taxasError } = await supabase
    .from("configuracoes_taxas")
    .select("id, valor_fixo_escritorio, taxa_km_moto, taxa_km_carro")
    .limit(1)
    .single();

  const taxasRow = taxasRowRaw as ConfiguracoesTaxasRow | null;

  if (taxasError || !taxasRow) {
    console.error("criarDespesa: falha ao ler configuracoes_taxas.", taxasError?.message);
    return { ok: false, error: "Não foi possível obter as taxas vigentes." };
  }

  // Decimais podem vir como string do PostgREST — normaliza para número.
  const taxas: ConfiguracoesTaxas = {
    id: taxasRow.id,
    valor_fixo_escritorio: Number(taxasRow.valor_fixo_escritorio),
    taxa_km_moto: Number(taxasRow.taxa_km_moto),
    taxa_km_carro: Number(taxasRow.taxa_km_carro),
  };

  const valorCalculado = calcularPrevia(tipo, km, taxas);

  // 4. Inserção. `usuario_id` deriva da sessão; `status` usa o default PENDENTE.
  // A RLS (camada 3) rejeita qualquer escrita fora de auth.uid() = usuario_id.
  const { error: insertError } = await supabase.from("despesas").insert({
    usuario_id: user.id,
    data,
    origem: ehCliente ? (origem ?? null) : null,
    destino: ehCliente ? (destino ?? null) : null,
    tipo,
    quantidade_km: ehCliente ? km : null,
    valor_calculado: valorCalculado,
  });

  if (insertError) {
    console.error("criarDespesa: falha ao inserir despesa.", insertError.message);
    return { ok: false, error: "Não foi possível registrar a despesa." };
  }

  // 5. Atualiza o cache das telas que listam despesas.
  revalidatePath("/analista/historico");
  revalidatePath("/analista/dashboard");
  revalidatePath("/admin/auditoria");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/fechamento");

  return { ok: true };
}
