import { redirect } from "next/navigation";

import { getUsuarioPerfil } from "@/lib/data/auth";
import { rotaInicialPorPapel } from "@/lib/navegacao";

/**
 * Raiz da aplicação. Não há mais seleção de perfil: o controle de acesso é
 * 100% via banco (Supabase). `getUsuarioPerfil()` redireciona para `/login`
 * quando não há sessão; havendo, roteamos pela coluna `usuarios.is_admin`.
 *
 * Rede de segurança OAuth: se o provedor cair na raiz (Site URL) trazendo um
 * `?code=` em vez de ir para `/auth/callback`, encaminhamos o code (e o `next`)
 * para o handler que troca por sessão — assim o login não quebra mesmo que a
 * allowlist do Supabase mande para a raiz.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>;
}) {
  const { code, next } = await searchParams;

  if (code) {
    const params = new URLSearchParams({ code });
    if (next) params.set("next", next);
    redirect(`/auth/callback?${params.toString()}`);
  }

  const perfil = await getUsuarioPerfil();
  redirect(rotaInicialPorPapel(perfil.is_admin));
}
