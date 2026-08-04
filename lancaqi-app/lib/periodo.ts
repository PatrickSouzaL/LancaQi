/**
 * Cálculo de quinzenas (períodos de fechamento).
 *
 * Convenção do negócio: a 1ª quinzena vai do dia 1 ao 15; a 2ª do dia 16 ao
 * último dia do mês. As datas são strings ISO ("YYYY-MM-DD") — o mesmo formato
 * da coluna `despesas.data` (tipo DATE) — então a comparação `gte`/`lte` no
 * banco é lexicográfica e correta, sem fuso.
 *
 * "Hoje" é resolvido no fuso de São Paulo para evitar virada de dia em UTC.
 */
import { z } from "zod";

export interface Periodo {
  /** Primeiro dia (inclusive), "YYYY-MM-DD". */
  inicio: string;
  /** Último dia (inclusive), "YYYY-MM-DD". */
  fim: string;
  /** Rótulo amigável, ex.: "16–30 jun 2026". */
  rotulo: string;
}

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** Data de hoje no fuso America/Sao_Paulo, como "YYYY-MM-DD". */
function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

/** Último dia do mês (mes 1-based). */
function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

function fmt(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function montar(ano: number, mes: number, d1: number, d2: number): Periodo {
  return {
    inicio: fmt(ano, mes, d1),
    fim: fmt(ano, mes, d2),
    rotulo: `${d1}–${d2} ${MESES[mes - 1]} ${ano}`,
  };
}

/** Quinzena que contém a data ISO informada. */
export function quinzenaDe(refISO: string): Periodo {
  const [ano, mes, dia] = refISO.split("-").map(Number);
  return dia <= 15
    ? montar(ano, mes, 1, 15)
    : montar(ano, mes, 16, ultimoDiaDoMes(ano, mes));
}

/** Quinzena atual (baseada em "hoje" no fuso de São Paulo). */
export function quinzenaAtual(): Periodo {
  return quinzenaDe(hojeISO());
}

/**
 * Janela móvel dos últimos `n` dias, INCLUINDO hoje (ex.: `n=7` → hoje e os 6
 * dias anteriores). Não é uma quinzena contábil; serve para recortes rolantes
 * como o gráfico do dashboard do analista. A aritmética roda em UTC sobre a
 * data-calendário, sem fuso (a referência já vem resolvida em São Paulo).
 */
export function ultimosDias(n: number, ref: string = hojeISO()): Periodo {
  const [ano, mes, dia] = ref.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() - (n - 1));
  return {
    inicio: fmt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()),
    fim: ref,
    rotulo: `últimos ${n} dias`,
  };
}

/** Mês-calendário anterior ao de referência (padrão: o mês passado). */
export function mesAnterior(ref: string = hojeISO()): Periodo {
  const [ano, mes] = ref.split("-").map(Number);
  let pAno = ano;
  let pMes = mes - 1;
  if (pMes === 0) {
    pMes = 12;
    pAno = ano - 1;
  }
  return {
    inicio: fmt(pAno, pMes, 1),
    fim: fmt(pAno, pMes, ultimoDiaDoMes(pAno, pMes)),
    rotulo: `${MESES[pMes - 1]} ${pAno}`,
  };
}

/**
 * Resolve o período do Fechamento a partir do search param `periodo` da tela.
 * `?periodo=anterior` entra no modo consulta (quinzena passada, TODOS os status);
 * qualquer outro valor cai na quinzena vigente. Centraliza a regra que a página
 * e os endpoints de export precisam compartilhar para não divergirem.
 */
export function periodoFechamento(param?: string | null): {
  consulta: boolean;
  periodo: Periodo;
} {
  const consulta = param === "anterior";
  return { consulta, periodo: consulta ? quinzenaAnterior() : quinzenaAtual() };
}

/** Quinzena imediatamente anterior à informada (padrão: a anterior à atual). */
export function quinzenaAnterior(ref: Periodo = quinzenaAtual()): Periodo {
  const [ano, mes, dia] = ref.inicio.split("-").map(Number);

  // Atual é a 2ª quinzena (começa no 16) → anterior é a 1ª do mesmo mês.
  if (dia === 16) return montar(ano, mes, 1, 15);

  // Atual é a 1ª quinzena (começa no 1) → anterior é a 2ª do mês anterior.
  let pAno = ano;
  let pMes = mes - 1;
  if (pMes === 0) {
    pMes = 12;
    pAno = ano - 1;
  }
  return montar(pAno, pMes, 16, ultimoDiaDoMes(pAno, pMes));
}

// ---------------------------------------------------------------------------
// Dashboard: filtro temporal via URL Search Params (Security by Design)
// ---------------------------------------------------------------------------

/** Modos do seletor de período do dashboard. `atual` é o padrão. */
export type PeriodoDashboard = "atual" | "anterior" | "mes-anterior" | "custom";

