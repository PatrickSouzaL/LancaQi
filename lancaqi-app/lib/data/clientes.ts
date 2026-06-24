import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/types";

/**
 * Leitura de clientes via Supabase. A RLS permite SELECT para qualquer usuário
 * autenticado; a escrita (Server Actions) é restrita a admin. Ordena por nome
 * para uma listagem previsível.
 */

const CLIENTE_SELECT = "id, nome, endereco, cnpj, telefone, criado_em";

/** Linha crua de `clientes` (tipagem estrita da resposta do PostgREST). */
interface ClienteRow {
  id: string;
  nome: string;
  endereco: string | null;
  cnpj: string | null;
  telefone: string | null;
  criado_em: string;
}

function mapClienteFromDb(row: ClienteRow): Cliente {
  return {
    id: row.id,
    nome: row.nome,
    endereco: row.endereco,
    cnpj: row.cnpj,
    telefone: row.telefone,
    criado_em: row.criado_em,
  };
}

export async function getClientes(): Promise<Cliente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select(CLIENTE_SELECT)
    .order("nome", { ascending: true });

  if (error) {
    console.error("getClientes: falha ao ler clientes.", error.message);
    return [];
  }
  return (data as unknown as ClienteRow[]).map(mapClienteFromDb);
}
