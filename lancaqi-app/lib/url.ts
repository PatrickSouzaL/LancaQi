/**
 * URL pública canônica da aplicação — base dos redirects de autenticação.
 *
 * Retorna `NEXT_PUBLIC_SITE_URL` normalizada (https + sem barra final), ou
 * `null` se não estiver definida. Defina-a na Vercel com o domínio de produção
 * (ex.: https://lanca-qi.vercel.app).
 *
 * IMPORTANTE: NÃO usamos `VERCEL_URL`/`NEXT_PUBLIC_VERCEL_URL` como fallback —
 * elas apontam para o host ESPECÍFICO DO DEPLOY, diferente do domínio canônico.
 * Redirecionar para lá após o login descarta o cookie de sessão (gravado no
 * domínio canônico) e derruba o usuário de volta para o /login. Quando a URL
 * canônica não existe, quem chama deve cair no host real da requisição
 * (callback) ou no `window.location.origin` (cliente).
 */
export function getCanonicalBaseURL(): string | null {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) return null;
  const comProtocolo = url.startsWith("http") ? url : `https://${url}`;
  return comProtocolo.replace(/\/+$/, "");
}
