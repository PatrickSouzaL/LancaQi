# Schema, RLS e Segurança

> Base de conhecimento do banco de dados do sistema **LançaQi — Gestão de Deslocamentos** (Next.js + Supabase).
> **Fonte de verdade:** `schema.sql` (raiz do projeto). Este documento reflete o schema real implantado, complementado pela inteligência de negócio do front-end (`lib/mock-data.ts`) e pelas diretrizes DevSecOps.

---

## Contexto de Negócio

Sistema corporativo interno para **gestão e reembolso de deslocamentos** em modelo híbrido. Cada analista submete despesas de deslocamento de três tipos, e o administrador audita, aprova e fecha quinzenalmente.

| Tipo (`tipo` no banco) | Regra de cálculo | Default no banco | Default no mock (front) |
|------------------------|------------------|------------------|--------------------------|
| `ESCRITORIO` | Valor fixo por dia presencial | `valor_fixo_escritorio = 30,00` | `42,00` |
| `MOTO` | `quantidade_km × taxa_km_moto` | `taxa_km_moto = 0,50` | `2,50` |
| `CARRO` | `quantidade_km × taxa_km_carro` | `taxa_km_carro = 1,00` | `4,80` |

> ⚠️ **Divergência de dados:** os valores-semente do banco (`30 / 0,50 / 1,00`) **não** correspondem às tarifas exibidas no protótipo (`42 / 2,5 / 4,8`). O mock é ilustrativo; o banco é a fonte oficial para o recálculo.

---

## Entidades Principais (conforme `schema.sql`)

### 1. `public.usuarios` — sincronizada com `auth.users`

```sql
CREATE TABLE public.usuarios (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nome TEXT,
    is_admin BOOLEAN DEFAULT FALSE
);
```

| Coluna | Tipo | Observação |
|--------|------|-----------|
| `id` | `uuid` (PK, FK → `auth.users.id`, `ON DELETE CASCADE`) | Igual ao id do Supabase Auth |
| `email` | `text` (unique, not null) | E-mail corporativo |
| `nome` | `text` (nullable) | Preenchido pelo trigger a partir de `raw_user_meta_data->>'full_name'` |
| `is_admin` | `boolean` (default `false`) | **Flag de autorização — base da função `is_admin()`** |

> **Autorização por flag booleana**, não por enum de role. Não há tabela de roles; o privilégio administrativo é `is_admin = true`.
> **Não existem** no banco os campos `iniciais`, `ativo` ou `created_at` em `usuarios` — as iniciais e a métrica "Analistas Ativos" do dashboard são derivadas/calculadas na aplicação.

### 2. `public.configuracoes_taxas` — tabela de **linha única**

```sql
CREATE TABLE public.configuracoes_taxas (
    id SERIAL PRIMARY KEY,
    valor_fixo_escritorio DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    taxa_km_moto DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    taxa_km_carro DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);
-- Seed inicial garantindo a linha única:
INSERT INTO public.configuracoes_taxas (...) VALUES (30.00, 0.50, 1.00);
```

| Coluna | Tipo | Observação |
|--------|------|-----------|
| `id` | `serial` (PK) | Inteiro sequencial |
| `valor_fixo_escritorio` | `decimal(10,2)` | Valor pago por dia presencial |
| `taxa_km_moto` | `decimal(10,2)` | R$/km de moto |
| `taxa_km_carro` | `decimal(10,2)` | R$/km de carro |

> **Padrão "single-row":** a tabela é mantida com **uma única linha** (seed inicial). A tela de Configurações faz `UPDATE` nessa linha — **não há versionamento** (`vigente`/histórico) nem `taxa_id` em `despesas`. Se rastreabilidade histórica de tarifas vier a ser exigida, será uma evolução de schema (ver "Evoluções sugeridas").

### 3. `public.despesas` — transacional

```sql
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
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);
```

