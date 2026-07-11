-- ==============================================================================
-- MIGRAÇÃO 003 — LançaQi vira Gestão de Despesas (não só deslocamentos)
-- ------------------------------------------------------------------------------
-- Rodar no SQL Editor do Supabase. Script único e idempotente.
--
-- O que muda em `public.despesas`:
--   1. A constraint CHECK de `tipo` passa a aceitar 11 tipos (3 deslocamentos
--      originais + 8 despesas gerais).
--   2. Nova coluna `descricao` TEXT — detalhe livre (hotel, item, motivo…).
--   3. Nova coluna `valor_declarado` DECIMAL(10,2) — valor informado pelo
--      usuário nos tipos de despesa (o servidor o copia para `valor_calculado`,
--      mantendo os dashboards somando um único campo).
--
-- Nenhum dado existente é afetado: os tipos antigos continuam válidos e as novas
-- colunas nascem NULL nas linhas já gravadas.
-- ==============================================================================

-- 1. CONSTRAINT DE TIPO ---------------------------------------------------------
-- Remove qualquer CHECK atual sobre `tipo` (o nome auto-gerado da constraint
-- inline do schema é `despesas_tipo_check`; o bloco cobre variações de nome).
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
          AND pg_get_constraintdef(con.oid) ILIKE '%tipo%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.despesas DROP CONSTRAINT %I',
            nome_constraint
        );
    END LOOP;
END $$;

-- Recria a constraint com o conjunto completo de tipos válidos.
ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_tipo_check CHECK (
        tipo IN (
            -- Deslocamentos (valor por KM ou fixo de escritório)
            'ESCRITORIO',
            'MOTO',
            'CARRO',
            -- Despesas gerais (valor declarado pelo usuário)
            'PEDAGIO',
            'ESTACIONAMENTO',
            'ALIMENTACAO_EXTERNA',
            'ALMOCO_CLIENTE',
            'LICENCA_SOFTWARE',
            'EQUIPAMENTO',
            'HOSPEDAGEM',
            'PASSAGEM'
        )
    );

-- 2. COLUNA descricao -----------------------------------------------------------
ALTER TABLE public.despesas
    ADD COLUMN IF NOT EXISTS descricao TEXT;

-- 3. COLUNA valor_declarado -----------------------------------------------------
ALTER TABLE public.despesas
    ADD COLUMN IF NOT EXISTS valor_declarado DECIMAL(10, 2);

-- Coerência financeira: quando informado, o valor declarado não pode ser
-- negativo (espelha a validação Zod no servidor).
ALTER TABLE public.despesas
    DROP CONSTRAINT IF EXISTS despesas_valor_declarado_nao_negativo;
ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_valor_declarado_nao_negativo
    CHECK (valor_declarado IS NULL OR valor_declarado >= 0);
