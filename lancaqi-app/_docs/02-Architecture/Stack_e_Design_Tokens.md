# Stack e Design Tokens

> Documentação da arquitetura visual e técnica extraída do protótipo **LançaQi**.
> Fonte: `package.json`, `components.json`, `app/globals.css`, `app/layout.tsx` e componentes em `components/`.

---

## Stack Técnica (observada)

| Camada | Tecnologia | Versão (package.json) |
|--------|------------|------------------------|
| Framework | **Next.js** (App Router, RSC) | `16.2.6` |
| Linguagem | **TypeScript** estrito | `5.7.3` |
| UI Runtime | **React** | `^19` |
| Estilização | **Tailwind CSS** v4 (`@tailwindcss/postcss`) | `^4.2.0` |
| Biblioteca de componentes | **Shadcn/ui** (style `base-nova`, base color `neutral`) | `shadcn ^4.8.0` |
| Primitivos headless | **@base-ui/react** | `^1.5.0` |
| Ícones | **Lucide React** | `^1.16.0` |
| Gráficos | **Recharts** | `3.8.0` |
| Analytics | **@vercel/analytics** | `1.6.1` |
| Utilitários | `clsx`, `tailwind-merge`, `class-variance-authority` | — |

> **Config Shadcn (`components.json`):** `rsc: true`, `tsx: true`, `cssVariables: true`, `iconLibrary: lucide`. Aliases: `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`.

---

## Camada de Dados (estado atual vs. alvo)

> ⚠️ **Gap importante:** o `package.json` **não** inclui `@supabase/supabase-js` nem `@supabase/ssr`, e não há cliente Supabase no código. **Toda a UI consome dados estáticos de `lib/mock-data.ts`.** O backend descrito em `schema.sql` é o **alvo de integração**, ainda não conectado.

| Aspecto | Estado atual (protótipo) | Alvo (definido em `schema.sql`) |
|---------|--------------------------|----------------------------------|
| Origem dos dados | `lib/mock-data.ts` (arrays/constantes) | PostgreSQL via **Supabase** |
| Autenticação | Perfil fixo "Marina Alves" | **Supabase Auth** + trigger `handle_new_user` |
| Autorização | Inexistente | **RLS** + função `is_admin()` |
| Mutações | `useState` local, `preventDefault` | **Server Actions** + recálculo server-side |
| Cálculo financeiro | Valores pré-computados no mock | `quantidade_km × taxa` recalculado no servidor |

### Passos de integração sugeridos (não implementados)

1. Adicionar dependências `@supabase/supabase-js` + `@supabase/ssr`.
2. Criar clientes Supabase (browser e server) e middleware de sessão.
3. Substituir leituras de `mock-data.ts` por queries em **Server Components** (admin lê tudo via RLS `is_admin()`).
4. Implementar **Server Actions** para Aprovar/Marcar Pago/Salvar Tarifas, com validação **Zod** e recálculo de `valor_calculado`.
5. Aplicar os **mappers** Front-end ↔ Banco (caixa de `tipo`/`status`, `valor_calculado`, `quantidade_km`) — ver [[Schema_RLS_Seguranca]].

> As diretrizes de Client vs Server, Zod e Zero Trust para essa integração estão em [[System_Prompt]].

---

## Primitivos Visuais (Shadcn/ui utilizados)

Componentes presentes em `components/ui/` e efetivamente consumidos pelas features:

| Componente | Uso observado |
|------------|---------------|
| **Card** (`CardHeader`/`Title`/`Description`/`Content`/`Footer`) | Wrapper de todas as seções: métricas, gráficos, tabelas, formulário |
| **Table** | Auditoria, Fechamento, Últimas Movimentações |
| **Sheet** | Painel lateral de detalhes da despesa (Auditoria) |
| **Input** | Filtro de busca (Auditoria) e campos de tarifas (Configurações) |
| **Button** | Ações (Ver, Aprovar, Exportar CSV, Marcar como Pago, Salvar) |
| **Badge** | Status (Pendente/Pago), tipo de deslocamento, variação de métricas |
| **Sidebar** (`SidebarProvider`, `SidebarInset`, `SidebarRail`...) | Navegação global colapsável (`collapsible="icon"`) |
| **Avatar** (`AvatarFallback`) | Iniciais do analista nas tabelas e rodapé |
| **DropdownMenu** | Menu de perfil/logout no rodapé da sidebar |
| **Checkbox** | Seleção em lote no Fechamento (com estado `indeterminate`) |
| **Field** (`FieldGroup`/`Label`/`Description`) | Estrutura do formulário de tarifas |
| **Breadcrumb** | Trilha de navegação no header |
| **Separator** | Divisórias no header e no Sheet |
| **Tooltip** (`TooltipProvider`) | Provider global; tooltips de sidebar colapsada |
| **Chart** (`ChartContainer`/`Tooltip`/`Legend`) | Wrapper Recharts (barras + pizza) |
| **Tabs** | Componente disponível em `ui/` (primitivo pronto para navegação por abas) |

> Demais primitivos disponíveis no kit: `Label`, `ScrollArea`, `Skeleton`.

---

## Design Tokens

> Tokens definidos como **CSS variables em espaço de cor `oklch`** (`app/globals.css`), mapeados para utilitários Tailwind v4 via `@theme inline`. Suporte a tema claro (`:root`) e escuro (`.dark`). O app é forçado em `light` no `<html className="light ...">`.

### Cores — Tema Claro (`:root`)