| Coluna | Tipo | Observação |
|--------|------|-----------|
| `id` | `uuid` (PK, `gen_random_uuid()`) | Gerado pelo banco (não `D-1042` como no mock) |
| `usuario_id` | `uuid` (FK → `usuarios.id`, `ON DELETE CASCADE`, not null) | **Dono do registro — chave da RLS** |
| `data` | `date` (not null) | Data do deslocamento |
| `origem` | `text` (nullable) | Endereço de origem |
| `destino` | `text` (nullable) | Endereço de destino |
| `tipo` | `text` + CHECK (`ESCRITORIO`/`MOTO`/`CARRO`) | **Valores em MAIÚSCULAS** |
| `quantidade_km` | `decimal(10,2)` (nullable) | Distância (nulo/0 para escritório) |
| `valor_calculado` | `decimal(10,2)` (not null) | **Valor calculado no servidor** (ver Validação Backend) |
| `status` | `text` + CHECK (`PENDENTE`/`PAGO`), default `PENDENTE` | |
| `criado_em` | `timestamptz` default `utc now()` | Carimbo de criação |

> **Não existe coluna `hora`** no banco (o campo `hora` do mock é apenas de exibição no protótipo). Caso seja necessário, recomenda-se usar um único `timestamptz` para data+hora, ou adicionar `hora time`.

---

## Mapeamento Front-end ↔ Banco (atenção na integração)

A camada de aplicação precisa **traduzir** entre os valores do protótipo e os do banco:

| Conceito | Front-end (`mock-data.ts`) | Banco (`schema.sql`) |
|----------|----------------------------|----------------------|
| Tipo | `"Escritório"` / `"Carro"` / `"Moto"` | `'ESCRITORIO'` / `'CARRO'` / `'MOTO'` |
| Status | `"Pendente"` / `"Pago"` | `'PENDENTE'` / `'PAGO'` |
| Valor | `valor` | `valor_calculado` |
| KM | `km` | `quantidade_km` |
| ID despesa | `"D-1042"` (string) | `uuid` |
| Admin | label "Administradora" | `is_admin = true` |

> Recomenda-se centralizar esse de/para em mappers (ex.: `mapTipoToDb`, `mapDespesaFromDb`) para evitar comparações de string divergentes (acentuação/caixa).

---

## Integração de Autenticação (Trigger)

Ao criar um usuário no Supabase Auth, o trigger popula `public.usuarios` automaticamente:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

> `is_admin` **não** é definido pelo trigger (default `false`); a promoção a administrador é um ato administrativo explícito no banco.

---

## Segurança de Banco de Dados (RLS — Row Level Security)

> **Regra obrigatória de propriedade:**
> ```sql
> auth.uid() = usuario_id
> ```
> A tabela `despesas` permite acesso apenas a registros do usuário autenticado; o administrador (`is_admin()`) recebe acesso ampliado para auditoria/fechamento.

### Função utilitária de admin (real, conforme schema)

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin FROM public.usuarios WHERE id = auth.uid();
$$;
```

> `SECURITY DEFINER` + `search_path` fixo evita recursão de RLS e injeção de search_path.

### RLS habilitada

```sql
ALTER TABLE public.usuarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_taxas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas            ENABLE ROW LEVEL SECURITY;
```

### Políticas implantadas

**`usuarios`** — cada um vê o próprio perfil; admin vê todos:
```sql
CREATE POLICY "Leitura de usuarios" ON public.usuarios
    FOR SELECT USING (auth.uid() = id OR public.is_admin());
```

**`configuracoes_taxas`** — leitura para qualquer autenticado; alteração só admin:
```sql
CREATE POLICY "Leitura de taxas" ON public.configuracoes_taxas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Atualizacao de taxas restrita a admin" ON public.configuracoes_taxas
    FOR UPDATE USING (public.is_admin());
```

**`despesas`** — propriedade via `auth.uid() = usuario_id`, com bypass de admin:
```sql
-- Leitura: própria OU admin
CREATE POLICY "Leitura de despesas" ON public.despesas
    FOR SELECT USING (auth.uid() = usuario_id OR public.is_admin());

