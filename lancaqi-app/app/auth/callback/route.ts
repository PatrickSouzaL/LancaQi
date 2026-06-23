import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Callback OAuth (padrão @supabase/ssr): troca o `code` retornado pelo provedor
 * por uma sessão e redireciona ao destino (`next`). Os cookies da sessão são
 * gravados pelo `createClient` (server) via `cookies()`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Só aceita destino relativo (evita open redirect).
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Em produção atrás de load balancer, respeita o host encaminhado.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      if (isLocal) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Falha ao trocar code por sessão:", error.message);
  }

  // Sem code ou com erro → volta ao login sinalizando a falha.
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
