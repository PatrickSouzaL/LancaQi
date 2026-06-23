/**
 * Tipos do domínio LançaQi.
 *
 * Derivados de `_docs/schema.sql` (fonte de verdade do banco):
 *  - `tipo`   → CHECK ('ESCRITORIO' | 'MOTO' | 'CARRO')  — MAIÚSCULAS
 *  - `status` → CHECK ('PENDENTE' | 'PAGO')              — sem "REJEITADO"
 *  - valores monetários em DECIMAL(10,2) (reais, BRL)
 *
 * Os labels em português ("Escritório"/"Pago") são responsabilidade da camada
 * de apresentação (ver `lib/format.ts`), não do modelo de dados.
 */

export type TipoDespesa = "ESCRITORIO" | "MOTO" | "CARRO";

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
  quantidade_km: number; // 0 para ESCRITORIO (valor fixo)
  valor_calculado: number; // recalculado no servidor; aqui é mock
  status: StatusDespesa;
  observacao?: string;
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

/** Total por dia, decomposto por tipo (barras empilhadas do Dashboard). */
export interface GastoDiario {
  data: string; // ISO 8601
  ESCRITORIO: number;
  CARRO: number;
  MOTO: number;
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
