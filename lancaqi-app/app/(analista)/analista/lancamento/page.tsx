import { PageHeading } from "@/components/PageHeading";
import { FormularioDespesa } from "@/components/analista/FormularioDespesa";
import { Card, CardContent } from "@/components/ui/card";
import { getTaxasVigentes } from "@/lib/data/analista";
import { getClientes } from "@/lib/data/clientes";

export default async function LancamentoPage() {
  // Taxas alimentam a prévia; clientes populam os comboboxes de origem/cliente.
  // O cálculo e a resolução dos nomes são server-side.
  const [taxas, clientes] = await Promise.all([
    getTaxasVigentes(),
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
