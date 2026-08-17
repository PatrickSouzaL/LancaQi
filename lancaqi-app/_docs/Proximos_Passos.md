---
tags: [roadmap, dashboard, status]
atualizado: 2026-08-04
---

# Fila de Próximos Passos

> ✅ **CONCLUÍDO (2026-08-04):** Refatoração da agregação do dashboard por status + filtro temporal. Documentação da feature em [[02-Architecture/dashboard_filtros_e_status]].

---

## ✅ Dashboard — Agregação por Status + Filtro Temporal (concluído)

Objetivo: Refatorar a agregação de dados do dashboard para respeitar o status das despesas e adicionar um controle de filtros de tempo no topo da página, mantendo os padrões de segurança e performance do Next.js.

### 1. Refatoração de Agregação de Dados e UI — ✅ feito
- [x] Card "Total Gasto (quinzena)": soma consolidada por status.
- [x] Gráficos "Gastos por dia" e "Distribuição por tipo": alimentados só com o gasto consolidado.
- [x] Card renomeado para "Despesas pendentes de Aprovação"; `COUNT()` estrito em `PENDENTE`.

> ⚠️ **Decisão de implementação (divergência da spec literal):** a spec pedia somar ESTRITAMENTE `APPROVED`. Na prática o gasto consolidado é `["APROVADO", "PAGO"]` — o ciclo de vida é `APROVADO → PAGO`, então quinzenas/meses passados já quitados no Fechamento ficam `PAGO`. Filtrar só `APROVADO` esvaziava os períodos históricos, contradizendo o item 2 ("referência das despesas já pagas no passado"). `PENDENTE`/`NEGADO` seguem de fora das somas. (Enum do banco é em PT: `APPROVED→APROVADO`, `PENDING→PENDENTE`.)

### 2. Filtro Temporal (Time-Range Selector) — ✅ feito
- [x] Seletor no topo do dashboard (à direita, na altura do título — ajustado a pedido).
- [x] Opções: "Quinzena atual" (padrão), "Quinzena anterior", "Mês anterior", "Seleção de período" (date picker).
- [x] URL Search Params (`?period=` / `?from=&to=`) lidos via `searchParams` no Server Component; re-fetch server-side.

### 3. Security by Design & Validação — ✅ feito
- [x] Sanitização de input com Zod: schema ISO `YYYY-MM-DD` + `refine` que rejeita datas inexistentes; custom só com `from <= to`; input inválido → fallback seguro (quinzena atual).
- [x] RBAC: `requireAdmin()` na página (defesa em profundidade sobre o layout + RLS `is_admin()`).

### 4. Atualização de Documentação (Obsidian) — ✅ feito
- [x] Adenda criada em `_docs/02-Architecture/dashboard_filtros_e_status.md` (dir real; a spec dizia `architecture/`) com `tags: [dashboard, metrics, security]`, links `[[...]]` e o fluxo estado⇄servidor.

### Arquivos tocados
- `lib/data/despesas.ts` · `lib/data/dashboard.ts` · `lib/periodo.ts`
- `components/dashboard/DashboardPeriodFilter.tsx` (novo) · `components/dashboard/SummaryCards.tsx`
- `app/(admin)/admin/dashboard/page.tsx`

---

## ✅ Fechamento — competência da quinzena (concluído em 2026-08-17)

Problema: ao virar a quinzena, a consulta `?periodo=anterior` trazia **todos os status** do período, então despesas `PENDENTE` (e `NEGADO`) eram adotadas automaticamente nos totais do fechamento anterior — sem nunca terem passado pelo gate de aprovação.

- [x] `getDespesasPendentes` → `getDespesasFechamento(periodo, { incluirPagas })`: filtro único `APROVADO` (+ `PAGO` na consulta).
- [x] `getResumoFechamento` / `getResumoFechamentoPorCliente`: `todosStatus` → `incluirPagas`, delegando à mesma fonte.
- [x] Tela `/admin/fechamento` e as 5 rotas de export (CSV, XLSX e PDF de analistas/clientes) no mesmo recorte.
- [x] `STATUS_CONSOLIDADO` movida para `lib/data/despesas.ts` (compartilhada com o dashboard).
- [x] Selo "quinzena anterior" na fila de Aprovações para pendentes que atravessaram a virada.
- [x] Documentado em [[02-Architecture/feature_expense_approval]] §7.

> Competência é a **data da despesa**: aprovar depois da virada soma no fechamento da quinzena de origem (`?periodo=anterior`), não na vigente. Enquanto seguir `PENDENTE`, não soma em fechamento nenhum.

---

## 🔜 Próximas tarefas

_Fila vazia. Adicione aqui a próxima demanda priorizada._
