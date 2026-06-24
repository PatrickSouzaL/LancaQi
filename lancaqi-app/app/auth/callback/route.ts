import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { rotaInicialPorPapel } from "@/lib/navegacao";
import { getCanonicalBaseURL } from "@/lib/url";

/**
 * Callback OAuth (padrão @supabase/ssr): troca o `code` por uma sessão e
 * roteia pelo PAPEL do usuário no banco (controle de acesso 100% via Supabase).
 *
 * Regra: `usuarios.is_admin === true` → área admin; caso contrário (inclusive
 * nulo, padrão de novos usuários) → área do analista. Um deep-link prévio
 * (`next`, setado pelo proxy) só é honrado se for compatível com a área do
 * papel — evita redirecionar para uma área proibida.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? searchParams.get("redirectTo");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Resolve o destino pelo papel (fetch rápido em `usuarios`).
      let destino = rotaInicialPorPapel(false);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("usuarios")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        const isAdmin = (data as { is_admin: boolean } | null)?.is_admin ?? false;
        destino = rotaInicialPorPapel(isAdmin);

        // Honra o deep-link apenas se pertencer à área do papel.
        const next = nextParam?.startsWith("/") ? nextParam : null;
        const prefixoArea = isAdmin ? "/admin" : "/analista";
        if (next && next.startsWith(prefixoArea)) destino = next;
      }

      // Base do redirect final. Prioridade: URL canônica (env) → host REAL da
      // requisição (x-forwarded-host) → origem do request. Nunca a URL do
      // deploy: o redirect TEM que ficar no mesmo host onde o cookie de sessão
      // acabou de ser gravado, senão o usuário cai deslogado no /login.
      const canonica = getCanonicalBaseURL();
      const forwardedHost = request.headers.get("x-forwarded-host");
      const forwardedProto =
        request.headers.get("x-forwarded-proto") ?? "https";
      const base =
        canonica ??
        (forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin);

      return NextResponse.redirect(`${base}${destino}`);
    }

    console.error("Falha ao trocar code por sessão:", error.message);
  }

  // Sem code ou com erro → volta ao login sinalizando a falha.
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
