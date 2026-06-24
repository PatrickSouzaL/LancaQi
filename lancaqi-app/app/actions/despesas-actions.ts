"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseISO, subYears, isAfter, isBefore, startOfDay } from "date-fns";

import { calcularPrevia } from "@/lib/calculo";
import { createClient } from "@/lib/supabase/server";
import type { ConfiguracoesTaxas } from "@/lib/types";

/**
 * Resultado tipado da action (consumível por `useActionState`/`useTransition`).
 */
export type CriarDespesaState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Validação Zod da entrada. NUNCA inclui `valor_calculado` — o valor financeiro
 * é recalculado no servidor a partir de `configuracoes_taxas`.
 *
 * Para deslocamentos até o cliente (MOTO/CARRO): km > 0, e origem/cliente são
 * SELECIONADOS por id (`origem_cliente_id` e `cliente_id`). Os textos
 * `origem`/`destino` NÃO vêm do cliente — são resolvidos no servidor a partir
 * dos nomes oficiais em `clientes` (Zero Trust).
 */
const DespesaCamposSchema = z.object({
  data: z
    .string()
    .min(1, "Informe a data.")
    .refine(
      (val) => {
        try {
          const parsedDate = parseISO(val);
          if (isNaN(parsedDate.getTime())) return false;
          const today = startOfDay(new Date());
          const oneYearAgo = startOfDay(subYears(new Date(), 1));
          const target = startOfDay(parsedDate);
          return !isAfter(target, today) && !isBefore(target, oneYearAgo);
        } catch {
          return false;
        }
      },
      {
        message:
          "A data não pode ser no futuro e deve ter no máximo 1 ano para trás.",
      },
    ),
  tipo: z.enum(["ESCRITORIO", "MOTO", "CARRO"]),
  quantidade_km: z.coerce
    .number()
    .min(0, "A quilometragem não pode ser negativa.")
    .optional(),
  observacao: z.string().trim().max(1000).optional(),
  origem_cliente_id: z.string().uuid("Origem inválida.").optional(),
  cliente_id: z.string().uuid("Cliente inválido.").optional(),
});

type DespesaCampos = z.infer<typeof DespesaCamposSchema>;

const ehDeslocamento = (d: { tipo: string }) => d.tipo !== "ESCRITORIO";

// Regras condicionais (só exigidas em MOTO/CARRO).
const exigeKmValido = (d: DespesaCampos) =>
  !ehDeslocamento(d) ||
  (typeof d.quantidade_km === "number" && d.quantidade_km > 0);
const exigeOrigem = (d: DespesaCampos) =>
  !ehDeslocamento(d) || Boolean(d.origem_cliente_id);
const exigeCliente = (d: DespesaCampos) =>
  !ehDeslocamento(d) || Boolean(d.cliente_id);

const REFINE_KM = {
  path: ["quantidade_km"],
  message: "Informe uma quilometragem maior que zero.",
};
const REFINE_ORIGEM = {
  path: ["origem_cliente_id"],
  message: "Selecione a origem.",
};
const REFINE_CLIENTE = {
  path: ["cliente_id"],
  message: "Selecione o cliente.",
};

const CriarDespesaSchema = DespesaCamposSchema.refine(exigeKmValido, REFINE_KM)
  .refine(exigeOrigem, REFINE_ORIGEM)
  .refine(exigeCliente, REFINE_CLIENTE);

const EditarDespesaSchema = DespesaCamposSchema.extend({
  id: z.string().uuid("Identificador inválido."),
})
  .refine(exigeKmValido, REFINE_KM)
  .refine(exigeOrigem, REFINE_ORIGEM)
  .refine(exigeCliente, REFINE_CLIENTE);

/** Linha de `configuracoes_taxas` (tipagem estrita da resposta do banco). */
interface ConfiguracoesTaxasRow {
  id: number;
  valor_fixo_escritorio: number;
  taxa_km_moto: number;
  taxa_km_carro: number;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Converte os issues do Zod no formato consumido pelo formulário. */
function fieldErrorsDe(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? "form");
    fieldErrors[campo] ??= issue.message;
  }
  return fieldErrors;
}

