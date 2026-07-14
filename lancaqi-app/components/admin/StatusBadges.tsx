/**
 * Badges de `tipo` e `status`.
 *
 * Cores harmonizadas com os gráficos (Escritório=slate, Carro=blue, Moto=sky)
 * e status no padrão do guideline (Pendente=amber, Pago=emerald). Tons 100/700
 * garantem contraste AA. Server Components puros.
 */
import { Badge } from "@/components/ui/badge";
import { labelStatus, labelTipo } from "@/lib/format";
import type { StatusDespesa, TipoDespesa } from "@/lib/types";

const ESTILO_TIPO: Record<TipoDespesa, string> = {
  // Deslocamentos
  ESCRITORIO: "bg-slate-100 text-slate-700",
  CARRO: "bg-blue-100 text-blue-700",
  MOTO: "bg-sky-100 text-sky-700",
  // Despesas gerais
  PEDAGIO: "bg-orange-100 text-orange-700",
  ESTACIONAMENTO: "bg-yellow-100 text-yellow-800",
  ALIMENTACAO_EXTERNA: "bg-rose-100 text-rose-700",
  ALMOCO_CLIENTE: "bg-pink-100 text-pink-700",
  LICENCA_SOFTWARE: "bg-violet-100 text-violet-700",
  EQUIPAMENTO: "bg-indigo-100 text-indigo-700",
  HOSPEDAGEM: "bg-teal-100 text-teal-700",
  PASSAGEM: "bg-cyan-100 text-cyan-700",
  OUTROS: "bg-gray-100 text-gray-700",
};

const ESTILO_STATUS: Record<StatusDespesa, string> = {
  PAGO: "bg-emerald-100 text-emerald-700",
  PENDENTE: "bg-amber-100 text-amber-800",
};

export function TipoBadge({ tipo }: { tipo: TipoDespesa }) {
  return (
    <Badge variant="ghost" className={ESTILO_TIPO[tipo]}>
      {labelTipo(tipo)}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: StatusDespesa }) {
  return (
    <Badge variant="ghost" className={ESTILO_STATUS[status]}>
      {labelStatus(status)}
    </Badge>
  );
}
