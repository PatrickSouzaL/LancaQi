/**
 * Geração de CSV para os exports (Fechamento, Auditoria).
 *
 * Separador `;` e BOM (﻿) para o Excel pt-BR reconhecer acentuação e
 * colunas corretamente. Campos com separador/aspas/quebra são escapados.
 */

/** Escapa um campo: aspas se contiver separador, aspas ou quebra de linha. */
export function escaparCampoCsv(valor: string): string {
  if (/[";\r\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/** Monta o conteúdo CSV (com BOM) a partir do cabeçalho e das linhas. */
export function gerarCsv(cabecalho: string[], linhas: string[][]): string {
  const corpo = [cabecalho, ...linhas]
    .map((campos) => campos.map(escaparCampoCsv).join(";"))
    .join("\r\n");
  return `﻿${corpo}`;
}
