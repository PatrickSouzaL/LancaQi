-- ==============================================================================
-- MIGRAÇÃO 006 — Reversão de aprovação (trilha de auditoria)
-- ------------------------------------------------------------------------------
-- Rodar no SQL Editor do Supabase. Script único e idempotente.
--
-- Contexto: o Admin pode desfazer uma aprovação feita por engano na Auditoria
-- (APROVADO → PENDENTE, via `reverterAprovacao`). Para registrar esse evento na
-- tabela `public.despesas_aprovacoes`, o CHECK da coluna `acao` passa a aceitar
-- o valor 'REVERTIDA' (além de 'APROVADA' e 'NEGADA').
--
-- Nenhum dado existente é afetado. Enquanto esta migração não roda, a reversão
-- continua funcionando (o app é defensivo); apenas o registro de auditoria da
-- reversão específica não é gravado.
-- ==============================================================================

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
          AND rel.relname = 'despesas_aprovacoes'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%acao%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.despesas_aprovacoes DROP CONSTRAINT %I',
            nome_constraint
        );
    END LOOP;
END $$;

ALTER TABLE public.despesas_aprovacoes
    ADD CONSTRAINT despesas_aprovacoes_acao_check CHECK (
        acao IN ('APROVADA', 'NEGADA', 'REVERTIDA')
    );
