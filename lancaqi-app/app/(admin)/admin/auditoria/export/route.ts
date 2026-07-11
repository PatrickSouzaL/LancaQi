import { createClient } from "@/lib/supabase/server";
import { getDespesasParaAuditoria } from "@/lib/data/despesas";
import { formatarData, labelStatus, labelTipo } from "@/lib/format";
import { gerarCsv } from "@/lib/csv";
import { ehTipoValido } from "@/lib/despesas-tipos";
import type { TipoDespesa } from "@/lib/types";

/**
 * Exporta o relatório de Auditoria em CSV, respeitando os MESMOS filtros da
 * tela (analista `q`, `cliente`, `tipo`) — eles chegam como query params.
 * Server-side: getUser → is_admin → leitura via RLS (`is_admin()`) → CSV.
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!(perfil as { is_admin: boolean } | null)?.is_admin) {
    return new Response("Acesso restrito a administradores.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tipoParam = searchParams.get("tipo");
  const tipo =
    tipoParam && ehTipoValido(tipoParam)
      ? (tipoParam as TipoDespesa)
      : undefined;

  const despesas = await getDespesasParaAuditoria({
    termo: searchParams.get("q") ?? undefined,
    clienteId: searchParams.get("cliente") ?? undefined,
    tipo,
  });

  const cabecalho = [
    "Analista",
    "Data",
    "Tipo",
    "Origem",
    "Destino",
    "KM",
    "Valor (R$)",
    "Status",
  ];

  const linhas = despesas.map((d) => [
    d.usuario_nome,
    formatarData(d.data),
    labelTipo(d.tipo),
    d.origem,
    d.destino,
    String(d.quantidade_km).replace(".", ","),
    d.valor_calculado.toFixed(2).replace(".", ","),
    labelStatus(d.status),
  ]);

  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  return new Response(gerarCsv(cabecalho, linhas), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
