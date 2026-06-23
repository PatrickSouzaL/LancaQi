# Dev Notes — Iteração UI Admin (mock)

> Notas de implementação da área administrativa com dados mockados (zero Supabase).
> Contexto extraído de [[Visao_Administrador]], [[Stack_e_Design_Tokens]], [[Schema_RLS_Seguranca]] e [[System_Prompt]].
>
> 🗺️ **Roadmap do que falta:** [[Proximos_Passos]].

## Design tokens aplicados (`app/globals.css`)

O `globals.css` vinha com o tema **neutro padrão** do shadcn (escala de cinza). Foi
substituído pelos tokens documentados:

- Fundo `--background` ≈ `slate-50`; texto slate escuro.
- Destaque `--primary` na escala **indigo** (hue 277); `--accent` indigo suave.
- `--radius: 0.75rem`; sombra padrão `shadow-sm` em todos os cards/header.
- Charts mapeados ao negócio: `--chart-1` Escritório (indigo), `--chart-2` Carro
  (magenta), `--chart-3` Moto (azul), `--chart-4` Pago (verde), `--chart-5`
  Pendente (âmbar). Badges usam `color-mix(... var(--chart-N) ...)`.
- App forçado em tema claro (`<html className="light ...">`).

## Entidades de negócio (front ↔ banco)

- `tipo`: `ESCRITORIO | MOTO | CARRO` (MAIÚSCULAS, conforme CHECK do schema).
- `status`: **`PENDENTE | PAGO`** — o schema **não** tem `REJEITADO`.
- `valor_calculado` (R$) e `quantidade_km` (decimal). IDs em uuid.
- `hora`: **campo só de exibição** (não existe no schema; alvo: derivar de `criado_em`).
- Tarifas oficiais (seed): `valor_fixo_escritorio = 30`, `taxa_km_moto = 0,50`,
  `taxa_km_carro = 1,00`. O mock usa estes valores oficiais (não os 42/2,5/4,8 do
  protótipo antigo).
- Labels em português ("Escritório"/"Pago") vivem só na apresentação (`lib/format.ts`).

## Regras de segurança refletidas na UI (alvo)

Nenhuma chamada Supabase nesta iteração, mas a UI foi estruturada para o Zero Trust:

- Telas admin condicionadas a `is_admin()` + RLS no servidor (esconder menu não é barreira).
- Cálculo financeiro **sempre** server-side; cliente nunca envia `valor_calculado`.
- IDs/ações (aprovar, lote, salvar taxas) revalidados na Server Action; payload do
  cliente nunca é autoritativo. Handlers atuais são `console.log`.
- Configurações = `UPDATE` na linha única (nunca INSERT).

## Camada de dados

- `lib/types.ts` — tipos estritos (sem `any`).
- `lib/mock-data.ts` — dados estáticos (10 despesas variadas + tarifas).
- `lib/data/*` — getters `async` (`getDespesas`, `getDespesasPendentes`,
  `getDashboardKpis`, `getResumoFechamento`, `getConfiguracoesTaxas`, `getUsuarioAtual`).
  Trocar o corpo por queries Supabase **não** altera as telas.
- `lib/format.ts` — BRL/KM/data pt-BR, labels e iniciais.

## Fronteira Server/Client

- **Server:** todos os `page.tsx`, `(admin)/layout.tsx`, `SummaryCards`,
  `ExpenseCharts`, `RecentMovements`, `StatusBadges`, `AnalistaCell`.
- **Client (folhas):** `AppSidebar`, `SidebarNavLinks`, `AdminHeader`,
  `AuditoriaClient`, `SheetAuditoria`, `FechamentoClient`, `ConfiguracoesForm`.

## Gráficos (Recharts)

`recharts@3.8.0` + `components/ui/chart.tsx` (shadcn) integrados. `ExpenseCharts`
é Client Component; as agregações vêm prontas e serializadas do servidor
(`getGastosPorDia`, `getDistribuicaoPorTipo` em `lib/data/dashboard.ts`):

- **Gastos por Deslocamento:** `BarChart` empilhado (ESCRITORIO/CARRO/MOTO),
  cores `--chart-1/2/3`, tooltip e legenda.
- **Distribuição por Tipo:** donut (`innerRadius=70`) com total em BRL ao centro.

## Área do Analista (`app/(analista)/analista/*`)

Visão do usuário comum sob [[UI_UX_Guidelines]] + [[Visao_Analista]]:

- **Rotas:** `/analista/dashboard` (Hero Metric do acumulado + pendente/pago),
  `/analista/lancamento` (form), `/analista/historico` (tabela responsiva + empty state).
  Namespacing decidido em [[ADR_002_Area_Analista_e_Namespacing_de_Rotas]]
  (admin ocupa as rotas-raiz).
