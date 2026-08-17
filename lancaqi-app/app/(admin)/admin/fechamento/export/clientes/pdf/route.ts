import {
  getResumoFechamentoPorCliente,
  SEM_CLIENTE_ID,
} from "@/lib/data/dashboard";
import { getDespesasFechamento } from "@/lib/data/despesas";
import { exigirAdmin } from "@/lib/data/guards";
import { formatarBRL, formatarData, formatarKm, labelStatus, labelTipo } from "@/lib/format";
import { gerarPdfFechamento, MIME_PDF, type SecaoPdf } from "@/lib/pdf";
import { periodoFechamento } from "@/lib/periodo";
import type { Despesa } from "@/lib/types";

// pdfkit usa APIs de Node — força o runtime nodejs (e fica em serverExternalPackages).
export const runtime = "nodejs";

/**
 * Exporta o Resumo por Cliente em PDF (Fechamento) — espelho do XLSX.
 *
 * Seção "Resumo": consolidado por cliente (inclui "Sem cliente"); uma seção por
 * cliente com suas despesas discriminadas e subtotal. GET autenticado.
 * `?periodo=anterior` traz a quinzena passada com APROVADO + PAGO;
 * `?internos=1` inclui clientes internos.
 */
export async function GET(request: Request) {
  const contexto = await exigirAdmin();
  if (!contexto.ok) {
    return new Response(contexto.error, { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const incluirInternos = searchParams.get("internos") === "1";
  const { consulta, periodo } = periodoFechamento(searchParams.get("periodo"));

  const [resumoCompleto, pendentes] = await Promise.all([
    getResumoFechamentoPorCliente(periodo, { incluirPagas: consulta }),
    getDespesasFechamento(periodo, { incluirPagas: consulta }),
  ]);
  const resumo = incluirInternos
    ? resumoCompleto
    : resumoCompleto.filter((r) => !r.interno);

  // Despesas agrupadas por cliente (sem cliente cai no bucket SEM_CLIENTE_ID).
  const porCliente = new Map<string, Despesa[]>();
  for (const d of pendentes) {
    const chave = d.cliente_id ?? SEM_CLIENTE_ID;
    const lista = porCliente.get(chave) ?? [];
    lista.push(d);
    porCliente.set(chave, lista);
  }

  // Seção 1 — Resumo consolidado.
  const resumoSecao: SecaoPdf = {
    colunas: [
      { titulo: "Cliente", peso: 4 },
      { titulo: "Lançamentos", peso: 2, alinhar: "right" },
      { titulo: "KM", peso: 2, alinhar: "right" },
      { titulo: "Total (R$)", peso: 2, alinhar: "right" },
    ],
    linhas: resumo.map((r) => [
      r.cliente_nome,
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

  // Uma seção por cliente (maior total primeiro; "Sem cliente" por último).
  const secoes: SecaoPdf[] = resumo.map((r) => {
    const despesas = porCliente.get(r.cliente_id) ?? [];
    return {
      titulo: r.cliente_nome,
      colunas: [
        { titulo: "Analista", peso: 3 },
        { titulo: "Data", peso: 2 },
        { titulo: "Tipo", peso: 3 },
        { titulo: "Origem", peso: 3 },
        { titulo: "Destino", peso: 3 },
        { titulo: "KM", peso: 2, alinhar: "right" },
        { titulo: "Valor (R$)", peso: 3, alinhar: "right" },
        ...(consulta ? [{ titulo: "Status", peso: 2 } as const] : []),
      ],
      linhas: despesas.map((d) => [
        d.usuario_nome,
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
        "",
        formatarKm(r.totalKm),
        formatarBRL(r.totalPendente),
        ...(consulta ? [""] : []),
      ],
    };
  });

  const buffer = await gerarPdfFechamento({
    titulo: "Fechamento — Resumo por Cliente",
    periodoRotulo: periodo.rotulo,
    observacao: consulta
      ? "Somente despesas aprovadas do período (APROVADO + PAGO)."
      : "Despesas aprovadas, pendentes de pagamento.",
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
      "Content-Disposition": `attachment; filename="resumo-clientes${sufixo}-${hoje}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
