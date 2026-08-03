import { getResumoFechamento } from "@/lib/data/dashboard";
import { getDespesas, getDespesasPendentes } from "@/lib/data/despesas";
import { exigirAdmin } from "@/lib/data/guards";
import { formatarBRL, formatarData, formatarKm, labelStatus, labelTipo } from "@/lib/format";
import { gerarPdfFechamento, MIME_PDF, type SecaoPdf } from "@/lib/pdf";
import { periodoFechamento } from "@/lib/periodo";
import type { Despesa } from "@/lib/types";

// pdfkit usa APIs de Node — força o runtime nodejs (e fica em serverExternalPackages).
export const runtime = "nodejs";

/**
 * Exporta o Resumo por Analista em PDF (Fechamento) — espelho do XLSX.
 *
 * Seção "Resumo": consolidado de todos os analistas; uma seção por analista com
 * suas despesas discriminadas e subtotal. GET autenticado (cookies de sessão).
 * `?periodo=anterior` traz a quinzena passada com TODOS os status (coluna extra).
 */
export async function GET(request: Request) {
  const contexto = await exigirAdmin();
  if (!contexto.ok) {
    return new Response(contexto.error, { status: 403 });
  }

  const { consulta, periodo } = periodoFechamento(
    new URL(request.url).searchParams.get("periodo"),
  );
  const [resumo, pendentes] = await Promise.all([
    getResumoFechamento(periodo, { todosStatus: consulta }),
    consulta ? getDespesas(periodo) : getDespesasPendentes(periodo),
  ]);

  // Despesas agrupadas por analista, para as seções individuais.
  const porAnalista = new Map<string, Despesa[]>();
  for (const d of pendentes) {
    const lista = porAnalista.get(d.usuario_id) ?? [];
    lista.push(d);
    porAnalista.set(d.usuario_id, lista);
  }

  // Seção 1 — Resumo consolidado.
  const resumoSecao: SecaoPdf = {
    colunas: [
      { titulo: "Analista", peso: 4 },
      { titulo: "Lançamentos", peso: 2, alinhar: "right" },
      { titulo: "KM", peso: 2, alinhar: "right" },
      { titulo: "Total (R$)", peso: 2, alinhar: "right" },
    ],
    linhas: resumo.map((r) => [
      r.usuario_nome,
      String(r.quantidadeLancamentos),
      formatarKm(r.totalKm),
      formatarBRL(r.totalPendente),
    ]),
    rodape: [
      "Total",
      String(resumo.reduce((s, r) => s + r.quantidadeLancamentos, 0)),
      formatarKm(resumo.reduce((s, r) => s + r.totalKm, 0)),
      formatarBRL(resumo.reduce((s, r) => s + r.totalPendente, 0)),
    ],
  };

  // Uma seção por analista (na ordem do resumo — maior total primeiro).
  const secoes: SecaoPdf[] = resumo.map((r) => {
    const despesas = porAnalista.get(r.usuario_id) ?? [];
    return {
      titulo: r.usuario_nome,
      colunas: [
        { titulo: "Data", peso: 2 },
        { titulo: "Tipo", peso: 3 },
        { titulo: "Origem", peso: 4 },
        { titulo: "Destino", peso: 4 },
        { titulo: "KM", peso: 2, alinhar: "right" },
        { titulo: "Valor (R$)", peso: 3, alinhar: "right" },
        ...(consulta
          ? [{ titulo: "Status", peso: 2 } as const]
          : []),
      ],
      linhas: despesas.map((d) => [
        formatarData(d.data),
        labelTipo(d.tipo),
        d.origem,
        d.destino,
        formatarKm(d.quantidade_km),
        formatarBRL(d.valor_calculado),
        ...(consulta ? [labelStatus(d.status)] : []),
      ]),
      rodape: [
        "Total",
        "",
        "",
        "",
        formatarKm(r.totalKm),
        formatarBRL(r.totalPendente),
        ...(consulta ? [""] : []),
      ],
    };
  });

  const buffer = await gerarPdfFechamento({
    titulo: "Fechamento — Resumo por Analista",
    periodoRotulo: periodo.rotulo,
    observacao: consulta
      ? "Todos os status do período (PAGO + PENDENTE)."
      : "Despesas pendentes de pagamento.",
    resumo: resumoSecao,
    secoes,
  });

  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const sufixo = consulta ? "-anterior" : "";

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": MIME_PDF,
      "Content-Disposition": `attachment; filename="resumo-analistas${sufixo}-${hoje}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
