import { PageHeading } from "@/components/PageHeading";
import { AprovacoesClient } from "@/components/admin/AprovacoesClient";
import { getDespesasParaAprovacao } from "@/lib/data/despesas";

/**
 * Aprovações — gate do Admin sobre os lançamentos dos analistas. Lista TODAS as
 * despesas PENDENTES (independente da quinzena), pois a decisão precede o
 * fechamento. Restrito pela RLS `is_admin()` (o layout admin já exige admin).
 */
export default async function AprovacoesPage() {
  const pendentes = await getDespesasParaAprovacao();

  return (
    <>
      <PageHeading
        titulo="Aprovações"
        descricao="Revise os lançamentos enviados pelos analistas. Aprove para incluir no fechamento ou negue com um motivo."
      />
      <AprovacoesClient pendentes={pendentes} />
    </>
  );
}
