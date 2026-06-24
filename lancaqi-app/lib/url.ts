/**
 * Origem pública canônica da aplicação — base de todos os redirects de auth.
 *
 * Prioridade:
 *   1. NEXT_PUBLIC_SITE_URL  → defina na Vercel com o domínio de produção
 *      (ex.: https://lancaqi.vercel.app). É o valor enviado como `redirectTo`
 *      no OAuth, então DEVE constar na allowlist de Redirect URLs do Supabase.
 *   2. NEXT_PUBLIC_VERCEL_URL → URL automática do deploy (sem protocolo).
 *   3. http://localhost:3000  → desenvolvimento.
 *
 * Como lê apenas variáveis `NEXT_PUBLIC_*`, funciona no servidor e no cliente
 * (são inlinadas no bundle). Sempre retorna sem barra final.
 */
export function getBaseURL(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";

  // NEXT_PUBLIC_VERCEL_URL vem sem protocolo (ex.: "lancaqi.vercel.app").
  url = url.startsWith("http") ? url : `https://${url}`;
  return url.replace(/\/+$/, "");
}
