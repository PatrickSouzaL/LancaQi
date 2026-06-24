import { redirect } from "next/navigation";

import { getUsuarioPerfil } from "@/lib/data/auth";
import { rotaInicialPorPapel } from "@/lib/navegacao";

/**
 * Raiz da aplicação. Não há mais seleção de perfil: o controle de acesso é
 * 100% via banco (Supabase). `getUsuarioPerfil()` redireciona para `/login`
 * quando não há sessão; havendo, roteamos pela coluna `usuarios.is_admin`.
 */
export default async function Home() {
  const perfil = await getUsuarioPerfil();
  redirect(rotaInicialPorPapel(perfil.is_admin));
}
