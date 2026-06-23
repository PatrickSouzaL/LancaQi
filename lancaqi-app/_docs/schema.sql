-- ==============================================================================
-- 1. ESTRUTURA DAS TABELAS
-- ==============================================================================

-- Tabela de Usuários (Sincronizada com auth.users)
CREATE TABLE public.usuarios (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nome TEXT,
    is_admin BOOLEAN DEFAULT FALSE
);

-- Tabela de Configurações de Taxas (Linha Única)
CREATE TABLE public.configuracoes_taxas (
    id SERIAL PRIMARY KEY,
    valor_fixo_escritorio DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    taxa_km_moto DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    taxa_km_carro DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

-- Insere uma linha inicial padrão para garantir que a tabela seja de "linha única"
INSERT INTO public.configuracoes_taxas (valor_fixo_escritorio, taxa_km_moto, taxa_km_carro)
VALUES (30.00, 0.50, 1.00);

-- Tabela de Despesas (Transacional)
CREATE TABLE public.despesas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    origem TEXT,
    destino TEXT,
    tipo TEXT CHECK (tipo IN ('ESCRITORIO', 'MOTO', 'CARRO')) NOT NULL,
    quantidade_km DECIMAL(10, 2),
    valor_calculado DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('PENDENTE', 'PAGO')) DEFAULT 'PENDENTE' NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. INTEGRAÇÃO DE AUTENTICAÇÃO (TRIGGER)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name' 
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 3. FUNÇÃO UTILITÁRIA PARA CHECAGEM DE ADMIN 
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT is_admin FROM public.usuarios WHERE id = auth.uid();
$$;

-- ==============================================================================
-- 4. SEGURANÇA: HABILITANDO RLS
-- ==============================================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_taxas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. POLÍTICAS DE ACESSO (RLS)
-- ==============================================================================
DROP POLICY IF EXISTS "Usuários veem o próprio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Leitura geral das taxas para usuários logados" ON public.configuracoes_taxas;
DROP POLICY IF EXISTS "Analistas gerenciam apenas as próprias despesas" ON public.despesas;

-- POLÍTICAS DA TABELA: usuarios
CREATE POLICY "Leitura de usuarios" ON public.usuarios
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- POLÍTICAS DA TABELA: configuracoes_taxas
CREATE POLICY "Leitura de taxas" ON public.configuracoes_taxas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Atualizacao de taxas restrita a admin" ON public.configuracoes_taxas
    FOR UPDATE USING (public.is_admin());

-- POLÍTICAS DA TABELA: despesas
CREATE POLICY "Leitura de despesas" ON public.despesas
    FOR SELECT USING (auth.uid() = usuario_id OR public.is_admin());

CREATE POLICY "Insercao de despesas" ON public.despesas
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Atualizacao de despesas" ON public.despesas
    FOR UPDATE USING (
        (auth.uid() = usuario_id AND status = 'PENDENTE') 
        OR public.is_admin()
    );

CREATE POLICY "Exclusao de despesas" ON public.despesas
    FOR DELETE USING (
        (auth.uid() = usuario_id AND status = 'PENDENTE') 
        OR public.is_admin()
    );