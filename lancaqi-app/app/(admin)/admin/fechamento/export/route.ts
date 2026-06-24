import { createClient } from "@/lib/supabase/server";
import { getDespesasPendentes } from "@/lib/data/despesas";
import { formatarData, labelStatus, labelTipo } from "@/lib/format";

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

  const pendentes = await getDespesasPendentes();

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

  const csv = [cabecalho, ...linhas]
    .map((campos) => campos.map(escaparCsv).join(";"))
    .join("\r\n");

  // BOM (﻿) garante acentuação correta ao abrir no Excel.
  const corpo = `﻿${csv}`;
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  return new Response(corpo, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="despesas-pendentes-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Escapa um campo CSV: aspas se contiver separador, aspas ou quebra de linha. */
function escaparCsv(valor: string): string {
  if (/[";\r\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}
