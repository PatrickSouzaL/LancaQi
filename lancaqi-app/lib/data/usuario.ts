/**
 * Usuário autenticado (mock).
 *
 * HOJE: perfil fixo "Marina Alves" (administradora).
 * AMANHÃ: derivar de `supabase.auth.getUser()` + `SELECT` em `usuarios`.
 *         A autorização das telas admin deve checar `is_admin` no servidor —
 *         e a RLS é a barreira final, não o esconder do menu.
 */
import type { Usuario } from "@/lib/types";

const USUARIO_MOCK: Usuario = {
  id: "u-001",
  nome: "Marina Alves",
  email: "marina.alves@empresa.com",
  is_admin: true,
};

export async function getUsuarioAtual(): Promise<Usuario> {
  return USUARIO_MOCK;
}
