import { createClient } from "@/lib/supabase/server";
import { getDespesas, getDespesasPendentes } from "@/lib/data/despesas";
import { formatarData, labelStatus, labelTipo } from "@/lib/format";
import { gerarCsv } from "@/lib/csv";
import { periodoFechamento } from "@/lib/periodo";

/**
 * Exporta as despesas do Fechamento Quinzenal em CSV.
 *
 * Gerado 100% server-side: `getUser()` → `is_admin` → leitura via RLS → CSV.
 * É um endpoint GET autenticado (cookies de sessão), então o link de download
 * funciona direto no navegador. Separador `;` + BOM para abrir no Excel pt-BR.
 *
 * `?periodo=anterior` espelha o modo consulta da tela: quinzena passada com
 * TODOS os status (PAGO + PENDENTE); o padrão é só PENDENTE da quinzena vigente.
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

  // Mesmo recorte da tela: consulta → todo o período; vigente → só pendentes.
  const { consulta, periodo } = periodoFechamento(
    new URL(request.url).searchParams.get("periodo"),
  );
  const pendentes = consulta
    ? await getDespesas(periodo)
    : await getDespesasPendentes(periodo);

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
  const nome = consulta ? "despesas-periodo" : "despesas-pendentes";

  return new Response(gerarCsv(cabecalho, linhas), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
