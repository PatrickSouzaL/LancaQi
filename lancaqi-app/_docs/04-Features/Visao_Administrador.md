# Visão do Administrador

> Mapeamento funcional do protótipo **LançaQi**, da perspectiva do perfil **Administrador** (`is_admin = true`; mock: "Marina Alves").
> Fonte de UI: `components/dashboard/*` e `lib/mock-data.ts`. Fonte de dados: `schema.sql` ([[Schema_RLS_Seguranca]]).
> ⚠️ **Estado atual:** a UI consome **dados mockados**; a integração com Supabase ainda não foi implementada. As notas "Integração com o banco" descrevem o **comportamento-alvo** sobre o schema real.

---

## Convenção de Nomenclatura (Front-end ↔ Banco)

Ao implementar cada feature, traduza os valores do protótipo para os do banco:

| Conceito | Front-end (`mock-data.ts`) | Banco (`schema.sql`) |
|----------|----------------------------|----------------------|
| Tipo | `"Escritório"` / `"Carro"` / `"Moto"` | `'ESCRITORIO'` / `'CARRO'` / `'MOTO'` |
| Status | `"Pendente"` / `"Pago"` | `'PENDENTE'` / `'PAGO'` |
| Valor | `valor` | `valor_calculado` |
| KM | `km` | `quantidade_km` |
| ID despesa | `"D-1042"` | `uuid` (`gen_random_uuid()`) |
| Perfil admin | label "Administradora" | coluna `is_admin = true` |

> Centralize esse de/para em mappers (`mapDespesaFromDb` / `mapTipoToDb`) para evitar bugs de caixa/acentuação.

---

## Navegação

A navegação principal vive na **Sidebar** (`AppSidebar`), grupo "Navegação":

```text
LançaQi — Gestão de Deslocamentos
├── Dashboard              (LayoutDashboard) ← ativo por padrão
├── Auditoria              (ShieldCheck)
├── Fechamento Quinzenal   (CalendarClock)
└── Configurações de Taxas (SlidersHorizontal)

Rodapé:
└── Perfil (Avatar "MA" · Marina Alves · marina.alves@empresa.com)
    └── DropdownMenu → "Sair" (LogOut)
```

> **Visibilidade por papel:** Auditoria, Fechamento e Configurações são telas administrativas. A renderização desses itens deve ser condicionada a `is_admin()` — e protegida no servidor pela RLS, não apenas escondendo o menu. No protótipo, apenas o **Dashboard** está roteado em `app/page.tsx`; as demais existem como componentes prontos, ainda não conectados.

---

## Dashboard

Composição: **SummaryCards** → **ExpenseCharts** → **RecentMovements**. Período: **quinzena atual**.

### Cards de Indicadores (`SummaryCards`)

| Indicador | Valor (mock) | Variação | Origem-alvo no banco |
|-----------|--------------|----------|----------------------|
| **Total Gasto (Quinzena)** | `R$ 18.742,50` | `+12,4%` (alta = ruim) | `SUM(valor_calculado)` das `despesas` da quinzena |
| **Total de KM Rodado** | `4.321 km` | `+8,1%` (alta = bom) | `SUM(quantidade_km)` da quinzena |
| **Despesas Pendentes** | `14` | `-3` (queda = bom) | `COUNT(*)` onde `status = 'PENDENTE'` |
| **Analistas Ativos** | `27` | `+4` (alta = bom) | `COUNT(DISTINCT usuario_id)` com despesa no período |

> **Integração com o banco:** todas as métricas são agregações server-side sobre `despesas` (admin lê tudo via RLS `is_admin()`). **Não há coluna `ativo`** em `usuarios` — "Analistas Ativos" é **derivado** dos lançamentos do período, não um flag persistido. As agregações devem ser calculadas em Server Component / RPC, nunca somadas no cliente.

### Estrutura dos Gráficos (`ExpenseCharts`)

