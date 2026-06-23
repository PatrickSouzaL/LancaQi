import { PageHeading } from "@/components/PageHeading";
import { ConfiguracoesForm } from "@/components/admin/ConfiguracoesForm";
import { getConfiguracoesTaxas } from "@/lib/data/configuracoes";

export default async function ConfiguracoesPage() {
  const configuracoes = await getConfiguracoesTaxas();

  return (
    <>
      <PageHeading
        titulo="Configurações de Taxas"
        descricao="Defina os parâmetros usados no cálculo automático dos reembolsos."
      />
      <ConfiguracoesForm configuracoes={configuracoes} />
    </>
  );
}
