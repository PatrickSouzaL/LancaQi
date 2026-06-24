    -- ==============================================================================
    -- MIGRAÇÃO 002 — Consolidação de `clientes` + vínculo com `despesas`
    -- ------------------------------------------------------------------------------
    -- Rodar no SQL Editor do Supabase. Script único, idempotente.
    --
    -- Contrato consolidado de `clientes`:
    --   nome (NOT NULL), endereco (opcional), cnpj (opcional), telefone (opcional).
    -- E vínculo opcional `despesas.cliente_id` (despesas de ESCRITORIO não têm
    -- cliente) com ON DELETE SET NULL para preservar o histórico financeiro.
    --
    -- ⚠️ O bloco 1 recria a tabela `clientes` do zero (DROP ... CASCADE). Em
    -- desenvolvimento, sem dados relevantes, é seguro. Se já houver clientes reais
    -- cadastrados, use o BLOCO ALTERNATIVO (ALTER) no rodapé em vez do bloco 1.
    -- ==============================================================================

    -- 1. TABELA clientes (contrato novo) ------------------------------------------
    DROP TABLE IF EXISTS public.clientes CASCADE;

    CREATE TABLE public.clientes (
        id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nome       TEXT NOT NULL,
        endereco   TEXT,
        cnpj       TEXT,
        telefone   TEXT,
        criado_em  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 2. RLS de clientes ----------------------------------------------------------
    ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

    -- Leitura: qualquer usuário autenticado (útil para popular selects no front).
    DROP POLICY IF EXISTS "Leitura de clientes para autenticados" ON public.clientes;
    CREATE POLICY "Leitura de clientes para autenticados"
        ON public.clientes
        FOR SELECT
        TO authenticated
        USING (true);

    -- Escrita (INSERT/UPDATE/DELETE): apenas administradores (is_admin = true).
    DROP POLICY IF EXISTS "Escrita de clientes restrita a admin" ON public.clientes;
    CREATE POLICY "Escrita de clientes restrita a admin"
        ON public.clientes
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.usuarios u
                WHERE u.id = auth.uid() AND u.is_admin = true
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.usuarios u
                WHERE u.id = auth.uid() AND u.is_admin = true
            )
        );

    -- 3. VÍNCULO despesas → clientes ----------------------------------------------
    -- Coluna opcional (despesas de ESCRITORIO não têm cliente).
    ALTER TABLE public.despesas
        ADD COLUMN IF NOT EXISTS cliente_id UUID;

    -- (Re)cria a FK com ON DELETE SET NULL: excluir um cliente NÃO apaga despesas,
    -- apenas zera o vínculo — o histórico financeiro é preservado.
    ALTER TABLE public.despesas
        DROP CONSTRAINT IF EXISTS despesas_cliente_id_fkey;
    ALTER TABLE public.despesas
        ADD CONSTRAINT despesas_cliente_id_fkey
        FOREIGN KEY (cliente_id)
        REFERENCES public.clientes(id)
        ON DELETE SET NULL;

    -- Índice para filtros/joins por cliente.
    CREATE INDEX IF NOT EXISTS idx_despesas_cliente_id
        ON public.despesas(cliente_id);

    -- ==============================================================================
    -- BLOCO ALTERNATIVO (somente se PRECISAR preservar dados existentes em
    -- `clientes`): em vez do bloco 1 acima, evolua o schema antigo sem DROP.
    -- ------------------------------------------------------------------------------
    -- ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS endereco TEXT;
    -- ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cnpj TEXT;
    -- -- migra o antigo `documento` para `cnpj`, se aplicável:
    -- UPDATE public.clientes SET cnpj = documento WHERE cnpj IS NULL AND documento IS NOT NULL;
    -- ALTER TABLE public.clientes DROP COLUMN IF EXISTS documento;
    -- ALTER TABLE public.clientes DROP COLUMN IF EXISTS email;
    -- (RLS e bloco 3 permanecem iguais.)
    -- ==============================================================================
