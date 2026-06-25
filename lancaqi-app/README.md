# LançaQi — Gestão de Deslocamentos

Sistema corporativo interno para **gestão e reembolso de deslocamentos** em modelo de trabalho híbrido. Cada analista lança suas despesas de deslocamento; o administrador audita, aprova e fecha os pagamentos a cada quinzena.

O projeto foi construído sobre **Next.js 16 (App Router + React Server Components)** e **Supabase (PostgreSQL + Auth + Row Level Security)**, com foco em uma arquitetura **server-first** e um modelo de segurança **Zero Trust** para todo cálculo financeiro.

---

## ✨ Funcionalidades

### Perfil Analista
- **Lançamento de despesas** com prévia de reembolso em tempo real.
- **Histórico** dos próprios lançamentos, com edição/exclusão permitidas apenas enquanto a despesa está `PENDENTE`.
- **Dashboard pessoal** com indicadores do período.
- Comboboxes de busca para origem e clientes.

### Perfil Administrador
- **Dashboard** com métricas agregadas da quinzena (total gasto, KM rodado, pendências, analistas ativos) e gráficos de distribuição por tipo e evolução diária.
- **Auditoria** de todas as despesas, com filtros por analista, cliente e tipo, painel de detalhes e aprovação individual.
- **Fechamento Quinzenal**: consolidação das despesas pendentes da quinzena vigente para pagamento em lote.
- **Cadastro de Clientes**.
- **Configuração de Taxas**: parâmetros que governam o cálculo automático dos reembolsos.
- **Exportação de relatórios em CSV** (auditoria e fechamento), gerada no servidor respeitando as permissões.

---

## 🧮 Regras de cálculo

O valor de cada deslocamento é calculado a partir de três tipos:

| Tipo | Regra de cálculo |
|------|------------------|
| **Escritório** | Valor fixo por dia presencial |
| **Moto** | `quantidade_km × taxa_km_moto` |
| **Carro** | `quantidade_km × taxa_km_carro` |

As tarifas ficam centralizadas em uma configuração editável pelo administrador, e o **valor real é sempre recalculado no servidor** — o navegador nunca é a fonte de verdade do valor financeiro.

---

## 🔐 Segurança

A segurança é tratada em camadas (defesa em profundidade):

1. **Validação de entrada com Zod** nas Server Actions (tipo, formato e limites).
2. **Recálculo server-side** do valor: qualquer valor enviado pelo cliente é ignorado; a tarifa é lida do banco no momento da operação.
3. **Row Level Security (RLS)** no PostgreSQL como barreira final:
   - Cada analista só acessa as próprias despesas (`auth.uid() = usuario_id`).
   - O administrador recebe acesso ampliado via função `is_admin()`.
   - Despesas já `PAGO` tornam-se imutáveis para o analista, protegendo o fechamento.
4. **Constraints de schema** (`CHECK`, `NOT NULL`, `decimal(10,2)`) garantindo integridade e precisão monetária.

A autorização é feita por flag booleana (`is_admin`) sincronizada com o Supabase Auth via trigger no banco — e protegida no servidor, nunca apenas escondendo itens de menu.

---

## 🛠️ Stack Técnica

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 (App Router, React Server Components, Server Actions) |
| Linguagem | TypeScript |
| UI | React 19 |
| Estilização | Tailwind CSS v4 |
| Componentes | shadcn/ui + Radix UI |
| Ícones | Lucide React |
| Gráficos | Recharts |
| Datas | date-fns |
| Validação | Zod |
| Backend / Auth / DB | Supabase (PostgreSQL, Auth, RLS) |
| Notificações | Sonner |

---

## 🏗️ Arquitetura

- **Server-first**: leituras feitas em Server Components; mutações via **Server Actions** com validação e recálculo no servidor.
- **Roteamento por papel**: após o login, o usuário é direcionado para a área de Admin ou de Analista conforme `usuarios.is_admin`.
- **Camada de dados isolada** em `lib/data/*`, com *mappers* que traduzem os valores do banco (ex.: tipos/status em maiúsculas) para o front-end.
- **Casca (shell) estável**: sidebar e header isolam a renderização da área de conteúdo de cada feature.

```
app/
├── (admin)/admin/        # Dashboard, Auditoria, Fechamento, Clientes, Configurações
├── (analista)/analista/  # Dashboard, Lançamento, Histórico
├── actions/              # Server Actions (auth, despesas, clientes, configurações)
├── auth/callback/        # Troca de código OAuth por sessão
└── login/
components/               # UI (shadcn/ui) + componentes de domínio
lib/
├── data/                 # Camada de acesso a dados (Supabase)
├── supabase/             # Clientes (browser/server) e middleware de sessão
└── calculo.ts            # Prévia de cálculo (UX)
```

---

## 🚀 Como rodar localmente

Pré-requisitos: Node.js e um projeto Supabase.

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente (.env.local)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 3. Rodar em desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

Scripts disponíveis:

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | Lint com ESLint |

---

## 📄 Licença

Projeto de portfólio. Todos os direitos reservados.
