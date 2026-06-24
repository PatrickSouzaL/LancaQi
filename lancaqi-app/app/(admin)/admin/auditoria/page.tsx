import { PageHeading } from "@/components/PageHeading";
import { AuditoriaClient } from "@/components/admin/AuditoriaClient";
import { getDespesasParaAuditoria } from "@/lib/data/despesas";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Busca server-side por nome do analista (`ilike`); a lista chega já restrita
  // pela RLS `is_admin()` e pelo termo — não há filtragem no cliente.
  const { q } = await searchParams;
  const termo = (q ?? "").trim();
  const despesas = await getDespesasParaAuditoria(termo);

  return (
    <>
      <PageHeading
        titulo="Auditoria"
        descricao="Revise e aprove os lançamentos dos analistas."
      />
      <AuditoriaClient despesas={despesas} termoInicial={termo} />
    </>
  );
}
