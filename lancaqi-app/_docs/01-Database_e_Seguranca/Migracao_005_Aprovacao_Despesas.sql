-- ==============================================================================
-- MIGRAÇÃO 005 — Fluxo de Aprovação de Despesas
-- ------------------------------------------------------------------------------
-- Rodar no SQL Editor do Supabase. Script único e idempotente.
--
-- O que muda em `public.despesas`:
--   1. A constraint CHECK de `status` passa a aceitar 4 estados: PENDENTE,
--      APROVADO, NEGADO, PAGO (antes só PENDENTE/PAGO). O Admin passa a Aprovar
--      ou Negar um lançamento antes de ele entrar no Fechamento Quinzenal.
--   2. Colunas de auditoria inline: `aprovador_id`, `decidido_em`, `motivo_negacao`.
--   3. CHECK de coerência: `motivo_negacao` obrigatório quando status='NEGADO'
--      e nulo nos demais estados.
--
-- Novas estruturas:
--   4. Tabela `public.despesas_aprovacoes` — histórico imutável de cada decisão.
--   5. RLS na nova tabela + reforço da política UPDATE de `despesas`.
--   6. Índices para acelerar a fila do Admin e o join de auditoria.
--
-- Nenhum dado existente é afetado: os status antigos continuam válidos e as novas
-- colunas nascem NULL nas linhas já gravadas. Rollback documentado em
-- migration_expense_approval.md (seção "Script DOWN").
-- ==============================================================================

-- 1. CONSTRAINT DE STATUS (PENDENTE | APROVADO | NEGADO | PAGO) ------------------
-- Remove qualquer CHECK atual sobre `status` (o nome auto-gerado da constraint
-- inline do schema costuma ser `despesas_status_check`; o bloco cobre variações).
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

-- 5. SEGURANÇA: RLS -------------------------------------------------------------
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
