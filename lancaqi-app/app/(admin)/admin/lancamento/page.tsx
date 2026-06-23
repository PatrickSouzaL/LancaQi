import { PageHeading } from "@/components/PageHeading";
import { FormularioDespesa } from "@/components/analista/FormularioDespesa";
import { Card, CardContent } from "@/components/ui/card";
import { getConfiguracoesTaxas } from "@/lib/data/configuracoes";

export default async function AdminLancamentoPage() {
  // Admin também registra deslocamentos. A prévia usa as taxas vigentes;
  // o cálculo final é server-side (o valor do cliente nunca é confiado).
  const taxas = await getConfiguracoesTaxas();

  return (
    <>
      <PageHeading
        titulo="Novo Lançamento"
        descricao="Registre um deslocamento. Sem comprovantes — apenas os dados da viagem."
      />
      <Card className="max-w-2xl shadow-sm">
        <CardContent className="pt-6">
          <FormularioDespesa taxas={taxas} />
        </CardContent>
      </Card>
    </>
  );
}
