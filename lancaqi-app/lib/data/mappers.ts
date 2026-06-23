import "server-only";

import type { Despesa, StatusDespesa, TipoDespesa } from "@/lib/types";

/**
 * Mapeamento Banco → domínio (Visao_Administrador.md / Schema_RLS_Seguranca.md).
 *
 * Centraliza o de/para para evitar divergências:
 * - `usuario_nome` vem do join em `usuarios.nome` (desnormalizado para a UI).
 * - `hora` NÃO existe no schema; é derivada de `criado_em` (timestamptz).
 * - `origem`/`destino` nulos viram "—"; decimais (string do PostgREST) → number.
 * - `observacao` não existe no schema atual.
 */

/** Linha de `despesas` com o join de `usuarios` (tipagem estrita). */
export interface DespesaRow {
  id: string;
  usuario_id: string;
  data: string;
  origem: string | null;
  destino: string | null;
  tipo: TipoDespesa;
  quantidade_km: number | string | null;
  valor_calculado: number | string;
  status: StatusDespesa;
  criado_em: string;
  // Relacionamento to-one; o PostgREST pode retornar objeto ou array.
  usuarios: { nome: string | null } | { nome: string | null }[] | null;
}

/** Colunas selecionadas em toda leitura de despesas (inclui o join de nome). */
export const DESPESA_SELECT =
  "id, usuario_id, data, origem, destino, tipo, quantidade_km, valor_calculado, status, criado_em, usuarios ( nome )";

function nomeDoUsuario(usuarios: DespesaRow["usuarios"]): string {
  if (!usuarios) return "—";
  const u = Array.isArray(usuarios) ? usuarios[0] : usuarios;
  return u?.nome ?? "—";
}

function horaDe(criadoEm: string): string {
  return new Date(criadoEm).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function mapDespesaFromDb(row: DespesaRow): Despesa {
  return {
    id: row.id,
    usuario_id: row.usuario_id,
    usuario_nome: nomeDoUsuario(row.usuarios),
    data: row.data,
    hora: horaDe(row.criado_em),
    origem: row.origem ?? "—",
    destino: row.destino ?? "—",
    tipo: row.tipo,
    quantidade_km: row.quantidade_km == null ? 0 : Number(row.quantidade_km),
    valor_calculado: Number(row.valor_calculado),
    status: row.status,
  };
}
