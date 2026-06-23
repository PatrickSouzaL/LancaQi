import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 *
 * Usa o pacote oficial `@supabase/ssr` (NÃO `@supabase/auth-helpers-nextjs`).
 * Em Next 16 `cookies()` é assíncrono — por isso o `createClient` é `async`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Em Server Components o `set` lança (não há resposta para mutar);
          // o refresh de sessão é feito no proxy. Ignorar é seguro aqui.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component — ignorável.
          }
        },
      },
    },
  );
}
