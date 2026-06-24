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
