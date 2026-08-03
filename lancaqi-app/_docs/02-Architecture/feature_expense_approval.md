---
title: Fluxo de Aprovação de Despesas
date: 2026-08-03
tags: [architecture, feature, security]
status: planned
---

# Fluxo de Aprovação de Despesas (Expense Approval Workflow)

> Projeto arquitetural da funcionalidade que insere um **gate de aprovação** entre a submissão de uma despesa pelo Analista e sua entrada no Fechamento Quinzenal. O Admin passa a **Aprovar** ou **Negar** (com motivo obrigatório) cada lançamento. Documento de planejamento — nenhum código foi escrito ainda. Ver migração em [[migration_expense_approval]] e base de segurança em [[Schema_RLS_Seguranca]].

---

## 1. Contexto e Objetivo

Hoje o ciclo de vida de uma despesa é curto e sem revisão:

1. O Analista lança a despesa → nasce com `status = 'PENDENTE'`.
2. Ela é **imediatamente** elegível ao fechamento (`getDespesasPendentes` filtra `status = 'PENDENTE'`).
3. O Admin marca o lote como `PAGO` no Fechamento Quinzenal.

Não existe nenhum ponto de controle onde o Admin possa **recusar** um lançamento antes de ele impactar o financeiro. O objetivo desta feature é inserir esse controle:

- **Analista** submete → aguarda decisão do Admin.
- **Admin** revisa a fila de pendentes e **Aprova** (segue para o fechamento) ou **Nega** (registra motivo, sai do fechamento).
- **Analista** acompanha o novo status no seu Histórico e, se negado, lê o motivo documentado.

> ⚠️ **Mudança semântica central:** `PENDENTE` deixa de significar "pronto para fechamento" e passa a significar "aguardando aprovação". O que o fechamento consome passa a ser o novo estado **`APROVADO`**. Toda a lógica que hoje filtra `PENDENTE` no contexto de fechamento precisa migrar para `APROVADO`.

Papéis e telas afetadas: ver [[Visao_Administrador]] e [[Visao_Analista]]. Itens de roadmap relacionados: [[Proximos_Passos]].

---

## 2. Máquina de Estados

Modelo escolhido: **enum único expandido** em `despesas.status` (fonte única de verdade do ciclo de vida).

```
                 (Admin: Aprovar)            (Admin/Fechamento: marcar pago)
   PENDENTE  ───────────────────────►  APROVADO  ───────────────────────►  PAGO
      │
      │ (Admin: Negar + motivo)
      ▼
   NEGADO   (terminal)
```

### Transições permitidas

| De → Para              | Ator autorizado        | Ação / Gatilho                        | Efeito no Fechamento Quinzenal        |
| ---------------------- | ---------------------- | ------------------------------------- | ------------------------------------- |
| — → `PENDENTE`         | Analista / Admin       | Criação da despesa (`criarDespesa`)   | Fora do fechamento (aguarda aprovação)|
| `PENDENTE` → `APROVADO`| **Admin**              | `aprovarDespesa(id)`                  | **Entra** no fechamento               |
| `PENDENTE` → `NEGADO`  | **Admin**              | `negarDespesa(id, motivo)`            | Excluída definitivamente              |
| `APROVADO` → `PAGO`    | **Admin**              | `marcarLotePago(ids)` (fechamento)    | Sai como quitada                      |

### Regras de imutabilidade

- **`NEGADO`** é **terminal**: não há transição de saída. Fica registrado com `motivo_negacao` para o Analista consultar.
- **`NEGADO`** e **`PAGO`** são **imutáveis para o Analista** (não pode editar nem excluir) — reforçado por RLS.
- O Analista só pode **editar/excluir** enquanto a despesa está em `PENDENTE` (antes da decisão do Admin).
- As actions de decisão são **idempotentes por guarda de estado**: o `UPDATE` só afeta linhas ainda em `PENDENTE` (`... WHERE id = ? AND status = 'PENDENTE'`), evitando dupla decisão ou corrida.

---

## 3. Impacto no Código Existente

Mapeamento concreto das alterações necessárias (sem reescrever os arquivos aqui — apenas o ponto e a natureza da mudança):

