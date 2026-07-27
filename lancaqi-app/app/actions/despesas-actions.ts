"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  parseISO,
  subYears,
  subDays,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";

import { calcularPrevia } from "@/lib/calculo";
import {
  ehTipoValido,
  exigeCliente,
  exigeDescricao,
  permiteCliente,
  usaKm,
  usaTrajetoCliente,
  usaTrajetoTexto,
  usaValorDeclarado,
} from "@/lib/despesas-tipos";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/data/guards";
import type { ConfiguracoesTaxas, TipoDespesa } from "@/lib/types";

/**
 * Resultado tipado da action (consumível por `useActionState`/`useTransition`).
 */
export type CriarDespesaState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Validação Zod da entrada. NUNCA inclui `valor_calculado` — o valor financeiro
 * é sempre resolvido no servidor: por taxa (deslocamentos) ou copiando o
 * `valor_declarado` (despesas gerais).
 *
 * Campos condicionais por tipo (ver `lib/despesas-tipos.ts`):
 *  - `quantidade_km`  → só MOTO/CARRO (reembolso por KM).
 *  - trajeto por CLIENTE (`origem_cliente_id` + `cliente_id`) → MOTO/CARRO. Os
 *    textos `origem`/`destino` são resolvidos dos nomes oficiais em `clientes`
 *    (Zero Trust) — nunca vêm do navegador.
 *  - trajeto por TEXTO (`origem`/`destino`) → PEDAGIO/ESTACIONAMENTO/PASSAGEM.
 *  - `cliente_id` → obrigatório só em ALMOCO_CLIENTE; opcional nos demais que o
 *    permitem.
 *  - `valor_declarado` → obrigatório (> 0) nos tipos de DESPESA.
 *  - `descricao` → texto livre opcional dos tipos de DESPESA.
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
  tipo: z.custom<TipoDespesa>(
    (val) => typeof val === "string" && ehTipoValido(val),
    { message: "Tipo de despesa inválido." },
  ),
  quantidade_km: z.coerce
    .number()
    .min(0, "A quilometragem não pode ser negativa.")
    .optional(),
  valor_declarado: z.coerce
    .number()
    .min(0, "O valor não pode ser negativo.")
    .optional(),
  descricao: z.string().trim().max(1000).optional(),
  origem_cliente_id: z.string().uuid("Origem inválida.").optional(),
  cliente_id: z.string().uuid("Cliente inválido.").optional(),
  // Trajeto por texto livre (pedágio/estacionamento/passagem).
  origem: z.string().trim().max(200).optional(),
  destino: z.string().trim().max(200).optional(),
});

type DespesaCampos = z.infer<typeof DespesaCamposSchema>;

// Regras condicionais dependentes do tipo.
const exigeKmValido = (d: DespesaCampos) =>
  !usaKm(d.tipo) ||
  (typeof d.quantidade_km === "number" && d.quantidade_km > 0);
const exigeClienteObrigatorio = (d: DespesaCampos) =>
  !exigeCliente(d.tipo) || Boolean(d.cliente_id);
const exigeValorDeclarado = (d: DespesaCampos) =>
  !usaValorDeclarado(d.tipo) ||
  (typeof d.valor_declarado === "number" && d.valor_declarado > 0);
const exigeDescricaoPreenchida = (d: DespesaCampos) =>
  !exigeDescricao(d.tipo) || Boolean(d.descricao && d.descricao.length > 0);

const REFINE_KM = {
  path: ["quantidade_km"],
  message: "Informe uma quilometragem maior que zero.",
};
const REFINE_CLIENTE = {
  path: ["cliente_id"],
  message: "Selecione o cliente.",
};
const REFINE_VALOR = {
  path: ["valor_declarado"],
  message: "Informe um valor maior que zero.",
};
const REFINE_DESCRICAO = {
  path: ["descricao"],
  message: "Descreva a despesa.",
};

// Regra exclusiva da CRIAÇÃO: a data não pode ter mais de 3 dias no passado.
// (A edição continua sob a janela de 1 ano do schema base — não trava despesas
// antigas já registradas.)
const exigeCriacaoRecente = (d: DespesaCampos) => {
  try {
    const target = startOfDay(parseISO(d.data));
    const tresDiasAtras = startOfDay(subDays(new Date(), 3));
    return !isBefore(target, tresDiasAtras);
  } catch {
    return false;
  }
};
const REFINE_DATA_RECENTE = {
  path: ["data"],
  message: "A data não pode ter mais de 3 dias no passado.",
};

