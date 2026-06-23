import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Prefixos que exigem sessão válida (áreas Admin e Analista). */
const ROTAS_PROTEGIDAS = ["/admin", "/analista"];

/**
 * Atualiza/renova a sessão Supabase a cada request e protege as rotas.
 *
 * Chamado pelo `proxy.ts` (em Next 16 o antigo Middleware chama-se Proxy).
 * Segue o padrão oficial do `@supabase/ssr`: nada de código entre
 * `createServerClient` e `getUser()`, e a resposta com os cookies atualizados
 * é sempre propagada (inclusive em redirects) para não deslogar o usuário.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: não inserir lógica entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const protegida = ROTAS_PROTEGIDAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );

  // Sem sessão em rota protegida → redireciona para /login (preservando o destino).
  if (protegida && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    const redirect = NextResponse.redirect(url);
    // Copia os cookies atualizados para a resposta de redirect.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value);
    });
    return redirect;
  }

  return supabaseResponse;
}
