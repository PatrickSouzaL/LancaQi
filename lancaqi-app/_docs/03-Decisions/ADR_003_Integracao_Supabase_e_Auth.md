# ADR 003 — Integração Supabase (SSR) e Autenticação Microsoft

- **Status:** Aceito
- **Data:** 2026-06-23
- **Contexto:** Conectar o app ao Supabase e implementar login OAuth Microsoft
  (Entra ID), mantendo os princípios de [[System_Prompt]] (Zero Trust, Zod, RLS).

## Decisões

### 1. Clientes `@supabase/ssr` (não `auth-helpers-nextjs`)
- `lib/supabase/server.ts` — `createClient()` async (Next 16: `cookies()` é async),
  para Server Components/Actions/Route Handlers.
- `lib/supabase/client.ts` — `createBrowserClient()` para Client Components.
- `lib/supabase/middleware.ts` — `updateSession()` (renova sessão + protege rotas).

### 2. Middleware → **Proxy** (breaking change do Next 16)
O arquivo raiz é **`proxy.ts`** (export `proxy`), não `middleware.ts` — o Next 16
renomeou Middleware para Proxy (mesma função, runtime Node, compatível com
`@supabase/ssr`). Protege `/admin/*` e `/analista/*`: sem sessão → `307` para
`/login?redirectTo=<destino>`. `matcher` exclui assets estáticos.

### 3. OAuth Microsoft (`provider: "azure"`)
- `app/login/page.tsx` + `components/auth/LoginButton.tsx` (`signInWithOAuth`).
- `app/auth/callback/route.ts` — `exchangeCodeForSession`; respeita
  `x-forwarded-host` em produção; **valida `next` relativo** (anti open-redirect).

### 4. Server Action `criarDespesa` — Zero Trust
Camadas de defesa:
1. **Auth:** `supabase.auth.getUser()` (revalida no servidor de Auth, não só lê
   cookie). Sem usuário → aborta.
2. **Zod:** valida `data/tipo/origem/destino/quantidade_km`; KM > 0 obrigatório
   para MOTO/CARRO. **`valor_calculado` nunca é aceito do cliente.**
3. **Recálculo server-side:** lê `configuracoes_taxas` do banco e recalcula via
   `calcularPrevia` (fonte única da fórmula).
4. **`usuario_id` = `auth.uid()`** (da sessão), nunca do formulário.
5. **RLS** é a barreira final; `status` usa o default `PENDENTE`.
6. `revalidatePath` nas telas que listam despesas.
- `observacao` é validada mas **não persistida** (coluna inexistente no schema).

## Revisão de segurança — status dos gaps

1. ✅ **`is_admin` imposto em `/admin/*`.** DAL `lib/data/auth.ts`:
   `getUsuarioPerfil()` (sessão via `getUser`, revalidada no servidor de Auth) e
   `requireAdmin()` (redireciona não-admins para `/analista/dashboard`). O
   `(admin)/layout.tsx` chama `requireAdmin()`; o `(analista)/layout.tsx` usa
   `getUsuarioPerfil()` para a identidade. Proxy segue otimista (sem query ao banco).
   As páginas autenticadas passaram a ser dinâmicas (`ƒ`), como esperado.
2. ✅ **Leituras migradas para Supabase.** `lib/data/{despesas,configuracoes,analista}.ts`
   consultam o banco via cliente server-side; agregações do Dashboard
   (`dashboard.ts`) compõem esses getters. Mapper central em `lib/data/mappers.ts`
   (join `usuarios.nome`, `hora` derivada de `criado_em`, decimais → number).
   A **RLS** passa a ser a barreira real (admin vê tudo; analista só o próprio,
   com filtro `usuario_id` explícito como defesa em profundidade). Removidos
   `lib/mock-data.ts` e `lib/data/usuario.ts`.
3. ✅ **Form conectado.** `FormularioDespesa` envia via `criarDespesa` (FormData +
   `useTransition`), com banner de erro do servidor e mapeamento de `fieldErrors`.

## Configuração externa necessária (fora do código)
- Supabase → Authentication → Providers → **Azure**: Client ID/Secret + Tenant.
- Redirect URL no Supabase e no app Azure: `${origin}/auth/callback`.
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (já presentes).

Ver também: [[Schema_RLS_Seguranca]], [[System_Prompt]], [[Dev_Notes]].
