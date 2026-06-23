import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/lib/types";

/**
 * Data Access Layer de autenticação/autorização.
 *
 * Padrão recomendado pelo guia de auth do Next: centraliza a verificação de
 * sessão perto da fonte de dados, memoizada por request com `cache()` para não
 * repetir a query no mesmo render. A checagem de `getUser()` revalida no
 * servidor de Auth do Supabase (não confia apenas no cookie).
 */
interface UsuarioRow {
  id: string;
  nome: string | null;
  email: string;
  is_admin: boolean;
}

/** Perfil do usuário autenticado (linha em `usuarios`). Redireciona se não houver sessão. */
export const getUsuarioPerfil = cache(async (): Promise<Usuario> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome, email, is_admin")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    console.error(
      "getUsuarioPerfil: perfil não encontrado para o usuário autenticado.",
      error?.message,
    );
    redirect("/login");
  }

  const row = data as UsuarioRow;
  return {
    id: row.id,
    nome: row.nome ?? row.email,
    email: row.email,
    is_admin: row.is_admin,
  };
});

/**
 * Exige privilégio de administrador. Autenticado mas sem `is_admin` → manda
 * para a área do analista (não para /login, pois a sessão é válida).
 */
export const requireAdmin = cache(async (): Promise<Usuario> => {
  const perfil = await getUsuarioPerfil();
  if (!perfil.is_admin) {
    console.error(
      `requireAdmin: acesso negado à área admin para ${perfil.email} (is_admin=false).`,
    );
    redirect("/analista/dashboard");
  }
  return perfil;
});
