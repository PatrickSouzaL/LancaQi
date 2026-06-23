import { PageHeading } from "@/components/PageHeading";
import { FormularioDespesa } from "@/components/analista/FormularioDespesa";
import { Card, CardContent } from "@/components/ui/card";
import { getTaxasVigentes } from "@/lib/data/analista";

export default async function LancamentoPage() {
  // As taxas alimentam apenas a prévia visual; o cálculo final é server-side.
  const taxas = await getTaxasVigentes();

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
