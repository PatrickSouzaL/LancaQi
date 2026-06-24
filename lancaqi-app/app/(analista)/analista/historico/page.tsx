import Link from "next/link";
import { PlusCircle, ReceiptText } from "lucide-react";

import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/analista/EmptyState";
import { HistoricoTable } from "@/components/analista/HistoricoTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDespesasDoAnalista, getTaxasVigentes } from "@/lib/data/analista";
import { getClientes } from "@/lib/data/clientes";

export default async function HistoricoPage() {
  // Isolamento: apenas as despesas do próprio analista (no alvo, via RLS).
  // Taxas + clientes alimentam o formulário de edição (recálculo é server-side).
  const [despesas, taxas, clientes] = await Promise.all([
    getDespesasDoAnalista(),
    getTaxasVigentes(),
    getClientes(),
  ]);

  return (
    <>
      <PageHeading
        titulo="Histórico"
        descricao="Acompanhe o status de todos os seus reembolsos."
        acao={
          <Button asChild className="h-11">
            <Link href="/analista/lancamento">
              <PlusCircle className="size-4" />
              Novo Lançamento
            </Link>
          </Button>
        }
      />
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          {despesas.length === 0 ? (
            <EmptyState
              icone={ReceiptText}
              titulo="Nenhuma despesa lançada"
              descricao="Quando você registrar um deslocamento, ele aparecerá aqui com o status do reembolso."
              acaoLabel="Fazer primeiro lançamento"
              acaoHref="/analista/lancamento"
            />
          ) : (
            <HistoricoTable
              despesas={despesas}
              taxas={taxas}
              clientes={clientes}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