/**
 * String ISO `YYYY-MM-DD` que representa uma data-calendário REAL. Não basta o
 * formato: `2026-02-31` casa o regex mas não existe — o `refine` reconstrói a
 * data em UTC e confere se os componentes bateram (rejeita overflow do mês).
 * Barreira contra Type Confusion / injeção lógica antes de a data ir à query.
 */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
  .refine((s) => {
    const [ano, mes, dia] = s.split("-").map(Number);
    const d = new Date(Date.UTC(ano, mes - 1, dia));
    return (
      d.getUTCFullYear() === ano &&
      d.getUTCMonth() === mes - 1 &&
      d.getUTCDate() === dia
    );
  }, "Data inexistente no calendário");

/** Schema dos search params aceitos pelo dashboard. Tudo opcional. */
const DashboardParamsSchema = z.object({
  period: z.enum(["atual", "anterior", "mes-anterior", "custom"]).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

/** Aritmética de dias-calendário em UTC (sem fuso; a data já vem resolvida). */
function addDias(iso: string, delta: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() + delta);
  return fmt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Diferença inclusiva em dias entre duas ISO (fim >= inicio). */
function diasEntre(inicio: string, fim: string): number {
  const a = Date.parse(`${inicio}T00:00:00Z`);
  const b = Date.parse(`${fim}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Rótulo amigável para um intervalo arbitrário, ex.: "1 jul – 15 jul 2026". */
function rotuloIntervalo(inicio: string, fim: string): string {
  const [ai, mi, di] = inicio.split("-").map(Number);
  const [af, mf, df] = fim.split("-").map(Number);
  const ini = `${di} ${MESES[mi - 1]}`;
  const end = `${df} ${MESES[mf - 1]} ${af}`;
  return ai === af ? `${ini} – ${end}` : `${ini} ${ai} – ${end}`;
}

/** Monta um período custom (intervalo inclusivo já validado). */
function periodoCustom(inicio: string, fim: string): Periodo {
  return { inicio, fim, rotulo: rotuloIntervalo(inicio, fim) };
}

/** Janela de mesmo comprimento imediatamente anterior — base da variação custom. */
function janelaAnterior(p: Periodo): Periodo {
  const dias = diasEntre(p.inicio, p.fim);
  const fim = addDias(p.inicio, -1);
  const inicio = addDias(fim, -(dias - 1));
  return { inicio, fim, rotulo: rotuloIntervalo(inicio, fim) };
}

export interface PeriodoResolvido {
  /** Modo efetivamente aplicado (após validação; inválido cai em `atual`). */
  chave: PeriodoDashboard;
  /** Janela a exibir/agregar. */
  periodo: Periodo;
  /** Janela de comparação equivalente (usada nas variações dos KPIs). */
  periodoAnterior: Periodo;
  /** Datas custom já normalizadas (ISO) para reidratar o seletor. */
  from: string | null;
  to: string | null;
}

/**
 * Resolve o período do Dashboard a partir dos search params da URL, validando
 * estritamente com Zod ANTES de qualquer consulta. Modos:
 *  - `atual` (padrão): quinzena vigente;
 *  - `anterior`: quinzena passada;
 *  - `mes-anterior`: mês-calendário anterior;
 *  - `custom`: intervalo `from..to` (exige ambas as datas ISO válidas e
 *    `from <= to`; caso contrário faz fallback seguro para a quinzena atual).
 * A janela de comparação (`periodoAnterior`) respeita a semântica de cada modo.
 */
export function resolverPeriodoDashboard(raw: {
  period?: string;
  from?: string;
  to?: string;
}): PeriodoResolvido {
  const parsed = DashboardParamsSchema.safeParse(raw);
  const p = parsed.success ? parsed.data : {};

  // Custom válido: AMBAS as datas presentes, ISO reais e ordenadas.
  if (p.from && p.to && p.from <= p.to) {
    const periodo = periodoCustom(p.from, p.to);
    return {
      chave: "custom",
      periodo,
      periodoAnterior: janelaAnterior(periodo),
      from: p.from,
      to: p.to,
    };
  }

  // Modo custom SELECIONADO mas ainda sem intervalo completo (o usuário abriu o
  // seletor / clicou só a data inicial). Mantém o modo `custom` ativo — para o
  // date-picker aparecer — e agrega a quinzena atual enquanto as datas não
  // fecham. Preserva um `from` parcial já escolhido para reidratar o calendário.
  if (p.period === "custom") {
    const periodo = quinzenaAtual();
    return {
      chave: "custom",
      periodo,
      periodoAnterior: quinzenaAnterior(periodo),
      from: p.from ?? null,
      to: p.to ?? null,
    };
  }

  if (p.period === "anterior") {
    const periodo = quinzenaAnterior();
    return {
      chave: "anterior",
      periodo,
      periodoAnterior: quinzenaAnterior(periodo),
      from: null,
      to: null,
    };
  }

  if (p.period === "mes-anterior") {
    const periodo = mesAnterior();
    return {
      chave: "mes-anterior",
      periodo,
      periodoAnterior: mesAnterior(periodo.inicio),
      from: null,
      to: null,
    };
  }

  const periodo = quinzenaAtual();
  return {
    chave: "atual",
    periodo,
    periodoAnterior: quinzenaAnterior(periodo),
    from: null,
    to: null,
  };
}
