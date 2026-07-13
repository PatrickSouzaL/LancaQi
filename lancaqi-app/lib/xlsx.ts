/**
 * Utilitários compartilhados dos exports em XLSX (Fechamento por analista e por
 * cliente). Centraliza o MIME, os formatos numéricos e o saneamento de nomes de
 * aba para os dois routes não divergirem.
 */

export const MIME_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Formato de moeda (BRL) para células numéricas. */
export const FMT_BRL = '"R$" #,##0.00';
/** Formato de KM (inteiro com separador de milhar). */
export const FMT_KM = "#,##0";

/**
 * Sanitiza um nome de aba do Excel: remove os caracteres proibidos
 * (`\ / ? * [ ] :`), colapsa espaços, limita a 31 chars e garante unicidade
 * (sufixo numérico). `usados` deve conter os nomes já usados em minúsculas.
 */
export function nomeAbaSeguro(
  nome: string,
  usados: Set<string>,
  fallback = "Item",
): string {
  const base =
    nome
      .replace(/[\\/?*[\]:]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 31) || fallback;

  let candidato = base;
  let n = 2;
  while (usados.has(candidato.toLowerCase())) {
    const sufixo = ` (${n})`;
    candidato = `${base.slice(0, 31 - sufixo.length)}${sufixo}`;
    n += 1;
  }
  usados.add(candidato.toLowerCase());
  return candidato;
}
