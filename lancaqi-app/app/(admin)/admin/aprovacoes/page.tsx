import { PageHeading } from "@/components/PageHeading";
import { AprovacoesClient } from "@/components/admin/AprovacoesClient";
import { getDespesasParaAprovacao } from "@/lib/data/despesas";
import { quinzenaAtual } from "@/lib/periodo";

/**
 * Aprovações — gate do Admin sobre os lançamentos dos analistas. Lista TODAS as
 * despesas PENDENTES (independente da quinzena), pois a decisão precede o
 * fechamento. Restrito pela RLS `is_admin()` (o layout admin já exige admin).
 *
 * A virada da quinzena não descarta nem adota nada: o que continua PENDENTE
 * segue nesta fila e, ao ser aprovado, soma no fechamento da quinzena da sua
 * DATA (consultável em `/admin/fechamento?periodo=anterior`). O início da
 * quinzena vigente é resolvido no servidor e desce como prop para a fila
 * sinalizar essas linhas sem depender do relógio do navegador.
 */
export default async function AprovacoesPage() {
  const pendentes = await getDespesasParaAprovacao();

  return (
    <>
      <PageHeading
        titulo="Aprovações"
        descricao="Revise os lançamentos enviados pelos analistas. Aprove para incluir no fechamento ou negue com um motivo."
      />
      <AprovacoesClient
        pendentes={pendentes}
        inicioQuinzenaAtual={quinzenaAtual().inicio}
      />
    </>
  );
}
