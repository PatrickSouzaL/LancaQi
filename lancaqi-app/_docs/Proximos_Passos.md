# LançaQi — Próximos Passos (Roadmap)

> Estado em **2026-06-23**. Mapeamento do que **já existe** e do que **falta**,
> priorizado. Base: código atual + contratos do vault
> ([[Visao_Administrador]], [[Visao_Analista]], [[UI_UX_Guidelines]],
> [[Schema_RLS_Seguranca]], [[System_Prompt]]) e decisões
> ([[ADR_001_Estrutura_Rotas_e_Reconciliacao_Contratos]],
> [[ADR_002_Area_Analista_e_Namespacing_de_Rotas]],
> [[ADR_003_Integracao_Supabase_e_Auth]]).

---

## ✅ O que já está pronto

- **UI completa** das duas áreas: Admin (`/admin/{dashboard,lancamento,auditoria,fechamento,configuracoes}`)
  e Analista (`/analista/{dashboard,lancamento,historico}`), `/` (seletor de perfil), `/login`.
- **Design system** aplicado (tokens indigo, tipografia Geist corrigida, polimento Vercel/Linear, charts harmonizados, a11y básica).
- **Auth Microsoft (OAuth azure)**: login, callback (`exchangeCodeForSession`), proxy de proteção de rotas.
- **Autorização**: `requireAdmin()` no layout admin; `getUsuarioPerfil()` para identidade.
- **Leituras 100% Supabase** com RLS (mapper central, decimais/nome/hora tratados).
- **1 Server Action segura**: `criarDespesa` (recálculo server-side, Zod, Zero Trust) — conectada ao formulário.

---

## 🔴 Prioridade ALTA — Mutações de escrita faltando (núcleo do produto)

As ações abaixo ainda são `console.log`. Cada uma deve ser uma **Server Action**
(`app/actions/`) com o mesmo rigor de `criarDespesa`: `getUser()` →
autorização (`is_admin` quando aplicável) → Zod → operação tipada → `revalidatePath`.

| # | Ação | Onde (hoje `console.log`) | Comportamento-alvo | Segurança |
|---|------|---------------------------|--------------------|-----------|
| 1 | **Aprovar despesa** | `components/admin/SheetAuditoria.tsx:91` | `UPDATE despesas SET status='PAGO' WHERE id=$1` | `is_admin()`; id validado no servidor; RLS final |
| 2 | **Marcar em lote como PAGO** | `components/admin/FechamentoClient.tsx:89` | `UPDATE ... WHERE id = ANY($ids) AND status='PENDENTE'` | `is_admin()`; ids do cliente **não** autoritativos |
| 3 | **Salvar taxas** | `components/admin/ConfiguracoesForm.tsx:81` | `UPDATE configuracoes_taxas` na linha única (**nunca INSERT**) | `is_admin()`; Zod (number ≥ 0) |
| 4 | **Exportar CSV** | `components/admin/FechamentoClient.tsx:82` | Gerar CSV das pendentes server-side (respeitando RLS) | `is_admin()` |
| 5 | **Logout (admin)** | `components/admin/AppSidebar.tsx:104` | `supabase.auth.signOut()` + redirect `/login` | sessão própria |
| 6 | **Logout (analista)** | **inexistente** no `(analista)/layout.tsx` | idem — não há botão de sair na área do analista | sessão própria |

> Depois de criar as actions, **conectar os componentes** (via `useActionState`
> ou `useTransition`, como em `FormularioDespesa`) e trocar os banners inline por
> feedback consistente.

### Funcionalidades de domínio ainda sem UI (RLS já permite)
- **Analista editar/excluir** a própria despesa enquanto `PENDENTE` (policies já existem).
- **Admin excluir** despesa (policy de DELETE existe).

---

## 🟠 Prioridade MÉDIA — Regras de negócio incompletas

- **Período "quinzena" não implementado.** `getDespesas`/KPIs somam **todas** as
  despesas, não a quinzena atual. Falta filtro por intervalo de datas
  (`data` entre início/fim da quinzena) e, idealmente, um seletor de período.
- **Variações dos KPIs são hardcoded** (`lib/data/dashboard.ts`:
  `variacaoGastoPct`, etc.). Implementar comparação real com a quinzena anterior.
