import { PageHeading } from "@/components/PageHeading";
import { ClientesPainel } from "@/components/admin/ClientesPainel";
import { getClientes } from "@/lib/data/clientes";

export default async function ClientesPage() {
  // Leitura via RLS (autenticados leem; só admin escreve, garantido nas actions).
  const clientes = await getClientes();

  return (
    <>
      <PageHeading
        titulo="Clientes"
        descricao="Gerencie o cadastro de clientes da operação."
      />
      <ClientesPainel clientes={clientes} />
    </>
  );
}
