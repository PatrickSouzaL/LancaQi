/**
 * Constantes e helpers puros do resumo por cliente no Fechamento.
 *
 * Sem dependências de servidor (DB, cookies) de propósito: este módulo é
 * importado tanto por código server-side quanto por componentes cliente.
 */

/** Sentinela do agrupamento das pendentes sem cliente vinculado. */
export const SEM_CLIENTE_ID = "__sem_cliente__";

/**
 * Clientes internos que podem ser ocultados no resumo por cliente (nomes
 * normalizados: minúsculos, sem acento e sem espaços nas bordas).
 */
const CLIENTES_INTERNOS = new Set(["casa", "hype tecnologia"]);

function normalizarNomeCliente(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Cliente interno (ex.: "Casa", "Hype Tecnologia") — ocultável no resumo. */
export function isClienteInterno(nome: string): boolean {
  return CLIENTES_INTERNOS.has(normalizarNomeCliente(nome));
}