- **Busca da Auditoria é client-side.** `AuditoriaClient` filtra um array já
  carregado; o contrato pede `ilike` server-side em `usuarios.nome` (escala/segurança).
- **Paginação** ausente nas tabelas de Auditoria e Histórico (hoje carregam tudo).
- **Prévia de valor no formulário** usa taxas passadas ao cliente — ok como
  simulação, mas confirmar que nunca substitui o recálculo server-side (já garantido em `criarDespesa`).

---

## 🟡 Prioridade MÉDIA — UX, estados e resiliência

- **Sem `loading.tsx`** nas rotas dinâmicas → adicionar skeletons (UI_UX_Guidelines §3.2).
- **Sem `error.tsx`** (error boundaries) por segmento → tratar falhas de query/ação.
- **Sem `not-found.tsx`** custom.
- **Feedback de mutação**: padronizar (toast/`sonner`) em vez de banners inline soltos.
- **Estados vazios no Admin**: Auditoria/Fechamento têm "nenhum…" simples; alinhar ao padrão elegante do Analista (`EmptyState`).
- **Suspense/streaming** para os cards e gráficos pesados do Dashboard.

---

## 🔵 Segurança / Hardening

- **`WITH CHECK` na policy de `UPDATE` de `despesas`** para impedir reatribuição
  de `usuario_id` (escalonamento horizontal) — ver [[Schema_RLS_Seguranca]] (evoluções).
- **Re-checagem de `is_admin` na navegação**: layouts não re-renderizam em
  client navigation (Partial Rendering). A RLS cobre os dados, mas considerar
  checagem por página/DAL para ações sensíveis.
- **Tipos gerados do banco** (`supabase gen types typescript`) para eliminar os
  `as unknown as` em `lib/data/*` e ter type-safety ponta a ponta.
- **Processo de promoção a admin** (`is_admin = true`) — hoje é manual no banco;
  documentar/automatizar com cuidado (nunca via cliente).
- **Rate limiting / proteção das Server Actions** contra abuso (são endpoints POST públicos).
- **CSP e cabeçalhos de segurança** (ver guia `content-security-policy`).

---

## 🟢 Evoluções de Schema (quando o requisito firmar)

- Coluna de **hora/timestamp** do deslocamento (hoje `hora` é derivada de `criado_em`).
- Coluna **`observacao`** em `despesas` (hoje validada no form mas **não persistida**).
- `CHECK (quantidade_km >= 0)` e `CHECK (valor_calculado >= 0)`.
- **Versionamento de tarifas** (histórico + `despesas.taxa_id`) para auditar qual taxa gerou cada valor.

---

## ⚙️ Configuração externa / Infra (fora do código)

- **Azure Entra ID**: registrar app, configurar redirect `${origin}/auth/callback`,
  obter Client ID/Secret/Tenant.
- **Supabase → Auth → Providers → Azure**: preencher credenciais; conferir trigger
  `handle_new_user` populando `usuarios`.
- **Variáveis de ambiente de produção** (`NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY`) e gestão de segredos.
- **Deploy + CI/CD** (build, lint, typecheck no pipeline).
- **Verificação E2E com dados reais** (login → lançar → auditar → fechar).

---

## 🧪 Qualidade

- **Testes**: unitários (mappers, `calcularPrevia`, Zod), integração das Server
  Actions, e2e do fluxo de login/lançamento. Hoje **não há testes**.
- **Auditoria de acessibilidade** completa (contraste, foco, navegação por teclado, leitores de tela).
- **Observabilidade**: logging estruturado e monitoramento de erros das actions.

---

## Sugestão de ordem de execução

1. **Logout (admin + analista)** — rápido e fecha lacuna óbvia.
2. **Aprovar despesa** + **Marcar em lote PAGO** + **Salvar taxas** (as 3 actions do core).
3. `loading.tsx` / `error.tsx` + feedback padronizado (toasts).
4. Filtro de **quinzena** + variações reais de KPI + busca server-side.
5. `WITH CHECK` na RLS + **tipos gerados** do banco.
6. CSV, paginação, edição/exclusão de despesa.
7. Testes + a11y + infra/deploy.
