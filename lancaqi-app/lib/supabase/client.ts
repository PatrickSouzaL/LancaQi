import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para Client Components (browser). Usado, por ex., no
 * LoginButton para iniciar o fluxo OAuth.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
