/**
 * Helpers de apresentação. Centralizam o de/para entre os valores do banco
 * (MAIÚSCULAS) e os labels em português exibidos na UI, além da formatação
 * monetária/numérica em pt-BR.
 */
import type { StatusDespesa, TipoDespesa } from "@/lib/types";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const km = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

export function formatarBRL(valor: number): string {
  return brl.format(valor);
}

export function formatarKm(quantidade: number): string {
  return `${km.format(quantidade)} km`;
}

/** "2025-06-15" → "15/06/2025". Evita o deslocamento de fuso do `new Date`. */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

const LABEL_TIPO: Record<TipoDespesa, string> = {
  ESCRITORIO: "Escritório",
  MOTO: "Moto",
  CARRO: "Carro",
  PEDAGIO: "Pedágio",
  ESTACIONAMENTO: "Estacionamento",
  ALIMENTACAO_EXTERNA: "Alimentação",
  ALMOCO_CLIENTE: "Almoço c/ cliente",
  LICENCA_SOFTWARE: "Licença de software",
  EQUIPAMENTO: "Equipamento",
  HOSPEDAGEM: "Hospedagem",
  PASSAGEM: "Passagem",
  OUTROS: "Outros",
};

const LABEL_STATUS: Record<StatusDespesa, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
};

export function labelTipo(tipo: TipoDespesa): string {
  return LABEL_TIPO[tipo];
}

export function labelStatus(status: StatusDespesa): string {
  return LABEL_STATUS[status];
}

/** Iniciais para o AvatarFallback (não existe coluna `iniciais` no banco). */
export function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}
