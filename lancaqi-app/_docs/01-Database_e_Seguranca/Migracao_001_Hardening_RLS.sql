-- ==============================================================================
-- MIGRAÇÃO 001 — Hardening de RLS e integridade (LançaQi)
-- ------------------------------------------------------------------------------
-- Aplicar no SQL Editor do Supabase APÓS o schema.sql. Idempotente.
--
-- Contexto (Proximos_Passos.md → 🔵 Segurança / Hardening):
--   1. WITH CHECK explícito na UPDATE de `despesas` para impedir escalonamento
--      horizontal (reatribuição de `usuario_id`) e auto-aprovação (analista
--      mudando `status` para 'PAGO').
--   2. Constraints CHECK de não-negatividade em valores monetários/km.
--
-- Nota: o PostgreSQL já usa a expressão de USING como WITH CHECK quando esta é
-- omitida — então a política atual JÁ impede, na prática, que um analista
-- altere `usuario_id` ou marque a própria despesa como 'PAGO'. Esta migração
-- torna a intenção EXPLÍCITA (legível e à prova de edições futuras) e separa
-- claramente o caminho do analista do caminho do admin.
-- ==============================================================================

-- 1. UPDATE de despesas: USING (linha ANTIGA) + WITH CHECK (linha NOVA) -------
DROP POLICY IF EXISTS "Atualizacao de despesas" ON public.despesas;

CREATE POLICY "Atualizacao de despesas" ON public.despesas
    FOR UPDATE
    USING (
        -- Quem PODE tocar a linha: dona enquanto PENDENTE, ou admin.
        (auth.uid() = usuario_id AND status = 'PENDENTE')
        OR public.is_admin()
    )
    WITH CHECK (
        -- Como a linha PODE ficar após a edição:
        --  • analista: continua sendo dela e continua PENDENTE
        --    (não pode reatribuir usuario_id nem se auto-aprovar);
        --  • admin: liberado (aprovar = mudar status para 'PAGO').
        (auth.uid() = usuario_id AND status = 'PENDENTE')
        OR public.is_admin()
    );

-- 2. Integridade de valores (Proximos_Passos.md → 🟢 Evoluções de Schema) -----
ALTER TABLE public.despesas
    DROP CONSTRAINT IF EXISTS despesas_quantidade_km_nao_negativo;
ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_quantidade_km_nao_negativo
    CHECK (quantidade_km IS NULL OR quantidade_km >= 0);

ALTER TABLE public.despesas
    DROP CONSTRAINT IF EXISTS despesas_valor_calculado_nao_negativo;
ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_valor_calculado_nao_negativo
    CHECK (valor_calculado >= 0);

ALTER TABLE public.configuracoes_taxas
    DROP CONSTRAINT IF EXISTS taxas_nao_negativas;
ALTER TABLE public.configuracoes_taxas
    ADD CONSTRAINT taxas_nao_negativas
    CHECK (
        valor_fixo_escritorio >= 0
        AND taxa_km_moto >= 0
        AND taxa_km_carro >= 0
    );

-- ==============================================================================
-- VERIFICAÇÃO RÁPIDA (rodar como um analista, via app):
--   • UPDATE despesas SET status='PAGO' WHERE id=<própria pendente>;  -> 0 linhas
--   • UPDATE despesas SET usuario_id=<outro> WHERE id=<própria>;      -> erro/0
--   • DELETE FROM despesas WHERE id=<própria já PAGA>;                -> 0 linhas
-- ==============================================================================
