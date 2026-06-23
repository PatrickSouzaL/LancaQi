# ADR 001 — Estrutura de rotas e reconciliação com os contratos

- **Status:** Aceito
- **Data:** 2026-06-23
- **Contexto:** Implementação da área admin com mock data. O plano de execução
  e os contratos do vault (`_docs/`) divergiam em alguns pontos. Os contratos
  são a **fonte de verdade**, então as divergências foram resolvidas a favor deles.

## Decisões

### 1. Route Group `app/(admin)/` com rotas dedicadas
Adotado `(admin)/{dashboard,auditoria,fechamento,configuracoes}/page.tsx` com um
`layout.tsx` de casca (Server Component). O protótipo original montava tudo numa
única `page.tsx`; evoluímos para rotas reais (navegação por URL, estado ativo,
preparação para guarda de sessão/`is_admin()` no servidor). `/` redireciona para
`/dashboard`.

### 2. `status` = `PENDENTE | PAGO` (sem `REJEITADO`)
O plano citava `REJEITADO`, mas o `schema.sql` tem `CHECK (status IN ('PENDENTE','PAGO'))`.
Seguimos o schema. Consequência: o Sheet de Auditoria usa **"Aprovar Despesa"**
(→ UPDATE status='PAGO') e **"Cancelar"** (SheetClose), conforme o fluxo de
[[Visao_Administrador]] — e não "Marcar como Pago"/"Rejeitar".

### 3. Configurações = 3 campos da linha única (não "taxa por km" por tipo)
O plano sugeria um input de "taxa por km" para cada tipo, mas ESCRITORIO é
**valor fixo por dia**, não por km. O formulário edita os campos reais de
`configuracoes_taxas`: `valor_fixo_escritorio`, `taxa_km_moto`, `taxa_km_carro`.
Defaults oficiais do seed: 30 / 0,50 / 1,00.

### 4. Ícones e rótulos da navegação conforme o contrato
Dashboard (`LayoutDashboard`), Auditoria (`ShieldCheck`), Fechamento Quinzenal
(`CalendarClock`), Configurações de Taxas (`SlidersHorizontal`) — de
[[Visao_Administrador]], não a lista genérica do plano.

### 5. Tipos em MAIÚSCULAS no modelo; labels PT na apresentação
`Despesa.tipo`/`status` usam os valores do banco. O de/para para "Escritório"/
"Pago" fica isolado em `lib/format.ts`, evitando comparações por string com
acentuação/caixa divergente.

### 6. Gráficos como placeholder
Recharts não está no `package.json`; os gráficos do Dashboard são placeholders
(a distribuição por tipo usa barras CSS com a paleta de charts). Substituir por
`ChartContainer` quando a dependência entrar.

## Consequências
- UI 100% sobre `lib/data/*` (mock), pronta para troca por Supabase sem mexer nas telas.
- Segurança (RLS, Zod, recálculo server-side) documentada como alvo; handlers atuais são `console.log`.

Ver também: [[Dev_Notes]], [[Schema_RLS_Seguranca]], [[System_Prompt]].