const CriarDespesaSchema = DespesaCamposSchema.refine(exigeKmValido, REFINE_KM)
  .refine(exigeClienteObrigatorio, REFINE_CLIENTE)
  .refine(exigeValorDeclarado, REFINE_VALOR)
  .refine(exigeDescricaoPreenchida, REFINE_DESCRICAO)
  .refine(exigeCriacaoRecente, REFINE_DATA_RECENTE);

const EditarDespesaSchema = DespesaCamposSchema.extend({
  id: z.string().uuid("Identificador inválido."),
})
  .refine(exigeKmValido, REFINE_KM)
  .refine(exigeClienteObrigatorio, REFINE_CLIENTE)
  .refine(exigeValorDeclarado, REFINE_VALOR)
  .refine(exigeDescricaoPreenchida, REFINE_DESCRICAO);

/** Linha de `configuracoes_taxas` (tipagem estrita da resposta do banco). */
interface ConfiguracoesTaxasRow {
  id: number;
  valor_fixo_escritorio: number;
  taxa_km_moto: number;
  taxa_km_carro: number;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Extrai os campos crus do FormData (comuns a criar/editar). */
function camposDoForm(formData: FormData) {
  return {
    data: formData.get("data"),
    tipo: formData.get("tipo"),
    quantidade_km: formData.get("quantidade_km") ?? undefined,
    valor_declarado: formData.get("valor_declarado") ?? undefined,
    descricao: formData.get("descricao") ?? undefined,
    origem_cliente_id: formData.get("origem_cliente_id") ?? undefined,
    cliente_id: formData.get("cliente_id") ?? undefined,
    origem: formData.get("origem") ?? undefined,
    destino: formData.get("destino") ?? undefined,
  };
}

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
 * Resolve `origem`/`destino`/`cliente_id` de acordo com o tipo:
 *
 *  - Trajeto por CLIENTE (MOTO/CARRO): origem/destino são os NOMES oficiais dos
 *    clientes selecionados (Zero Trust — buscados em `clientes`, nunca do
 *    navegador). O `cliente_id` (destino) é opcional no modelo novo.
 *  - Trajeto por TEXTO (PEDAGIO/ESTACIONAMENTO/PASSAGEM): origem/destino vêm do
 *    texto livre; `cliente_id` é opcional e independente.
 *  - Demais tipos: sem trajeto; apenas `cliente_id` quando o tipo o permite.
 *
 * Qualquer id de cliente informado é validado contra `clientes` (defesa em
 * profundidade além da FK).
 */
async function resolverTrajeto(
  supabase: SupabaseServerClient,
  dados: DespesaCampos,
): Promise<Trajeto> {
  const { tipo } = dados;

  // Ids de cliente a validar/resolver (origem só em trajeto-cliente).
  const ids = new Set<string>();
  if (usaTrajetoCliente(tipo) && dados.origem_cliente_id) {
    ids.add(dados.origem_cliente_id);
  }
  if (permiteCliente(tipo) && dados.cliente_id) {
    ids.add(dados.cliente_id);
  }

  let nomePorId = new Map<string, string>();
  if (ids.size > 0) {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome")
      .in("id", [...ids]);

    if (error) {
      console.error("resolverTrajeto: falha ao ler clientes.", error.message);
      return { ok: false, error: "Não foi possível validar os clientes." };
    }

    nomePorId = new Map(
      (data as { id: string; nome: string }[]).map((c) => [c.id, c.nome]),
    );
    for (const id of ids) {
      if (!nomePorId.has(id)) {
        return { ok: false, error: "Cliente selecionado não encontrado." };
      }
    }
  }

  let origem: string | null = null;
  let destino: string | null = null;

  if (usaTrajetoCliente(tipo)) {
    origem = dados.origem_cliente_id
      ? nomePorId.get(dados.origem_cliente_id)!
      : null;
    destino = dados.cliente_id ? nomePorId.get(dados.cliente_id)! : null;
  } else if (usaTrajetoTexto(tipo)) {
    origem = dados.origem?.trim() || null;
    destino = dados.destino?.trim() || null;
  }

  const clienteId = permiteCliente(tipo) ? (dados.cliente_id ?? null) : null;

  return { ok: true, origem, destino, clienteId };
}

/**
 * Monta os campos derivados (KM, valor, valor_declarado) comuns às três actions.
 * `valor_calculado` é a fonte única dos dashboards: nos deslocamentos vem da
 * taxa; nos tipos de despesa é o próprio valor declarado.
 */
function derivarValores(dados: DespesaCampos, taxas: ConfiguracoesTaxas) {
  const { tipo } = dados;
  const km = usaKm(tipo) ? (dados.quantidade_km ?? 0) : null;
  const valorDeclarado = usaValorDeclarado(tipo)
    ? (dados.valor_declarado ?? 0)
    : null;
  const valorCalculado = calcularPrevia(
    tipo,
    km ?? 0,
    taxas,
    valorDeclarado ?? 0,
  );
  const descricao = dados.descricao?.trim() || null;
  return { km, valorDeclarado, valorCalculado, descricao };
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

  const parsed = CriarDespesaSchema.safeParse(camposDoForm(formData));

  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: fieldErrorsDe(parsed.error),
    };
  }

  const { data, tipo } = parsed.data;

  const taxas = await lerTaxas(supabase);
  if (!taxas) {
    return { ok: false, error: "Não foi possível obter as taxas vigentes." };
  }

  const trajeto = await resolverTrajeto(supabase, parsed.data);
  if (!trajeto.ok) return { ok: false, error: trajeto.error };

  const { km, valorDeclarado, valorCalculado, descricao } = derivarValores(
    parsed.data,
    taxas,
  );

  const { error: insertError } = await supabase.from("despesas").insert({
    usuario_id: user.id,
    data,
    origem: trajeto.origem,
    destino: trajeto.destino,
    tipo,
    quantidade_km: km,
    valor_calculado: valorCalculado,
    valor_declarado: valorDeclarado,
    descricao,
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
    ...camposDoForm(formData),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: fieldErrorsDe(parsed.error),
    };
  }

  const { id, data, tipo } = parsed.data;

  const taxas = await lerTaxas(supabase);
  if (!taxas) {
    return { ok: false, error: "Não foi possível obter as taxas vigentes." };
  }

  const trajeto = await resolverTrajeto(supabase, parsed.data);
  if (!trajeto.ok) return { ok: false, error: trajeto.error };

  const { km, valorDeclarado, valorCalculado, descricao } = derivarValores(
    parsed.data,
    taxas,
  );

  const { data: atualizadas, error: updateError } = await supabase
    .from("despesas")
    .update({
      data,
      origem: trajeto.origem,
      destino: trajeto.destino,
      tipo,
      quantidade_km: km,
      valor_calculado: valorCalculado,
      valor_declarado: valorDeclarado,
      descricao,
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
// Editar despesa como ADMIN (qualquer analista; somente enquanto PENDENTE)
// ---------------------------------------------------------------------------

/**
 * Edição administrativa de despesa. Diferente de `editarDespesa`, NÃO filtra por
 * `usuario_id` (o admin pode editar o lançamento de qualquer analista), mas
 * mantém `status = 'PENDENTE'` — despesas pagas são imutáveis. O `usuario_id`
 * da linha NÃO é alterado. Autorização: `exigirAdmin` + RLS (`is_admin()`).
 */
export async function editarDespesaAdmin(
  formData: FormData,
): Promise<EditarDespesaState> {
  const ctx = await exigirAdmin();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx;

  const parsed = EditarDespesaSchema.safeParse({
    id: formData.get("id"),
    ...camposDoForm(formData),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: fieldErrorsDe(parsed.error),
    };
  }

  const { id, data, tipo } = parsed.data;

  const taxas = await lerTaxas(supabase);
  if (!taxas) {
    return { ok: false, error: "Não foi possível obter as taxas vigentes." };
  }

  const trajeto = await resolverTrajeto(supabase, parsed.data);
  if (!trajeto.ok) return { ok: false, error: trajeto.error };

  const { km, valorDeclarado, valorCalculado, descricao } = derivarValores(
    parsed.data,
    taxas,
  );

  const { data: atualizadas, error: updateError } = await supabase
    .from("despesas")
    .update({
      data,
      origem: trajeto.origem,
      destino: trajeto.destino,
      tipo,
      quantidade_km: km,
      valor_calculado: valorCalculado,
      valor_declarado: valorDeclarado,
      descricao,
      cliente_id: trajeto.clienteId,
    })
    .eq("id", id)
    .eq("status", "PENDENTE")
    .select("id");

  if (updateError) {
    console.error("editarDespesaAdmin: falha no UPDATE.", updateError.message);
    return { ok: false, error: "Não foi possível salvar as alterações." };
  }

  if (!atualizadas || atualizadas.length === 0) {
    return {
      ok: false,
      error: "Despesas pagas não podem ser editadas.",
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
