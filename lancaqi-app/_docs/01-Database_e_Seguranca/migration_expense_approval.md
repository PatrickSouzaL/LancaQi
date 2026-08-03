---
title: Migração SQL - Aprovação de Despesas
date: 2026-08-03
tags: [database, sql, migration]
status: planned
---

# Migração SQL — Aprovação de Despesas

> Alterações de banco que suportam o [[feature_expense_approval|Fluxo de Aprovação de Despesas]]. Introduz os estados `APROVADO` e `NEGADO`, colunas de auditoria inline em `public.despesas` e a tabela de histórico `public.despesas_aprovacoes`. O script `UP` executável correspondente está em `Migracao_005_Aprovacao_Despesas.sql`. Base de segurança: [[Schema_RLS_Seguranca]].

---

## 1. Resumo das mudanças

Sobre `public.despesas`:

1. A constraint `CHECK` de `status` passa a aceitar **4 estados**: `PENDENTE`, `APROVADO`, `NEGADO`, `PAGO` (antes só `PENDENTE`/`PAGO`).
2. Novas colunas de auditoria inline: `aprovador_id` (FK → `usuarios`), `decidido_em` (timestamptz), `motivo_negacao` (text).
3. `CHECK` de coerência: `motivo_negacao` **obrigatório** quando `status='NEGADO'` e **nulo** nos demais estados.

Novas estruturas:

4. Tabela `public.despesas_aprovacoes` — log imutável de cada decisão (aprovação/negação).
5. RLS na nova tabela + reforço da política `UPDATE` de `despesas` (Analista só mexe em `PENDENTE`).
6. Índices para acelerar a fila do Admin e o join de auditoria.

**Compatibilidade:** nenhum dado existente é afetado. Linhas atuais em `PENDENTE`/`PAGO` continuam válidas; as novas colunas nascem `NULL`. O script é **idempotente** (re-executável com segurança) seguindo o padrão de `Migracao_003_Gestao_de_Despesas.sql`.

---

## 2. Script `UP`

```sql
-- ==============================================================================
-- MIGRAÇÃO 005 — Fluxo de Aprovação de Despesas
-- Idempotente. Rodar no SQL Editor do Supabase.
-- ==============================================================================

-- 1. CONSTRAINT DE STATUS (PENDENTE | APROVADO | NEGADO | PAGO) ------------------
-- Remove qualquer CHECK atual sobre `status` (nome inline auto-gerado costuma ser
-- `despesas_status_check`; o bloco cobre variações de nome).
DO $$
DECLARE
    nome_constraint TEXT;
BEGIN
    FOR nome_constraint IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'despesas'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%status%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.despesas DROP CONSTRAINT %I',
            nome_constraint
        );
    END LOOP;
END $$;

ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_status_check CHECK (
        status IN ('PENDENTE', 'APROVADO', 'NEGADO', 'PAGO')
    );

-- 2. COLUNAS DE AUDITORIA INLINE ------------------------------------------------
ALTER TABLE public.despesas
    ADD COLUMN IF NOT EXISTS aprovador_id UUID
        REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE public.despesas
    ADD COLUMN IF NOT EXISTS decidido_em TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.despesas
    ADD COLUMN IF NOT EXISTS motivo_negacao TEXT;

-- 3. COERÊNCIA: motivo obrigatório apenas quando NEGADO -------------------------
ALTER TABLE public.despesas
    DROP CONSTRAINT IF EXISTS despesas_motivo_negacao_coerente;
ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_motivo_negacao_coerente CHECK (
        (status =  'NEGADO' AND motivo_negacao IS NOT NULL AND length(btrim(motivo_negacao)) > 0)
        OR
        (status <> 'NEGADO' AND motivo_negacao IS NULL)
    );

-- 4. TABELA DE AUDITORIA (histórico completo de decisões) -----------------------
CREATE TABLE IF NOT EXISTS public.despesas_aprovacoes (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    despesa_id    UUID NOT NULL REFERENCES public.despesas(id) ON DELETE CASCADE,
    aprovador_id  UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    acao          TEXT NOT NULL CHECK (acao IN ('APROVADA', 'NEGADA')),
    motivo        TEXT,
    criado_em     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. RLS ------------------------------------------------------------------------
ALTER TABLE public.despesas_aprovacoes ENABLE ROW LEVEL SECURITY;

-- Leitura: admin vê tudo; o dono da despesa vê as decisões da própria despesa.
DROP POLICY IF EXISTS "Leitura de aprovacoes" ON public.despesas_aprovacoes;
CREATE POLICY "Leitura de aprovacoes" ON public.despesas_aprovacoes
    FOR SELECT USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.despesas d
            WHERE d.id = despesa_id AND d.usuario_id = auth.uid()
        )
    );

-- Escrita: somente administradores registram decisões.
DROP POLICY IF EXISTS "Insercao de aprovacoes restrita a admin" ON public.despesas_aprovacoes;
CREATE POLICY "Insercao de aprovacoes restrita a admin" ON public.despesas_aprovacoes
    FOR INSERT WITH CHECK (public.is_admin());

-- Reforço da política UPDATE de despesas: Analista só edita enquanto PENDENTE;
-- WITH CHECK impede reatribuir usuario_id ou "sair" de PENDENTE por conta própria.
DROP POLICY IF EXISTS "Atualizacao de despesas" ON public.despesas;
CREATE POLICY "Atualizacao de despesas" ON public.despesas
    FOR UPDATE USING (
        (auth.uid() = usuario_id AND status = 'PENDENTE')
        OR public.is_admin()
    )
    WITH CHECK (
        (auth.uid() = usuario_id AND status = 'PENDENTE')
        OR public.is_admin()
    );

-- 6. ÍNDICES --------------------------------------------------------------------
-- Aba do Admin filtra despesas por status (fila de aprovação e fechamento).
CREATE INDEX IF NOT EXISTS idx_despesas_status
    ON public.despesas(status);

-- Índice parcial dedicado à fila de aprovações (status='PENDENTE'): menor e mais
-- rápido, pois indexa apenas as linhas realmente consultadas nessa tela.
CREATE INDEX IF NOT EXISTS idx_despesas_pendentes_aprovacao
    ON public.despesas(criado_em)
    WHERE status = 'PENDENTE';

-- Join da trilha de auditoria por despesa.
CREATE INDEX IF NOT EXISTS idx_despesas_aprovacoes_despesa_id
    ON public.despesas_aprovacoes(despesa_id);
```