| Token | Valor (oklch) | Papel |
|-------|---------------|-------|
| `--background` | `oklch(0.984 0.003 247.86)` | Fundo principal — equivalente a `bg-slate-50` |
| `--foreground` | `oklch(0.21 0.03 264.4)` | Texto principal (slate escuro) |
| `--card` | `oklch(1 0 0)` | Fundo de cards e header (branco) |
| `--primary` | `oklch(0.54 0.22 277)` | **Cor de destaque — escala indigo/violeta (hue 277)** |
| `--primary-foreground` | `oklch(0.985 0 0)` | Texto sobre primária |
| `--accent` | `oklch(0.95 0.03 277)` | Acento indigo suave |
| `--muted-foreground` | `oklch(0.55 0.02 264.4)` | Texto secundário |
| `--border` / `--input` | `oklch(0.928 0.006 264.5)` | Bordas e inputs |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Ações destrutivas (vermelho) |

> **Resumo do prompt visual:** Fundo principal `bg-slate-50` (≈ `--background`); destaques na escala **indigo** (`--primary` hue 277). O kit Shadcn usa os tokens semânticos (`bg-primary`, `text-primary`), não classes `indigo-*` literais.

### Paleta de Gráficos (charts)

| Token | Claro (oklch) | Mapeamento de negócio |
|-------|---------------|------------------------|
| `--chart-1` | `oklch(0.54 0.22 277)` (indigo) | **Escritório** |
| `--chart-2` | `oklch(0.62 0.19 312)` (magenta) | **Carro** |
| `--chart-3` | `oklch(0.68 0.15 232)` (azul) | **Moto** |
| `--chart-4` | `oklch(0.7 0.15 162)` (verde) | Status **Pago** |
| `--chart-5` | `oklch(0.77 0.16 70)` (âmbar) | Status **Pendente** |

> Os badges de tipo/status usam `color-mix(in oklch, var(--chart-N) X%, transparent)` para gerar fundos translúcidos consistentes com a paleta.

### Cores semânticas adicionais (uso direto no JSX)

- Variação positiva/sucesso: `bg-emerald-100 text-emerald-700` (dark: `emerald-950/400`).
- Variação negativa/alerta: `bg-red-100 text-red-700` (dark: `red-950/400`).

### Tipografia

| Aspecto | Definição |
|---------|-----------|
| Fonte principal (sans) | **Geist** (`next/font/google`) → `--font-geist-sans` / `--font-sans` |
| Fonte mono | **Geist Mono** → `--font-geist-mono` (números tabulares em valores) |
| Fonte de títulos | `--font-heading` = `var(--font-sans)` (mesma família) |
| Classe base no `<body>` | `font-sans antialiased` |
| Hierarquia de títulos | H1 header: `text-base font-semibold`; Card title de métrica: `text-2xl tabular-nums`; CardTitle padrão: tamanho default Shadcn |
| Escalas de texto | `text-2xl` (valores), `text-base`/`font-semibold` (títulos), `text-sm` (corpo), `text-xs text-muted-foreground` (legendas/descrições) |
| Números | `tabular-nums` em todos os valores monetários e KM (alinhamento de dígitos); `font-mono` em tooltips de gráficos |

### Raio de Borda

`--radius: 0.75rem` (base), escalonado: `--radius-sm` (×0.6) → `--radius-4xl` (×2.6).

### Sombras

> Padronização encontrada: **`shadow-sm`**.

- Aplicado em **todos** os Cards (`<Card className="shadow-sm">`) — métricas, gráficos, tabelas, formulário.
- Aplicado no **header** fixo (`shadow-sm` + `border-b` + `sticky top-0`).
- Não há uso de sombras maiores (`shadow-md`/`lg`) — a interface mantém elevação visual sutil e uniforme.

---

## Topologia da Interface

Layout global montado em `app/page.tsx`, orquestrado por `SidebarProvider` + `SidebarInset`:

```text
SidebarProvider
├── Sidebar (AppSidebar — colapsável "icon")
│   ├── SidebarHeader  → marca "LançaQi · Gestão de Deslocamentos"
│   ├── SidebarContent → navegação (Dashboard, Auditoria, Fechamento, Configurações)
│   └── SidebarFooter  → perfil + DropdownMenu (Sair)
│
└── SidebarInset
    ├── DashboardHeader (sticky, border-b, shadow-sm)
    │   └── SidebarTrigger + Separator + Título + Breadcrumb
    │
    └── main (Área de Conteúdo Principal)
        ├── SummaryCards
        ├── ExpenseCharts
        └── RecentMovements
```

### Isolamento de renderização

- **Sidebar** e **Header** são componentes de **casca (shell) estáveis** — renderizam navegação e contexto, e **isolam** a área central. Trocar a feature ativa não re-renderiza a casca.
- O **Header** é parametrizado por props (`title`, `section`) e dirige o Breadcrumb, permitindo que cada feature defina seu contexto sem alterar a estrutura.
- A **Área de Conteúdo Principal** (`<main>`) é o ponto de composição das features (Dashboard, Auditoria, Fechamento, Configurações), mantendo o shell desacoplado da lógica de cada tela.
- **Fronteira Client/Server:** `AppSidebar`, `ExpenseCharts`, `AuditoriaTab`, `FechamentoTab` e `ConfiguracoesTab` são `"use client"` (interatividade/estado); `SummaryCards`, `RecentMovements`, `DashboardHeader` e a `page` são Server Components.

---

## Ligações

- Features detalhadas em [[Visao_Administrador]].
- Modelagem de dados e tokens financeiros em [[Schema_RLS_Seguranca]].
- Diretrizes de implementação em [[System_Prompt]].