/** Lê a tarifa vigente (linha única) e normaliza os decimais para number. */
async function lerTaxas(
  supabase: SupabaseServerClient,
): Promise<ConfiguracoesTaxas | null> {
  const { data, error } = await supabase
    .from("configuracoes_taxas")
    .select("id, valor_fixo_escritorio, taxa_km_moto, taxa_km_carro")
    .limit(1)
    .single();

  const row = data as ConfiguracoesTaxasRow | null;
  if (error || !row) {
    console.error("lerTaxas: falha ao ler configuracoes_taxas.", error?.message);
    return null;
  }
  return {
    id: row.id,
    valor_fixo_escritorio: Number(row.valor_fixo_escritorio),
    taxa_km_moto: Number(row.taxa_km_moto),
    taxa_km_carro: Number(row.taxa_km_carro),
  };
}

type Trajeto =
  | { ok: true; origem: string | null; destino: string | null; clienteId: string | null }
  | { ok: false; error: string };

/**
 * Resolve origem/destino/cliente_id a partir dos ids selecionados — Zero Trust:
 * os nomes vêm dos registros oficiais em `clientes`, nunca do cliente. Em
 * ESCRITORIO não há trajeto. Para MOTO/CARRO, ambos os ids devem existir.
 */
async function resolverTrajeto(
  supabase: SupabaseServerClient,
  dados: DespesaCampos,
): Promise<Trajeto> {
  if (!ehDeslocamento(dados)) {
    return { ok: true, origem: null, destino: null, clienteId: null };
  }

  const origemId = dados.origem_cliente_id!;
  const clienteId = dados.cliente_id!;
  const ids = Array.from(new Set([origemId, clienteId]));

  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome")
    .in("id", ids);

  if (error) {
    console.error("resolverTrajeto: falha ao ler clientes.", error.message);
    return { ok: false, error: "Não foi possível validar os clientes." };
  }

  const mapa = new Map(
    (data as { id: string; nome: string }[]).map((c) => [c.id, c.nome]),
  );
  const origem = mapa.get(origemId);
  const destino = mapa.get(clienteId);

  if (!origem || !destino) {
    return { ok: false, error: "Cliente selecionado não encontrado." };
  }

  return { ok: true, origem, destino, clienteId };
}

/** Revalida todas as telas que listam/agregam despesas. */
function revalidarListagens() {
  revalidatePath("/analista/historico");
  revalidatePath("/analista/dashboard");
  revalidatePath("/admin/auditoria");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/fechamento");
}

// ---------------------------------------------------------------------------
// Criar despesa
// ---------------------------------------------------------------------------

/**
 * Cria uma nova despesa. Zero Trust: `valor_calculado` é refeito no servidor;
 * `usuario_id` vem da sessão; origem/destino são os nomes oficiais dos clientes
 * selecionados. A RLS rejeita escrita fora de `auth.uid() = usuario_id`.
 */
export async function criarDespesa(
  formData: FormData,
): Promise<CriarDespesaState> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("criarDespesa: usuário não autenticado.", authError?.message);
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = CriarDespesaSchema.safeParse({
    data: formData.get("data"),
    tipo: formData.get("tipo"),
    quantidade_km: formData.get("quantidade_km") ?? undefined,
    observacao: formData.get("observacao") ?? undefined,
    origem_cliente_id: formData.get("origem_cliente_id") ?? undefined,
    cliente_id: formData.get("cliente_id") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: fieldErrorsDe(parsed.error),
    };
  }

  const { data, tipo, quantidade_km } = parsed.data;
  const ehCliente = ehDeslocamento(parsed.data);
  const km = ehCliente ? (quantidade_km ?? 0) : 0;

  const taxas = await lerTaxas(supabase);
  if (!taxas) {
    return { ok: false, error: "Não foi possível obter as taxas vigentes." };
  }

  const trajeto = await resolverTrajeto(supabase, parsed.data);
  if (!trajeto.ok) return { ok: false, error: trajeto.error };

  const valorCalculado = calcularPrevia(tipo, km, taxas);

  const { error: insertError } = await supabase.from("despesas").insert({
    usuario_id: user.id,
    data,
    origem: trajeto.origem,
    destino: trajeto.destino,
    tipo,
    quantidade_km: ehCliente ? km : null,
    valor_calculado: valorCalculado,
    cliente_id: trajeto.clienteId,
  });

  if (insertError) {
    console.error("criarDespesa: falha ao inserir despesa.", insertError.message);
    return { ok: false, error: "Não foi possível registrar a despesa." };
  }

  revalidarListagens();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Editar despesa (analista; somente a própria e enquanto PENDENTE)
