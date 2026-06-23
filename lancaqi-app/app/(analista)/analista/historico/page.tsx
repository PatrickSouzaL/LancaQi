import { ReceiptText } from "lucide-react";

import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/analista/EmptyState";
import { HistoricoTable } from "@/components/analista/HistoricoTable";
import { Card, CardContent } from "@/components/ui/card";
import { getDespesasDoAnalista } from "@/lib/data/analista";

export default async function HistoricoPage() {
  // Isolamento: apenas as despesas do próprio analista (no alvo, via RLS).
  const despesas = await getDespesasDoAnalista();

  return (
    <>
      <PageHeading
        titulo="Histórico"
        descricao="Acompanhe o status de todos os seus reembolsos."
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
            <HistoricoTable despesas={despesas} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
