-- ==============================================================================
-- MIGRAÇÃO 004 — Novo tipo de despesa "OUTROS"
-- ------------------------------------------------------------------------------
-- Rodar no SQL Editor do Supabase. Script único e idempotente.
--
-- O que muda em `public.despesas`:
--   1. A constraint CHECK de `tipo` passa a aceitar 12 tipos (adiciona 'OUTROS',
--      um catch-all de despesa cujo valor é declarado pelo usuário).
--
-- A descrição obrigatória para os tipos de DESPESA (incluindo OUTROS) é
-- validada na camada da aplicação (Zod + formulário), assim como o valor
-- declarado — o banco só garante o conjunto de tipos válidos.
--
-- Nenhum dado existente é afetado: os tipos antigos continuam válidos.
-- ==============================================================================

-- Remove qualquer CHECK atual sobre `tipo` (cobre variações de nome).
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

-- Recria a constraint com o conjunto completo de tipos válidos (agora com OUTROS).
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
            'PASSAGEM',
            'OUTROS'
        )
    );