// ---------------------------------------------------------------------------

export type EditarDespesaState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Edita uma despesa do próprio analista. Mesmo rigor de `criarDespesa`. Os
 * filtros `usuario_id = auth.uid()` + `status = 'PENDENTE'` garantem que só a
 * dona edite, e só enquanto pendente (a RLS é a barreira final).
 */
export async function editarDespesa(
  formData: FormData,
): Promise<EditarDespesaState> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = EditarDespesaSchema.safeParse({
    id: formData.get("id"),
    data: formData.get("data"),
    tipo: formData.get("tipo"),
    quantidade_km: formData.get("quantidade_km") ?? undefined,
    observacao: formData.get("observacao") ?? undefined,
    origem_cliente_id: formData.get("origem_cliente_id") ?? undefined,
    cliente_id: formData.get("cliente_id") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: fieldErrorsDe(parsed.error),
    };
  }

  const { id, data, tipo, quantidade_km } = parsed.data;
  const ehCliente = ehDeslocamento(parsed.data);
  const km = ehCliente ? (quantidade_km ?? 0) : 0;

  const taxas = await lerTaxas(supabase);
  if (!taxas) {
    return { ok: false, error: "Não foi possível obter as taxas vigentes." };
  }

  const trajeto = await resolverTrajeto(supabase, parsed.data);
  if (!trajeto.ok) return { ok: false, error: trajeto.error };

  const valorCalculado = calcularPrevia(tipo, km, taxas);

  const { data: atualizadas, error: updateError } = await supabase
    .from("despesas")
    .update({
      data,
      origem: trajeto.origem,
      destino: trajeto.destino,
      tipo,
      quantidade_km: ehCliente ? km : null,
      valor_calculado: valorCalculado,
      cliente_id: trajeto.clienteId,
    })
    .eq("id", id)
    .eq("usuario_id", user.id)
    .eq("status", "PENDENTE")
    .select("id");

  if (updateError) {
    console.error("editarDespesa: falha no UPDATE.", updateError.message);
    return { ok: false, error: "Não foi possível salvar as alterações." };
  }

  if (!atualizadas || atualizadas.length === 0) {
    return {
      ok: false,
      error: "Esta despesa não pode mais ser editada (já paga ou inexistente).",
    };
  }

  revalidarListagens();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Excluir despesa (analista: a própria enquanto PENDENTE; admin: qualquer uma)
// ---------------------------------------------------------------------------

export type ExcluirDespesaState = { ok: true } | { ok: false; error: string };

/**
 * Exclui uma despesa. A autorização efetiva é da RLS:
 *  - analista: DELETE só da própria e enquanto `PENDENTE`;
 *  - admin (`is_admin()`): DELETE de qualquer uma.
 * Aqui validamos apenas o formato do id e damos feedback claro.
 */
export async function excluirDespesa(
  id: string,
): Promise<ExcluirDespesaState> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, error: "Identificador inválido." };
  }

  const { data: removidas, error } = await supabase
    .from("despesas")
    .delete()
    .eq("id", parsedId.data)
    .select("id");

  if (error) {
    console.error("excluirDespesa: falha no DELETE.", error.message);
    return { ok: false, error: "Não foi possível excluir a despesa." };
  }

  if (!removidas || removidas.length === 0) {
    return { ok: false, error: "Você não pode excluir esta despesa." };
  }

  revalidarListagens();
  return { ok: true };
}