1. **Gastos por Deslocamento** — bar chart empilhado (`lg:col-span-2`): evolução diária por dia da quinzena, 3 séries (`ESCRITORIO`/`CARRO`/`MOTO`). Alvo: `GROUP BY data, tipo` somando `valor_calculado`.
2. **Distribuição por Tipo** — donut (`innerRadius=70`) com total agregado ao centro. Alvo: `GROUP BY tipo` somando `valor_calculado`.

Paleta: Escritório `--chart-1`, Carro `--chart-2`, Moto `--chart-3` (ver [[Stack_e_Design_Tokens]]).

### Últimas Movimentações (`RecentMovements`)

5 despesas mais recentes. Colunas: Analista (avatar+nome), Data, Tipo (badge), Valor. Alvo: `ORDER BY criado_em DESC LIMIT 5`, com `join` em `usuarios` para `nome`.

### Relações entre indicadores

- **Total Gasto** = `SUM(valor_calculado)`; a pizza o decompõe por `tipo`, as barras no tempo (`data`).
- **Total KM** correlaciona com gasto de `CARRO`/`MOTO` (`quantidade_km × taxa`); `ESCRITORIO` é valor fixo e não soma KM.
- **Despesas Pendentes** alimenta as filas de **Auditoria** e **Fechamento** (`status = 'PENDENTE'`).

---

## Auditoria (`AuditoriaTab`)

Card "Auditoria de Despesas" + **busca** (`Input`) que filtra por **nome do analista** (case-insensitive).

### Tabela

| Coluna | Conteúdo (UI) | Campo no banco |
|--------|---------------|----------------|
| **Analista** | Avatar (iniciais) + nome | `usuarios.nome` (via join em `usuario_id`) |
| **Data** | `dd/mm/aaaa` | `despesas.data` |
| **Tipo** | `TipoBadge` | `despesas.tipo` (`ESCRITORIO`/`CARRO`/`MOTO`) |
| **KM** | `formatarKm` | `despesas.quantidade_km` |
| **Valor (R$)** | `formatarBRL` | `despesas.valor_calculado` |
| **Status** | `StatusBadge` | `despesas.status` (`PENDENTE`/`PAGO`) |
| **Ações** | Botão **"Ver"** → Sheet | — |

> Estado vazio: "Nenhum analista encontrado para "{filtro}"."
> **Integração com o banco:** o admin enxerga todas as despesas pela RLS `is_admin()`. O filtro por nome deve ir para a query server-side (`ilike` em `usuarios.nome`), não filtrar um array carregado inteiro no cliente.

### Fluxo

```text
Clique em "Ver" da linha
    ↓
Abre Sheet lateral (sm:max-w-md)
    ↓
Detalhes: Tipo + Status · Data · Hora* · Origem · Destino · KM exato
          + bloco "Valor total" (valor_calculado)
    ↓
SheetFooter:
  • "Aprovar Despesa"  → Server Action
  • "Cancelar"         → SheetClose
```

> **\* Campo "Hora":** exibido no protótipo, mas **não existe** no schema (`despesas` tem só `data DATE` + `criado_em`). Para persistir hora, evoluir o schema (ver [[Schema_RLS_Seguranca]] → Evoluções sugeridas) ou derivar de `criado_em`.
> **Integração — "Aprovar Despesa":** Server Action que (1) valida sessão + `is_admin()`, (2) faz `UPDATE despesas SET status = 'PAGO' WHERE id = $1`, (3) confia na RLS como última barreira. O `id` (uuid) e a transição de status são validados no servidor; nunca confiar no payload do cliente. Há também policy de **DELETE** (admin pode excluir; analista só enquanto `PENDENTE`).

---

## Fechamento Quinzenal (`FechamentoTab`)

Consolidação das despesas **`PENDENTE`** para pagamento em lote.

### Tabela

Cabeçalho dinâmico: "{N} pendentes • {M} selecionadas ({total em BRL})".