---

## 3. Script `DOWN` (rollback seguro)

> ⚠️ **Atenção antes do rollback:** o `DOWN` restaura o `CHECK` antigo `('PENDENTE','PAGO')`. Se existirem linhas em `APROVADO` ou `NEGADO`, o `ADD CONSTRAINT` falhará. **Migre os dados primeiro** — por exemplo, `APROVADO → PENDENTE` (volta para a fila) e trate `NEGADO` conforme a política de negócio (voltar para `PENDENTE` ou arquivar antes de excluir). O passo de saneamento abaixo faz isso de forma conservadora.

```sql
-- ==============================================================================
-- ROLLBACK DA MIGRAÇÃO 005
-- ==============================================================================

-- 0. SANEAMENTO: garantir que só existam status compatíveis com o CHECK antigo.
--    (Conservador: aprovadas e negadas voltam para a fila de pendentes.)
UPDATE public.despesas SET status = 'PENDENTE'
    WHERE status IN ('APROVADO', 'NEGADO');

-- 1. Remover tabela de auditoria e seus índices/policies (CASCADE limpa policies).
DROP TABLE IF EXISTS public.despesas_aprovacoes CASCADE;

-- 2. Remover índices criados sobre despesas.
DROP INDEX IF EXISTS public.idx_despesas_status;
DROP INDEX IF EXISTS public.idx_despesas_pendentes_aprovacao;

-- 3. Remover constraint de coerência e colunas de auditoria inline.
ALTER TABLE public.despesas DROP CONSTRAINT IF EXISTS despesas_motivo_negacao_coerente;
ALTER TABLE public.despesas DROP COLUMN IF EXISTS motivo_negacao;
ALTER TABLE public.despesas DROP COLUMN IF EXISTS decidido_em;
ALTER TABLE public.despesas DROP COLUMN IF EXISTS aprovador_id;

-- 4. Reverter o CHECK de status para o conjunto original.
ALTER TABLE public.despesas DROP CONSTRAINT IF EXISTS despesas_status_check;
ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_status_check CHECK (status IN ('PENDENTE', 'PAGO'));

-- 5. Reverter a política UPDATE ao formato anterior (sem WITH CHECK explícito).
DROP POLICY IF EXISTS "Atualizacao de despesas" ON public.despesas;
CREATE POLICY "Atualizacao de despesas" ON public.despesas
    FOR UPDATE USING (
        (auth.uid() = usuario_id AND status = 'PENDENTE')
        OR public.is_admin()
    );
```

---

## 4. Notas de índices e performance

- **`idx_despesas_status`** — cobre tanto a fila de aprovação (`status='PENDENTE'`) quanto o fechamento (`status='APROVADO'`). Índice B-tree simples, suficiente para a cardinalidade baixa de status.
- **`idx_despesas_pendentes_aprovacao`** (índice **parcial**) — otimiza especificamente a tela "Aprovações", que é a de acesso mais frequente do Admin. Indexa `criado_em` apenas nas linhas `PENDENTE`, permitindo ordenar a fila (mais antigas primeiro) sem varrer a tabela inteira. À medida que despesas saem de `PENDENTE`, elas deixam o índice, mantendo-o pequeno.
- **`idx_despesas_aprovacoes_despesa_id`** — acelera a leitura do histórico de decisões de uma despesa (join/lookup por `despesa_id`).
- O `CHECK despesas_motivo_negacao_coerente` é a garantia no banco de que **toda** despesa negada tem motivo — a validação Zod na Server Action é a primeira linha; o `CHECK` é a rede de segurança (defense in depth).

Relacionados: [[feature_expense_approval]] · [[Schema_RLS_Seguranca]] · [[Proximos_Passos]]
