import { PageHeading } from "@/components/PageHeading";
import { FormularioDespesa } from "@/components/analista/FormularioDespesa";
import { Card, CardContent } from "@/components/ui/card";
import { getClientes } from "@/lib/data/clientes";
import { getConfiguracoesTaxas } from "@/lib/data/configuracoes";

export default async function AdminLancamentoPage() {
  // Admin também registra deslocamentos. Prévia usa as taxas vigentes; clientes
  // populam os comboboxes. O cálculo final é server-side (Zero Trust).
  const [taxas, clientes] = await Promise.all([
    getConfiguracoesTaxas(),
    getClientes(),
  ]);

  return (
    <>
      <PageHeading
        titulo="Novo Lançamento"
        descricao="Registre um deslocamento. Sem comprovantes — apenas os dados da viagem."
      />
      <Card className="max-w-2xl shadow-sm">
        <CardContent className="pt-6">
          <FormularioDespesa taxas={taxas} clientes={clientes} />
        </CardContent>
      </Card>
    </>
  );
}
