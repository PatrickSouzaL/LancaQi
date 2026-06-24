import { createClient } from "@/lib/supabase/server";
import { getDespesasPendentes } from "@/lib/data/despesas";
import { formatarData, labelStatus, labelTipo } from "@/lib/format";
import { gerarCsv } from "@/lib/csv";
import { quinzenaAtual } from "@/lib/periodo";

/**
 * Exporta as despesas PENDENTES em CSV (Fechamento Quinzenal).
 *
 * Gerado 100% server-side: `getUser()` → `is_admin` → leitura via RLS → CSV.
 * É um endpoint GET autenticado (cookies de sessão), então o link de download
 * funciona direto no navegador. Separador `;` + BOM para abrir no Excel pt-BR.
 */
export async function GET() {
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

  // Mesma fila da tela: pendentes da quinzena vigente.
  const pendentes = await getDespesasPendentes(quinzenaAtual());

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

  const linhas = pendentes.map((d) => [
    d.usuario_nome,
    formatarData(d.data),
    labelTipo(d.tipo),
    d.origem,
    d.destino,
    // Números no padrão pt-BR (vírgula decimal) para o Excel reconhecer.
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
      "Content-Disposition": `attachment; filename="despesas-pendentes-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
