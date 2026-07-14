/**
 * Tipos do domínio LançaQi.
 *
 * Derivados de `_docs/schema.sql` (fonte de verdade do banco):
 *  - `tipo`   → CHECK com 11 valores (deslocamentos + despesas gerais) — MAIÚSCULAS
 *  - `status` → CHECK ('PENDENTE' | 'PAGO')              — sem "REJEITADO"
 *  - valores monetários em DECIMAL(10,2) (reais, BRL)
 *
 * Os labels em português ("Escritório"/"Pago") são responsabilidade da camada
 * de apresentação (ver `lib/format.ts`), não do modelo de dados. As regras de
 * quais campos cada tipo habilita vivem em `lib/despesas-tipos.ts`.
 */

export type TipoDespesa =
  // Deslocamentos (valor por KM ou fixo de escritório)
  | "ESCRITORIO"
  | "MOTO"
  | "CARRO"
  // Despesas gerais (valor declarado pelo usuário)
  | "PEDAGIO"
  | "ESTACIONAMENTO"
  | "ALIMENTACAO_EXTERNA"
  | "ALMOCO_CLIENTE"
  | "LICENCA_SOFTWARE"
  | "EQUIPAMENTO"
  | "HOSPEDAGEM"
  | "PASSAGEM"
  | "OUTROS";

/**
 * Agrupamento de tipos apenas para o encadeamento visual dos selects e para as
 * agregações do dashboard. Não existe no banco.
 */
export type CategoriaDespesa = "DESLOCAMENTO" | "DESPESA";

/** O schema só admite estes dois estados (CHECK em `despesas.status`). */
export type StatusDespesa = "PENDENTE" | "PAGO";

export interface Usuario {
  id: string; // uuid (auth.users.id)
  nome: string;
  email: string;
  is_admin: boolean;
}

export interface Despesa {
  id: string; // uuid — gen_random_uuid()
  usuario_id: string; // uuid (FK → usuarios.id)
  usuario_nome: string; // desnormalizado para a UI (join em usuarios.nome)
  data: string; // ISO 8601: "2025-06-15"
  /**
   * Apenas exibição: NÃO existe coluna `hora` no schema atual.
   * No alvo, deriva-se de `criado_em` (timestamptz). Ver Schema_RLS_Seguranca.md.
   */
  hora: string; // "14:32"
  origem: string;
  destino: string;
  tipo: TipoDespesa;
  quantidade_km: number; // 0 quando o tipo não usa KM
  valor_calculado: number; // recalculado no servidor; aqui é mock
  /**
   * Valor informado pelo usuário nos tipos de DESPESA (pedágio, hospedagem…).
   * `null` nos deslocamentos, onde o valor é calculado (KM/fixo). Para os tipos
   * de despesa, o servidor copia este valor para `valor_calculado` — assim os
   * dashboards continuam somando um único campo.
   */
  valor_declarado: number | null;
  /** Texto livre para detalhar a despesa (hotel, item, motivo do almoço…). */
  descricao: string | null;
  status: StatusDespesa;
  cliente_id: string | null; // FK → clientes.id (null quando não há cliente)
  criado_em: string; // timestamptz (ISO) — momento do registro no banco
}

/**
 * Cadastro de clientes (tabela `clientes`). Apenas `nome` é obrigatório; os
 * demais campos são opcionais no schema (NULL quando ausentes). Contrato
 * alinhado à Migracao_002 (endereço + cnpj; sem e-mail/documento).
 */
export interface Cliente {
  id: string; // uuid — gen_random_uuid()
  nome: string;
  endereco: string | null;
  cnpj: string | null;
  telefone: string | null;
  criado_em: string; // timestamptz (ISO)
}

/**
 * Tabela single-row `configuracoes_taxas`. Estes três parâmetros governam o
 * recálculo server-side de `valor_calculado`. ESCRITORIO é valor FIXO por dia
 * presencial (não por km) — por isso não cabe a forma `{ tipo, valor_por_km }`.
 */
export interface ConfiguracoesTaxas {
  id: number; // serial
  valor_fixo_escritorio: number; // R$/dia presencial
  taxa_km_moto: number; // R$/km
  taxa_km_carro: number; // R$/km
}

/** Indicadores do topo do Dashboard (agregações server-side no alvo). */
export interface DashboardKpis {
  totalGastoQuinzena: number;
  variacaoGastoPct: number; // alta = ruim
  totalKm: number;
  variacaoKmPct: number; // alta = bom
  despesasPendentes: number;
  variacaoPendentes: number; // queda = bom
  analistasAtivos: number; // derivado (não há flag `ativo`)
  variacaoAnalistas: number; // alta = bom
}

/**
 * Total por dia para as barras empilhadas do Dashboard. O deslocamento é
 * quebrado nos 3 tipos (Escritório/Carro/Moto) e a despesa fica agregada.
 * A apresentação decide o empilhamento: dias COM despesa mostram o deslocamento
 * somado (1 barra) + despesa; dias SEM despesa detalham os tipos.
 */
export interface GastoDiario {
  data: string; // ISO 8601
  ESCRITORIO: number;
  CARRO: number;
  MOTO: number;
  DESPESA: number;
}

/** Fatia da distribuição por tipo (donut do Dashboard). */
export interface DistribuicaoTipo {
  tipo: TipoDespesa;
  valor: number;
}

/** Linha do resumo por usuário no Fechamento Quinzenal. */
export interface ResumoFechamentoUsuario {
  usuario_id: string;
  usuario_nome: string;
  totalKm: number;
  totalPendente: number;
  quantidadeLancamentos: number;
}

/**
 * Linha do resumo por cliente no Fechamento Quinzenal. Agrega as pendentes que
 * têm cliente vinculado (`cliente_id`); despesas sem cliente ficam de fora.
 */
export interface ResumoFechamentoCliente {
  cliente_id: string;
  cliente_nome: string;
  totalKm: number;
  totalPendente: number;
  quantidadeLancamentos: number;
  /** Cliente interno (ex.: "Casa", "Hype Tecnologia") — ocultável no resumo. */
  interno: boolean;
}
