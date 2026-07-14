import { Workbook } from "exceljs";

import { getResumoFechamento } from "@/lib/data/dashboard";
import { getDespesasPendentes } from "@/lib/data/despesas";
import { exigirAdmin } from "@/lib/data/guards";
import { formatarData, labelTipo } from "@/lib/format";
import { quinzenaAtual } from "@/lib/periodo";
import { FMT_BRL, FMT_KM, MIME_XLSX, nomeAbaSeguro } from "@/lib/xlsx";
import type { Despesa } from "@/lib/types";

// exceljs precisa de APIs de Node (zip/stream) — força o runtime nodejs.
export const runtime = "nodejs";

/**
 * Exporta o Resumo por Analista da quinzena vigente em XLSX (Fechamento).
 *
 * Aba "Resumo": consolidado de todos os analistas (mesma agregação da tela).
 * Uma aba por analista: as despesas discriminadas cuja soma fecha o total
 * daquele analista. GET autenticado (cookies de sessão) — o link de download
 * abre direto no navegador.
 */
export async function GET() {
  const contexto = await exigirAdmin();
  if (!contexto.ok) {
    return new Response(contexto.error, { status: 403 });
  }

  const periodo = quinzenaAtual();
  const [resumo, pendentes] = await Promise.all([
    getResumoFechamento(periodo),
    getDespesasPendentes(periodo),
  ]);

  // Despesas agrupadas por analista, para as abas individuais.
  const porAnalista = new Map<string, Despesa[]>();
  for (const d of pendentes) {
    const lista = porAnalista.get(d.usuario_id) ?? [];
    lista.push(d);
    porAnalista.set(d.usuario_id, lista);
  }

  const workbook = new Workbook();
  workbook.creator = "LançaQi";

  // Aba 1 — Resumo consolidado (todos os analistas).
  const resumoSheet = workbook.addWorksheet("Resumo");
  resumoSheet.columns = [
    { header: "Analista", key: "analista", width: 32 },
    { header: "Lançamentos", key: "lancamentos", width: 14 },
    { header: "KM", key: "km", width: 10 },
    { header: "Total (R$)", key: "total", width: 16 },
  ];
  resumoSheet.getRow(1).font = { bold: true };
  for (const r of resumo) {
    const linha = resumoSheet.addRow({
      analista: r.usuario_nome,
      lancamentos: r.quantidadeLancamentos,
      km: r.totalKm,
      total: r.totalPendente,
    });
    linha.getCell("km").numFmt = FMT_KM;
    linha.getCell("total").numFmt = FMT_BRL;
  }
  // Total geral do período (fecha a aba de resumo).
  const totalGeral = resumo.reduce((s, r) => s + r.totalPendente, 0);
  const kmGeral = resumo.reduce((s, r) => s + r.totalKm, 0);
  const rodape = resumoSheet.addRow({
    analista: "Total",
    lancamentos: resumo.reduce((s, r) => s + r.quantidadeLancamentos, 0),
    km: kmGeral,
    total: totalGeral,
  });
  rodape.font = { bold: true };
  rodape.getCell("km").numFmt = FMT_KM;
  rodape.getCell("total").numFmt = FMT_BRL;

  // Uma aba por analista (na ordem do resumo — maior total primeiro).
  const usados = new Set<string>(["resumo"]);
  for (const r of resumo) {
    const despesas = porAnalista.get(r.usuario_id) ?? [];
    const sheet = workbook.addWorksheet(
      nomeAbaSeguro(r.usuario_nome, usados, "Analista"),
    );
    sheet.columns = [
      { header: "Data", key: "data", width: 12 },
      { header: "Tipo", key: "tipo", width: 22 },
      { header: "Origem", key: "origem", width: 24 },
      { header: "Destino", key: "destino", width: 24 },
      { header: "KM", key: "km", width: 10 },
      { header: "Valor (R$)", key: "valor", width: 16 },
      { header: "Descrição", key: "descricao", width: 40 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const d of despesas) {
      const linha = sheet.addRow({
        data: formatarData(d.data),
        tipo: labelTipo(d.tipo),
        origem: d.origem,
        destino: d.destino,
        km: d.quantidade_km,
        valor: d.valor_calculado,
        descricao: d.descricao ?? "",
      });
      linha.getCell("km").numFmt = FMT_KM;
      linha.getCell("valor").numFmt = FMT_BRL;
      linha.getCell("descricao").alignment = { wrapText: true };
    }

    // Linha de total — soma que confere com o Resumo.
    const total = sheet.addRow({
      destino: "Total",
      km: r.totalKm,
      valor: r.totalPendente,
    });
    total.font = { bold: true };
    total.getCell("km").numFmt = FMT_KM;
    total.getCell("valor").numFmt = FMT_BRL;
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": MIME_XLSX,
      "Content-Disposition": `attachment; filename="resumo-analistas-${hoje}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