| Arquivo / símbolo                                  | Mudança                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `lib/tipos` / `lib/types.ts` → `StatusDespesa`     | Incluir `'APROVADO' \| 'NEGADO'` no union; adicionar rótulos/badges e cores para os novos estados.                   |
| `lib/data/despesas.ts` → `getDespesasPendentes()`  | Passa a filtrar **`status = 'APROVADO'`** (é o que o fechamento consome).                                            |
| `lib/data/despesas.ts` → **nova** `getDespesasParaAprovacao(periodo?)` | Filtra `status = 'PENDENTE'`, com join `usuarios(nome)` via `DESPESA_SELECT`, ordenada por `data`/`criado_em`. Alimenta a fila de aprovações. |
| `components/admin/FechamentoClient.tsx` → `selecionaveis` | Filtro muda de `'PENDENTE'` para `'APROVADO'`.                                                                 |
| `app/actions/admin-actions.ts` → `aprovarDespesa()`| **Realinhar semântica**: hoje faz `PENDENTE → PAGO`. Passa a fazer `PENDENTE → APROVADO` + log de auditoria. A transição para `PAGO` continua sendo responsabilidade de `marcarLotePago()` no fechamento. Evitar colisão semântica (avaliar renomear a intenção antiga). |

> A mudança em `getDespesasPendentes()` é o ponto mais sensível: qualquer dashboard/soma que dependa dele para representar "a pagar" agora reflete apenas `APROVADO`. Revisar KPIs do dashboard admin ao implementar.

---

## 4. Endpoints / Server Actions

Todas as actions reutilizam o guard `exigirAdmin()` (`lib/data/guards.ts`) e o **retorno discriminado** padrão do projeto:

```ts
type ActionState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
```

Ao final de toda mutação bem-sucedida: `revalidarListagens()` (revalida as rotas afetadas).

| Action                        | Arquivo                       | Guard          | Entrada                  | Efeito no banco                                                                                                   |
| ----------------------------- | ----------------------------- | -------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `aprovarDespesa(id)`          | `app/actions/admin-actions.ts`| `exigirAdmin()`| `id` (UUID, `z.string().uuid()`) | `UPDATE despesas SET status='APROVADO', aprovador_id=<uid>, decidido_em=now() WHERE id=? AND status='PENDENTE'` + `INSERT INTO despesas_aprovacoes (despesa_id, aprovador_id, acao) VALUES (?, <uid>, 'APROVADA')` |
| `negarDespesa(id, motivo)`    | `app/actions/admin-actions.ts`| `exigirAdmin()`| `id` (UUID) + `motivo` (`z.string().trim().min(1).max(1000)`) | `UPDATE despesas SET status='NEGADO', motivo_negacao=?, aprovador_id=<uid>, decidido_em=now() WHERE id=? AND status='PENDENTE'` + `INSERT INTO despesas_aprovacoes (despesa_id, aprovador_id, acao, motivo) VALUES (?, <uid>, 'NEGADA', ?)` |

Notas de implementação:

- **Motivo obrigatório**: validar com Zod antes de qualquer acesso ao banco; retornar `fieldErrors.motivo` quando vazio.
- **Escopo do Admin**: por RLS + `exigirAdmin()`, o Admin só decide sobre despesas às quais tem acesso. Se no futuro houver múltiplos escritórios/escopos, a fila deve respeitar o escopo do aprovador.
- **Atomicidade**: idealmente o `UPDATE` + `INSERT` do log ocorrem na mesma unidade lógica. Como o acesso é via PostgREST, considerar uma função RPC (`SECURITY DEFINER`) `decidir_despesa(id, acao, motivo)` para garantir atomicidade e centralizar a regra; caso contrário, ordenar `UPDATE` (com guarda de estado) antes do `INSERT` do log.

---

## 5. Componentes de Frontend

| Componente / arquivo                                   | Tipo             | Papel                                                                                          |
| ------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------- |
| `app/(admin)/admin/aprovacoes/page.tsx`                | Server Component | Nova rota. Carrega a fila via `getDespesasParaAprovacao()` e renderiza o `ApprovalDashboard`.  |
| `ApprovalDashboard` → `components/admin/AprovacoesClient.tsx` | Client Component | Lista os pendentes (analista, data, tipo, valor, cliente) com botões **Aprovar** / **Negar** por linha; estados de loading/empty. |
| `RejectionModal` → `components/admin/NegarDespesaButton.tsx`  | Client Component | Reutiliza `components/ui/alert-dialog.tsx` + `Textarea` para capturar o **Motivo da Negação** (obrigatório). `useTransition()` + `toast` (Sonner). Espelha o padrão de `components/admin/AprovarDespesaButton.tsx`. |
| `AprovarDespesaButton` (ajuste) → `components/admin/AprovarDespesaButton.tsx` | Client Component | Confirmação simples (AlertDialog) chamando `aprovarDespesa(id)`.                                |
| Navegação → `lib/navegacao.ts` (`NAV_ADMIN`)           | Config           | Novo item **"Aprovações"** (`/admin/aprovacoes`), ícone lucide `ClipboardCheck`/`BadgeCheck`, posicionado entre "Novo Lançamento" e "Auditoria". |
| Histórico do Analista → `components/analista/*`         | Client/Server    | Badge dos 4 status (Pendente / Aprovado / Negado / Pago). Ao abrir um item `NEGADO`, exibir `motivo_negacao` como **texto puro**. |

