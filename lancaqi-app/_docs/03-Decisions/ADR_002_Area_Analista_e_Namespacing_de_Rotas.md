# ADR 002 — Área do Analista e namespacing de rotas

- **Status:** Aceito
- **Data:** 2026-06-23
- **Contexto:** Construção da Visão do Analista ([[Visao_Analista]]) sob as
  [[UI_UX_Guidelines]], em paralelo à área admin já existente. Iteração 100%
  front-end estático (mock data, zero Supabase).

## Decisões

### 1. Namespacing simétrico: `/admin/*` + `/analista/*`
Admin e Analista possuem, ambos, uma tela `/dashboard`. Dois `page.tsx`
resolvendo para o mesmo path quebram o roteador do Next (parallel pages).
**Decisão final (preferência do time):** ambas as áreas são prefixadas —
`app/(admin)/admin/{dashboard,lancamento,auditoria,fechamento,configuracoes}` e
`app/(analista)/analista/{dashboard,lancamento,historico}`. A raiz `/` é uma
tela de seleção de perfil (no alvo, resolvida por papel após o login).

> Histórico: uma iteração intermediária manteve o admin nas rotas-raiz; foi
> substituída por este esquema simétrico, mais claro e escalável.

### 1b. Admin também lança despesas
Adicionado `/admin/lancamento` (item de navegação + página) reutilizando
`FormularioDespesa`. Antes não havia caminho para o admin registrar
deslocamentos.

### 2. Cálculo de prévia isolado em `lib/calculo.ts`
`calcularPrevia(tipo, km, taxas)` é **simulação visual apenas** (Visao_Analista
§2: o valor do cliente nunca é confiado; o back-end refaz). Espelha a regra do
schema (ESCRITORIO fixo; MOTO/CARRO por km).

### 3. Form com estado controlado (sem react-hook-form)
`FormularioDespesa` usa `useState` controlado (consistente com
`ConfiguracoesForm`), evitando adicionar RHF/zod no front nesta fase. Regras:
KM condicional com transição suave (`grid-rows-[0fr→1fr]` + opacity), prévia em
tempo real (`useMemo`), spinner no submit e botão desabilitado (anti duplo clique).

### 4. Badges de status do analista com as classes do guideline
No Histórico, PENDENTE = amber, PAGO = emerald (classes exatas de
UI_UX_Guidelines §2.3, com variantes `dark:`). A área admin mantém as badges
baseadas na paleta de charts (Stack_e_Design_Tokens) — divergência intencional
por contrato de cada área.

### 5. Acessibilidade
Alvos de toque `h-11` (≥44px) em nav, inputs e CTAs; foco visível preservado
(`focus-visible:ring`); `aria-live` na prévia; tabela do histórico responsiva
(tabela em md+, cards no mobile).

## Consequências
- App passa a ter duas áreas navegáveis e coesas, ambas sobre `lib/data/*` (mock).
- Polimento visual do admin aplicado (PageHeading, ícones de KPI, whitespace `md:p-8`).

Ver também: [[Dev_Notes]], [[ADR_001_Estrutura_Rotas_e_Reconciliacao_Contratos]].