-- Inserção: somente em nome próprio
CREATE POLICY "Insercao de despesas" ON public.despesas
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Atualização: própria SE ainda PENDENTE, OU admin (aprovar/marcar pago)
CREATE POLICY "Atualizacao de despesas" ON public.despesas
    FOR UPDATE USING (
        (auth.uid() = usuario_id AND status = 'PENDENTE')
        OR public.is_admin()
    );

-- Exclusão: própria SE ainda PENDENTE, OU admin
CREATE POLICY "Exclusao de despesas" ON public.despesas
    FOR DELETE USING (
        (auth.uid() = usuario_id AND status = 'PENDENTE')
        OR public.is_admin()
    );
```

> **Regra de imutabilidade pós-pagamento:** o analista só altera/exclui despesas enquanto `status = 'PENDENTE'`. Após `PAGO`, apenas o admin tem acesso de escrita — protege o fechamento quinzenal.

### Observações de hardening sobre as policies atuais

- `configuracoes_taxas` tem policy de `SELECT` e `UPDATE`, mas **não** de `INSERT`/`DELETE`. Como é tabela single-row já semeada, isso é intencional (impede criar/remover linhas) — desde que o app sempre faça `UPDATE` no `id` existente.
- A policy de `UPDATE` de `despesas` usa apenas `USING`; considere adicionar `WITH CHECK` para impedir que um analista, ao atualizar, reatribua `usuario_id` para outro usuário (defesa contra escalonamento horizontal na escrita).

---

## Validação Backend (Zero Trust)

> **Princípio:** todo cálculo financeiro ocorre **exclusivamente no servidor**.

1. **`valor_calculado` (`quantidade_km × taxa`) nunca deve ser aceito do client-side.** O navegador envia `quantidade_km`, `tipo`, `data`, `origem`, `destino` — **nunca** o valor final como fonte de verdade.
2. **Recalcule sempre** usando a linha única de `configuracoes_taxas` no momento da operação.
3. **`usuario_id` é sempre derivado de `auth.uid()`** no servidor — jamais de um campo enviado pelo cliente.

### Lógica de recálculo (referência)

```text
SE tipo = 'ESCRITORIO' → valor_calculado = configuracoes_taxas.valor_fixo_escritorio   (quantidade_km ignorado)
SE tipo = 'MOTO'       → valor_calculado = quantidade_km × configuracoes_taxas.taxa_km_moto
SE tipo = 'CARRO'      → valor_calculado = quantidade_km × configuracoes_taxas.taxa_km_carro
```

### Defesa em profundidade

- **Camada 1 — Zod:** valida tipo/formato/limites da entrada na Server Action (incluindo `tipo ∈ {ESCRITORIO,MOTO,CARRO}` e `quantidade_km ≥ 0`).
- **Camada 2 — Recálculo server-side:** ignora qualquer `valor_calculado` vindo do cliente; lê a tarifa do banco.
- **Camada 3 — RLS:** o banco rejeita escrita fora de `auth.uid() = usuario_id` (e bloqueia edição de despesas já `PAGO` por analistas).
- **Camada 4 — Constraints do schema:** `CHECK` em `tipo` e `status`, `NOT NULL` em `valor_calculado`, `decimal(10,2)` para precisão monetária.

---

## Evoluções sugeridas (não implementadas no schema atual)

- `WITH CHECK` na policy de `UPDATE` de `despesas` (trava `usuario_id`).
- Coluna de hora/timestamp do deslocamento, se o requisito de exibição se tornar persistente.
- Versionamento de tarifas (histórico) + vínculo `despesas.taxa_id`, caso seja preciso auditar qual tarifa gerou cada valor.
- Constraint `CHECK (quantidade_km >= 0)` e `CHECK (valor_calculado >= 0)`.

---

## Ligações

- Tarifas oficiais consumidas pela tela de [[Visao_Administrador]] (Configurações de Taxas).
- Diretrizes de segurança detalhadas no [[System_Prompt]] (seção DevSecOps).
- Stack e tokens em [[Stack_e_Design_Tokens]].