### Fluxo de estado da UI (Negação)

```
[Botão "Negar"] → abre RejectionModal
   → usuário digita "Motivo da Negação"
   → submit dentro de startTransition:
        resultado = await negarDespesa(id, motivo)
        ok      → toast.success("Despesa negada."); fecha modal; revalida lista
        !ok     → toast.error(resultado.error); mantém modal; mostra fieldErrors.motivo
```

O motivo digitado é renderizado no Histórico do Analista via JSX comum (`{despesa.motivo_negacao}`) — **sem** `dangerouslySetInnerHTML` — o que garante escape automático de HTML pelo React.

---

## 6. Requisitos de Segurança (Security by Design)

### RBAC — Role-Based Access Control

Dupla barreira, coerente com o resto do app:

1. **Camada de aplicação** — toda action de decisão inicia com `exigirAdmin()` (`lib/data/guards.ts`), que valida sessão (`auth.getUser()`) e `usuarios.is_admin`. Analista recebe `{ ok: false, error: "Ação restrita a administradores." }` e **nunca** alcança a mutação.
2. **Camada de banco (RLS)** — as políticas usando `public.is_admin()` garantem o controle mesmo que a chamada tente burlar a aplicação. Ver [[migration_expense_approval]] para as políticas de `despesas` (UPDATE) e da nova `despesas_aprovacoes`.

> Esconder o item "Aprovações" do menu **não** é barreira de segurança — é apenas UX. A barreira real são `exigirAdmin()` + RLS.

### Sanitização do "Motivo da Negação"

- **SQL Injection:** o input jamais é concatenado em SQL. Todo acesso passa pelo cliente Supabase/PostgREST com parâmetros (`.update({ motivo_negacao })`, `.eq("id", id)`, `.insert({ ... })`), que parametriza os valores. Não há `string interpolation` em query.
- **XSS:** o motivo é renderizado como **texto puro** no React (escape automático). Proibido `dangerouslySetInnerHTML` para esse campo.
- **Limites:** Zod aplica `trim()`, `min(1)` (obrigatório) e `max(1000)` (evita payloads/abuso), espelhando a validação já usada em `descricao`.

### Trilha de Auditoria (Audit Logging)

- **Inline em `despesas`:** `aprovador_id` (quem decidiu por último) e `decidido_em` (quando) — leitura rápida do estado atual.
- **Histórico completo em `despesas_aprovacoes`:** cada decisão gera um registro imutável (`despesa_id`, `aprovador_id`, `acao`, `motivo`, `criado_em`), permitindo reconstruir a linha do tempo para compliance.

Detalhes de schema, índices, RLS e rollback: [[migration_expense_approval]].

---

## 7. Checklist de Implementação (referência para o desenvolvimento)

- [ ] Rodar `Migracao_005_Aprovacao_Despesas.sql` (ver [[migration_expense_approval]]).
- [ ] Atualizar `StatusDespesa` e rótulos/badges de status.
- [ ] `getDespesasPendentes()` → filtrar `APROVADO`; criar `getDespesasParaAprovacao()`.
- [ ] Ajustar `FechamentoClient.tsx` (`selecionaveis` → `APROVADO`).
- [ ] Realinhar `aprovarDespesa()` (→ `APROVADO` + log); criar `negarDespesa()`.
- [ ] Criar rota `/admin/aprovacoes` + `AprovacoesClient` + `NegarDespesaButton`.
- [ ] Inserir item "Aprovações" em `NAV_ADMIN`.
- [ ] Histórico do Analista: badges dos 4 status + exibição do motivo em `NEGADO`.
- [ ] Revisar KPIs do dashboard admin que dependiam de `PENDENTE`.
