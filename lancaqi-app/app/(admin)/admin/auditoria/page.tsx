import { PageHeading } from "@/components/PageHeading";
import { AuditoriaClient } from "@/components/admin/AuditoriaClient";
import { getClientes } from "@/lib/data/clientes";
import { getConfiguracoesTaxas } from "@/lib/data/configuracoes";
import { getDespesasParaAuditoria } from "@/lib/data/despesas";
import { ehTipoValido } from "@/lib/despesas-tipos";
import type { TipoDespesa } from "@/lib/types";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cliente?: string;
    tipo?: string;
    de?: string;
    ate?: string;
  }>;
}) {
  const { q, cliente, tipo, de, ate } = await searchParams;
  const termo = (q ?? "").trim();
  const clienteId = cliente?.trim() || undefined;
  const tipoFiltro =
    tipo && ehTipoValido(tipo) ? (tipo as TipoDespesa) : undefined;
  const dataInicio = de?.trim() || undefined;
  const dataFim = ate?.trim() || undefined;

  // Filtros server-side (analista/cliente/tipo/período) + dados para filtro e
  // edição. Tudo restrito pela RLS `is_admin()`.
  const [despesas, clientes, taxas] = await Promise.all([
    getDespesasParaAuditoria({
      termo,
      clienteId,
      tipo: tipoFiltro,
      dataInicio,
      dataFim,
    }),
    getClientes(),
    getConfiguracoesTaxas(),
  ]);

  return (
    <>
      <PageHeading
        titulo="Auditoria"
        descricao="Relatório completo de despesas — filtre, edite, exclua e exporte."
      />
      <AuditoriaClient
        despesas={despesas}
        clientes={clientes}
        taxas={taxas}
        termoInicial={termo}
        clienteInicial={clienteId ?? null}
        tipoInicial={tipoFiltro ?? null}
        dataInicioInicial={dataInicio ?? null}
        dataFimInicial={dataFim ?? null}
      />
    </>
  );
}
