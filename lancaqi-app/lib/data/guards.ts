import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Guard de autorização para Server Actions administrativas.
 *
 * Centraliza o padrão `getUser()` → checagem de `is_admin` na tabela `usuarios`.
 * Retorna (discriminado por `ok`) o client autenticado e o id do usuário, ou a
 * mensagem de erro para a action repassar ao cliente. A RLS continua sendo a
 * barreira final no banco; esta checagem é defesa em profundidade e dá feedback
 * claro em vez de um erro de RLS opaco.
 */

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Linha de `usuarios` mínima para a checagem de privilégio. */
interface PerfilRow {
  is_admin: boolean;
}

export type AdminContext =
  | { ok: false; error: string }
  | { ok: true; supabase: SupabaseServerClient; userId: string };

export async function exigirAdmin(): Promise<AdminContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const perfil = data as PerfilRow | null;
  if (error || !perfil?.is_admin) {
    console.error(
      `exigirAdmin: acesso negado (user=${user.id}, is_admin=${perfil?.is_admin}).`,
      error?.message,
    );
    return { ok: false, error: "Ação restrita a administradores." };
  }

  return { ok: true, supabase, userId: user.id };
}
