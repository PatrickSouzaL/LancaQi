import { PageHeading } from "@/components/PageHeading";
import { AuditoriaClient } from "@/components/admin/AuditoriaClient";
import { getDespesas } from "@/lib/data/despesas";

export default async function AuditoriaPage() {
  // Admin enxerga todas as despesas (no alvo, via RLS `is_admin()`).
  const despesas = await getDespesas();

  return (
    <>
      <PageHeading
        titulo="Auditoria"
        descricao="Revise e aprove os lançamentos dos analistas."
      />
      <AuditoriaClient despesas={despesas} />
    </>
  );
}