| Coluna | Conteúdo | Campo no banco |
|--------|----------|----------------|
| **Checkbox** (header) | Selecionar todos (suporta `indeterminate`) | — |
| **Analista** | Avatar + nome | `usuarios.nome` |
| **Data** | `dd/mm/aaaa` | `despesas.data` |
| **Tipo** | `TipoBadge` | `despesas.tipo` |
| **KM** | `formatarKm` | `despesas.quantidade_km` |
| **Valor (R$)** | `formatarBRL` | `despesas.valor_calculado` |

- **Status atual:** apenas `status = 'PENDENTE'` entra na tela (`WHERE status = 'PENDENTE'`).
- **Pendências:** total selecionado somado em tempo real (`useMemo`); linhas marcadas com `data-state="selected"`.

### Ações em lote

| Ação | Comportamento-alvo |
|------|--------------------|
| **Exportar CSV** | Gera CSV das pendentes (server-side, respeitando RLS) |
| **Marcar em Lote como PAGOS** | `disabled` sem seleção; `UPDATE despesas SET status='PAGO' WHERE id = ANY($ids)` |

> **Integração com o banco:** a marcação em lote roda numa Server Action que valida `is_admin()` e processa os `uuid`s server-side. **Nunca** tratar a lista de IDs enviada pelo cliente como autoritativa — a RLS (`is_admin()` no `UPDATE`) é a barreira final. Após `PAGO`, o analista perde acesso de escrita à despesa (policies de `UPDATE`/`DELETE` exigem `status = 'PENDENTE'` para não-admin).

---

## Configurações de Taxas (`ConfiguracoesTab`)

Formulário (`max-w-2xl`) que governa o **cálculo automático dos reembolsos**. Edita a **linha única** de `configuracoes_taxas`.

| Campo (UI) | Coluna no banco | Default no banco | Default no mock |
|------------|-----------------|------------------|------------------|
| **Valor Fixo Escritório (R$)** | `valor_fixo_escritorio` | `30,00` | `42,00` |
| **Taxa KM Moto (R$/km)** | `taxa_km_moto` | `0,50` | `2,50` |
| **Taxa KM Carro (R$/km)** | `taxa_km_carro` | `1,00` | `4,80` |

- Inputs `type="number" step="0.01" min="0"`; rodapé com **"Salvar Alterações"** (`type=submit`).

> ⚠️ **Divergência de defaults:** o banco semeia `30 / 0,50 / 1,00`; o protótipo exibe `42 / 2,5 / 4,8`. O **banco é a fonte oficial** para o recálculo.
> **Integração com o banco:** tabela **single-row** — o salvamento é um `UPDATE ... WHERE id = <linha existente>`, **nunca** `INSERT` (não há policy de INSERT; isso é intencional). Server Action valida `is_admin()` (RLS `"Atualizacao de taxas restrita a admin"`) e os valores com **Zod** (`number ≥ 0`) antes de gravar. Estes três parâmetros são a fonte que o recálculo server-side de toda despesa consome (`quantidade_km × taxa` ou valor fixo) — ver [[Schema_RLS_Seguranca]].

---

## Resumo das mudanças decorrentes do schema

1. **Nomenclatura:** `valor → valor_calculado`, `km → quantidade_km`, tipos/status em **MAIÚSCULAS**, IDs em **uuid**.
2. **Autorização:** por flag `is_admin` (não enum de role); telas e ações administrativas guardadas por `is_admin()` + RLS.
3. **Configurações:** edição de **linha única** via `UPDATE`; defaults reais `30/0,50/1,00`.
4. **Auditoria:** campo "Hora" não persistido no schema atual; "Aprovar" = `UPDATE status='PAGO'`.
5. **Fechamento:** filtro `status='PENDENTE'`; lote = `UPDATE` server-side validado; imutabilidade pós-`PAGO` para não-admin.
6. **Dashboard:** métricas são agregações server-side; "Analistas Ativos" é derivado (sem coluna `ativo`).

---

## Ligações

- Modelagem das tabelas, RLS e validação backend: [[Schema_RLS_Seguranca]].
- Stack, primitivos e tokens visuais: [[Stack_e_Design_Tokens]].
- Diretrizes de implementação (Server Actions, Zod, Zero Trust): [[System_Prompt]].
