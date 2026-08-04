---
title: Dashboard — Filtros Temporais e Agregação por Status
date: 2026-08-04
tags: [dashboard, metrics, security]
status: implemented
---

# Dashboard — Filtros Temporais e Agregação por Status

> Adenda arquitetural que documenta duas mudanças no Dashboard do Admin: (1) as métricas passam a **respeitar o ciclo de vida da despesa** (`APROVADO` vs `PENDENTE`) e (2) um **seletor de período** controlado por URL Search Params reagrega os dados no servidor. Base do ciclo de vida em [[feature_expense_approval]]; segurança em [[Schema_RLS_Seguranca]]. Item de roadmap: [[Proximos_Passos]].

---

## 1. Agregação por Status (Aprovado vs Pendente)

Antes, todas as agregações do dashboard somavam **todos os status** do período. Agora cada métrica reflete o estado correto:

| Métrica | Fonte | Status |
| --- | --- | --- |
| Card **Total Gasto** | `getDashboardKpis` | `APROVADO` + `PAGO` (soma) |
| Card **Total de KM** | `getDashboardKpis` | `APROVADO` + `PAGO` (soma) |
| Card **Analistas Ativos** | `getDashboardKpis` | `APROVADO` + `PAGO` (distintos) |
| Card **Despesas pendentes de Aprovação** | `getDashboardKpis` | `PENDENTE` (`COUNT`) |
| Gráfico **Gastos por dia** | `getGastosPorDia` | `APROVADO` + `PAGO` |
| Gráfico **Distribuição por tipo** | `getDistribuicaoPorTipo` | `APROVADO` + `PAGO` |

**Racional:** gasto/KM/analistas representam compromisso financeiro real, então entram todas as despesas que **passaram pelo gate de aprovação** — o conjunto `STATUS_CONSOLIDADO = ["APROVADO", "PAGO"]`. `APROVADO` é o gasto da quinzena vigente (aguardando pagamento); `PAGO` é o de quinzenas/meses **passados** já quitados no Fechamento (por isso períodos anteriores continuam exibindo dados — a seleção histórica "pega a referência das despesas já pagas no passado"). `PENDENTE` (aguarda decisão) e `NEGADO` (recusado) ficam de fora das somas. O card de pendências é o oposto — mede a fila de trabalho do Admin, logo conta estritamente `PENDENTE`.

O filtro roda **server-side** via um parâmetro opcional em `getDespesas(periodo?, status?)` — um estado único (`.eq`) ou um conjunto (`.in`) no PostgREST, sob a RLS `is_admin()`. Nenhuma soma acontece no cliente: o Server Component entrega dados prontos.

> ⚠️ O enum de status no banco é em **português** (`PENDENTE | APROVADO | NEGADO | PAGO`). "Approved/Pending" da especificação mapeiam para `APROVADO`/`PENDENTE`.

### Variações (badges)
Cada KPI compara o período atual com o **período anterior equivalente** (`periodoAnterior`), preservando a semântica de cada modo (quinzena anterior à quinzena, mês anterior ao mês, e — no custom — uma janela de mesmo comprimento imediatamente anterior).

## 2. Filtro Temporal via URL Search Params

O período é dirigido pela URL e resolvido no servidor por `resolverPeriodoDashboard()` (`lib/periodo.ts`), permitindo deep-link, refresh e histórico do browser sem estado no cliente.

| Modo | URL | Janela |
| --- | --- | --- |
| Quinzena atual (padrão) | `/admin/dashboard` | `quinzenaAtual()` |
| Quinzena anterior | `?period=anterior` | `quinzenaAnterior()` |
| Mês anterior | `?period=mes-anterior` | `mesAnterior()` |
| Seleção de período | `?from=YYYY-MM-DD&to=YYYY-MM-DD` | intervalo inclusivo custom |

**Fluxo (estado ⇄ servidor):**

```
DashboardPeriodFilter (client)  →  router.replace(?period|?from&to)
        ↓ (navegação)
DashboardPage (server component)  →  resolverPeriodoDashboard(searchParams)
        ↓
getDashboardKpis / getGastosPorDia / getDistribuicaoPorTipo  →  re-fetch
```

O componente `DashboardPeriodFilter` (client) apenas **escreve a intenção** na URL (`useRouter().replace` + `useTransition`, sem scroll jump); nunca agrega. O `DateRangePicker` existente é reusado para o modo custom.

## 3. Security by Design

- **Sanitização de input (Zod):** `resolverPeriodoDashboard` valida `period` (`z.enum`) e as datas (`from`/`to`) com um schema ISO `YYYY-MM-DD` reforçado por `refine` que reconstrói a data em UTC e rejeita datas inexistentes (ex.: `2026-02-31`). O custom só é aceito com **ambas** as datas válidas e `from <= to`; qualquer input malformado faz **fallback seguro** para a quinzena atual. Nenhuma data crua/parcial chega às consultas — barreira contra Type Confusion e injeção lógica.
- **RBAC (defesa em profundidade):** três camadas — o layout `(admin)` chama `requireAdmin()`, a própria `DashboardPage` reforça `requireAdmin()` antes de qualquer agregação, e a **RLS** (`is_admin()`) é a barreira final no banco. Totais consolidados nunca são retornados a não-admins.

## 4. Arquivos Tocados

- `lib/data/despesas.ts` — parâmetro `status?` em `getDespesas`.
- `lib/data/dashboard.ts` — `getDashboardKpis(periodo, periodoAnterior)` e gráficos filtram `APROVADO`; card de pendências conta `PENDENTE`.
- `lib/periodo.ts` — `resolverPeriodoDashboard` + schema Zod + helpers de intervalo/janela anterior.
- `components/dashboard/DashboardPeriodFilter.tsx` — seletor (novo).
- `components/dashboard/SummaryCards.tsx` — label "Despesas pendentes de Aprovação".
- `app/(admin)/admin/dashboard/page.tsx` — `requireAdmin()`, leitura de `searchParams`, período resolvido, seletor no canto superior esquerdo.
