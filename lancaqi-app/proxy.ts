import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy (Next 16) — antigo `middleware.ts`. Renova a sessão Supabase e protege
 * as rotas /admin/* e /analista/*. Roda no runtime Node, compatível com
 * `@supabase/ssr`.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Roda em tudo, exceto assets estáticos e imagens. Necessário rodar nas
  // rotas de página para o refresh de sessão e a proteção funcionarem.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
