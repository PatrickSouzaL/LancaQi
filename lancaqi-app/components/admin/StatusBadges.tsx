/**
 * Badges de `tipo` e `status`.
 *
 * Cores harmonizadas com os gráficos (Escritório=slate, Carro=indigo, Moto=sky)
 * e status no padrão do guideline (Pendente=amber, Pago=emerald). Tons 100/700
 * garantem contraste AA. Server Components puros.
 */
import { Badge } from "@/components/ui/badge";
import { labelStatus, labelTipo } from "@/lib/format";
import type { StatusDespesa, TipoDespesa } from "@/lib/types";

const ESTILO_TIPO: Record<TipoDespesa, string> = {
  ESCRITORIO: "bg-slate-100 text-slate-700",
  CARRO: "bg-indigo-100 text-indigo-700",
  MOTO: "bg-sky-100 text-sky-700",
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
