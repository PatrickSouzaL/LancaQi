/**
 * Fonte única de verdade dos TIPOS DE DESPESA e das regras de campo por tipo.
 *
 * O LançaQi deixou de ser só deslocamentos: além dos originais (ESCRITORIO,
 * MOTO, CARRO) existem agora despesas gerais (pedágio, hospedagem, etc.). Cada
 * tipo habilita um subconjunto de campos — este módulo é o de/para consumido
 * por Zod (servidor), pelo formulário (cliente) e pelas telas de leitura.
 *
 * Categorias:
 *  - DESLOCAMENTO → tipos originais (valor por KM ou fixo de escritório).
 *  - DESPESA      → tipos novos (valor DECLARADO pelo usuário).
 *
 * ⚠️ Só existem para controle/legibilidade. O que decide os campos e o cálculo
 * são os PREDICADOS abaixo (não a categoria diretamente).
 */
import type { CategoriaDespesa, TipoDespesa } from "@/lib/types";

/** Tipos originais (reembolso por KM ou valor fixo). */
export const TIPOS_DESLOCAMENTO = ["ESCRITORIO", "MOTO", "CARRO"] as const;

/** Tipos novos de gestão de despesas (reembolso pelo valor declarado). */
export const TIPOS_DESPESA = [
  "PEDAGIO",
  "ESTACIONAMENTO",
  "ALIMENTACAO_EXTERNA",
  "ALMOCO_CLIENTE",
  "LICENCA_SOFTWARE",
  "EQUIPAMENTO",
  "HOSPEDAGEM",
  "PASSAGEM",
] as const;

/** Todos os tipos válidos (constraint CHECK do banco espelha esta lista). */
export const TODOS_TIPOS: readonly TipoDespesa[] = [
  ...TIPOS_DESLOCAMENTO,
  ...TIPOS_DESPESA,
];

/** `true` se o valor é literalmente informado por `string`. */
export function ehTipoValido(valor: string): valor is TipoDespesa {
  return (TODOS_TIPOS as readonly string[]).includes(valor);
}

/** Categoria (apenas apresentação / encadeamento de selects). */
export function categoriaDe(tipo: TipoDespesa): CategoriaDespesa {
  return (TIPOS_DESLOCAMENTO as readonly string[]).includes(tipo)
    ? "DESLOCAMENTO"
    : "DESPESA";
}

// ---------------------------------------------------------------------------
// Predicados de campo (regras de negócio — Zod e formulário compartilham).
// ---------------------------------------------------------------------------

/** Quilometragem: só CARRO e MOTO (reembolso por KM). */
export function usaKm(tipo: TipoDespesa): boolean {
  return tipo === "MOTO" || tipo === "CARRO";
}

/**
 * Trajeto via CLIENTE (combobox): MOTO/CARRO. Origem e destino são resolvidos
 * a partir dos nomes oficiais em `clientes` (Zero Trust do modelo antigo).
 */
export function usaTrajetoCliente(tipo: TipoDespesa): boolean {
  return usaKm(tipo);
}

/**
 * Trajeto via TEXTO livre: PEDAGIO, ESTACIONAMENTO e PASSAGEM (rota de pedágio,
 * local do estacionamento, origem/destino da passagem). Não são clientes.
 */
export function usaTrajetoTexto(tipo: TipoDespesa): boolean {
  return (
    tipo === "PEDAGIO" || tipo === "ESTACIONAMENTO" || tipo === "PASSAGEM"
  );
}

/** Cliente OBRIGATÓRIO: apenas ALMOCO_CLIENTE. */
export function exigeCliente(tipo: TipoDespesa): boolean {
  return tipo === "ALMOCO_CLIENTE";
}

/**
 * Cliente PERMITIDO (obrigatório ou opcional): KM (Moto/Carro), Pedágio,
 * Estacionamento, Hospedagem, Passagem e Almoço com Cliente. Nos tipos de
 * deslocamento (MOTO/CARRO) o cliente é também o destino do trajeto.
 */
export function permiteCliente(tipo: TipoDespesa): boolean {
  return (
    usaTrajetoCliente(tipo) ||
    exigeCliente(tipo) ||
    tipo === "PEDAGIO" ||
    tipo === "ESTACIONAMENTO" ||
    tipo === "HOSPEDAGEM" ||
    tipo === "PASSAGEM"
  );
}

/**
 * Cliente AVULSO (combobox próprio, separado do trajeto): tipos de DESPESA que
 * aceitam cliente mas não usam o trajeto-cliente do modelo antigo.
 */
export function usaClienteAvulso(tipo: TipoDespesa): boolean {
  return permiteCliente(tipo) && !usaTrajetoCliente(tipo);
}

/**
 * Valor DECLARADO pelo usuário: todos os tipos novos (DESPESA). Nos de
 * deslocamento o valor é calculado (KM × taxa ou fixo do escritório).
 */
export function usaValorDeclarado(tipo: TipoDespesa): boolean {
  return categoriaDe(tipo) === "DESPESA";
}

/** Descrição (texto livre p/ detalhar hotel, item, motivo): tipos de DESPESA. */
export function usaDescricao(tipo: TipoDespesa): boolean {
  return categoriaDe(tipo) === "DESPESA";
}

// ---------------------------------------------------------------------------
// Opções para os selects do formulário (rótulos amigáveis).
// ---------------------------------------------------------------------------

export interface OpcaoTipo {
  valor: TipoDespesa;
  label: string;
}

/** Opções do 2º select quando a categoria é "Deslocamento". */
export const OPCOES_DESLOCAMENTO: OpcaoTipo[] = [
  { valor: "ESCRITORIO", label: "Escritório (presencial)" },
  { valor: "MOTO", label: "Cliente — Moto" },
  { valor: "CARRO", label: "Cliente — Carro" },
];

/** Opções do 2º select quando a categoria é "Despesa". */
export const OPCOES_DESPESA: OpcaoTipo[] = [
  { valor: "PEDAGIO", label: "Pedágio" },
  { valor: "ESTACIONAMENTO", label: "Estacionamento" },
  { valor: "ALIMENTACAO_EXTERNA", label: "Alimentação (externa)" },
  { valor: "ALMOCO_CLIENTE", label: "Almoço com cliente" },
  { valor: "LICENCA_SOFTWARE", label: "Licença de software" },
  { valor: "EQUIPAMENTO", label: "Equipamento" },
  { valor: "HOSPEDAGEM", label: "Hospedagem" },
  { valor: "PASSAGEM", label: "Passagem" },
];

/** Opções por categoria (encadeamento do 1º → 2º select). */
export const OPCOES_POR_CATEGORIA: Record<CategoriaDespesa, OpcaoTipo[]> = {
  DESLOCAMENTO: OPCOES_DESLOCAMENTO,
  DESPESA: OPCOES_DESPESA,
};

export interface OpcaoCategoria {
  valor: CategoriaDespesa;
  label: string;
}

export const OPCOES_CATEGORIA: OpcaoCategoria[] = [
  { valor: "DESLOCAMENTO", label: "Deslocamento" },
  { valor: "DESPESA", label: "Despesa" },
];