- **Layout:** topbar minimalista (Server Component) + `AnalistaNav` (client, rota ativa).
- **Form (`FormularioDespesa`, client):** KM condicional com transição suave,
  prévia em tempo real (`lib/calculo.ts` — só simulação), spinner + anti duplo clique.
- **Dados:** `lib/data/analista.ts` (`getAnalistaAtual`, `getDespesasDoAnalista`,
  `getResumoAnalista`, `getTaxasVigentes`); isolamento por `usuario_id` (no alvo, RLS).
- **a11y:** alvos `h-11` (44px), foco visível, `aria-live` na prévia, tabela
  vira cards no mobile. Status: PENDENTE amber / PAGO emerald (classes do guideline).

## Polimento da área Admin

PageHeading padronizado (título `text-2xl font-bold` + descrição muted) em todas
as páginas; ícones Lucide nos KPIs; whitespace `md:p-8`; cards `shadow-sm` mantidos.

## Componentes shadcn adicionados nesta iteração

`select`, `textarea` (além de `chart` da iteração anterior).

## Correção crítica de tipografia (fonte serifada)

`app/globals.css` mapeava `--font-sans: var(--font-sans)` (auto-referência) →
`font-sans` resolvia para vazio e o navegador caía na **serifada padrão**.
Corrigido para `--font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, …`
(a Geist é injetada pelo `next/font` via classes no `<html>`). `body` agora tem
`font-sans antialiased` explícito.

## Design polish (estilo Vercel/Linear)

- **Tipografia:** títulos de página `text-2xl font-semibold tracking-tight` +
  descrição muted; valores de KPI `text-3xl font-bold tracking-tight tabular-nums`.
- **Gráfico:** paleta harmonizada — Escritório `#cbd5e1` (slate-300),
  Carro `#6366f1` (indigo-500), Moto `#38bdf8` (sky-400); legenda `text-xs`.
- **Badges:** alinhadas à mesma paleta (Escritório slate / Carro indigo / Moto sky;
  Pendente amber / Pago emerald), tons 100/700 para contraste AA.
- **Sidebar:** item ativo com `bg-primary/10` + `text-primary` (`!` para vencer o
  `sidebar-accent` padrão); inativos em `text-muted-foreground`.
- **Rotas simétricas:** `/admin/*` e `/analista/*`; `/` é seletor de perfil.
  Admin ganhou `/admin/lancamento`. Ver [[ADR_002_Area_Analista_e_Namespacing_de_Rotas]].

## Back-end: Supabase SSR + Auth Microsoft

Ver [[ADR_003_Integracao_Supabase_e_Auth]] para o detalhe e a revisão de segurança.

- **Clientes:** `lib/supabase/{server,client,middleware}.ts` (`@supabase/ssr`).
- **Proxy (não middleware):** `proxy.ts` na raiz protege `/admin/*` e `/analista/*`
  (sem sessão → `/login?redirectTo=`). Next 16 renomeou Middleware → Proxy.
- **OAuth Azure:** `/login` + `LoginButton` (`signInWithOAuth({provider:'azure'})`);
  callback em `app/auth/callback/route.ts` (`exchangeCodeForSession`, anti open-redirect).
- **Server Action `app/actions/despesas-actions.ts`:** `criarDespesa(formData)` —
  auth via `getUser()`, Zod, **recálculo server-side** das taxas, `usuario_id` da
  sessão, `revalidatePath`. `valor_calculado` jamais vem do cliente.
- **Deps adicionadas:** `zod@4`.

### Status dos gaps de segurança
1. ✅ `is_admin` imposto via DAL `lib/data/auth.ts` (`requireAdmin` no layout admin;
   `getUsuarioPerfil` para identidade no layout analista). Páginas autenticadas
   agora são dinâmicas (`ƒ`).
2. ✅ Leituras migradas para Supabase: `lib/data/{despesas,configuracoes,analista}.ts`
   consultam o banco (mapper central em `lib/data/mappers.ts`); `dashboard.ts`
   agrega sobre esses getters. RLS é a barreira real. Removidos `lib/mock-data.ts`
   e `lib/data/usuario.ts`. As páginas viraram dinâmicas (`ƒ`).
3. ✅ `FormularioDespesa` conectado ao `criarDespesa` (FormData + `useTransition`,
   banner de erro do servidor + mapeamento de `fieldErrors`).

> Removido `lib/data/usuario.ts` (mock de usuário admin), agora substituído pela DAL real.

## Pendências conhecidas

- `hooks/use-mobile.ts` reescrito com `useSyncExternalStore` (regra
  `react-hooks/set-state-in-effect` do Next 16).

Decisões de reconciliação entre o plano literal e os contratos: ver
[[ADR_001_Estrutura_Rotas_e_Reconciliacao_Contratos]].
