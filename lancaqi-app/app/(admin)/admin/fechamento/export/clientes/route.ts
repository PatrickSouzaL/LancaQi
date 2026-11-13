import { Workbook } from "exceljs";

import {
  getResumoFechamentoPorCliente,
  SEM_CLIENTE_ID,
} from "@/lib/data/dashboard";
import { getDespesasFechamento } from "@/lib/data/despesas";
import { exigirAdmin } from "@/lib/data/guards";
import { formatarData, labelStatus, labelTipo } from "@/lib/format";
import { periodoFechamento } from "@/lib/periodo";
import { FMT_BRL, FMT_KM, MIME_XLSX, nomeAbaSeguro } from "@/lib/xlsx";
import type { Despesa } from "@/lib/types";

// exceljs precisa de APIs de Node (zip/stream) — força o runtime nodejs.
export const runtime = "nodejs";

/**
 * Exporta o Resumo por Cliente em XLSX (Fechamento).
 *
 * Aba "Resumo": consolidado por cliente (mesma agregação da tela), incluindo a
 * linha "Sem cliente". Uma aba por cliente: as despesas discriminadas (com o
 * analista de origem) cuja soma fecha o total daquele cliente. GET autenticado
 * (cookies de sessão) — o link de download abre direto no navegador.
 *
 * `?periodo=anterior` espelha o modo consulta: quinzena passada com APROVADO +
 * PAGO (adiciona a coluna "Status"). `?internos=1` inclui clientes internos.
 */
export async function GET(request: Request) {
  const contexto = await exigirAdmin();
  if (!contexto.ok) {
    return new Response(contexto.error, { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  // `?internos=1` inclui clientes internos (Casa, Hype Tecnologia); por padrão
  // eles ficam de fora, acompanhando o estado inicial do resumo na tela.
  const incluirInternos = searchParams.get("internos") === "1";
  const { consulta, periodo } = periodoFechamento(searchParams.get("periodo"));

  const [resumoCompleto, pendentes] = await Promise.all([
    getResumoFechamentoPorCliente(periodo, { incluirPagas: consulta }),
    getDespesasFechamento(periodo, { incluirPagas: consulta }),
  ]);
  const resumo = incluirInternos
    ? resumoCompleto
    : resumoCompleto.filter((r) => !r.interno);

  // Despesas agrupadas por cliente (as sem cliente caem no bucket SEM_CLIENTE_ID).
  const porCliente = new Map<string, Despesa[]>();
  for (const d of pendentes) {
    const chave = d.cliente_id ?? SEM_CLIENTE_ID;
    const lista = porCliente.get(chave) ?? [];
    lista.push(d);
    porCliente.set(chave, lista);
  }

  const workbook = new Workbook();
  workbook.creator = "LançaQi";

  // Aba 1 — Resumo consolidado (todos os clientes + "Sem cliente").
  const resumoSheet = workbook.addWorksheet("Resumo");
  resumoSheet.columns = [
    { header: "Cliente", key: "cliente", width: 32 },
    { header: "Lançamentos", key: "lancamentos", width: 14 },
    { header: "KM", key: "km", width: 10 },
    { header: "Total (R$)", key: "total", width: 16 },
  ];
  resumoSheet.getRow(1).font = { bold: true };
  for (const r of resumo) {
    const linha = resumoSheet.addRow({
      cliente: r.cliente_nome,
      lancamentos: r.quantidadeLancamentos,
      km: r.totalKm,
      total: r.totalPendente,
    });
    linha.getCell("km").numFmt = FMT_KM;
    linha.getCell("total").numFmt = FMT_BRL;
  }
  // Total geral do período (fecha a aba de resumo).
  const rodape = resumoSheet.addRow({
    cliente: "Total",
    lancamentos: resumo.reduce((s, r) => s + r.quantidadeLancamentos, 0),
    km: resumo.reduce((s, r) => s + r.totalKm, 0),
    total: resumo.reduce((s, r) => s + r.totalPendente, 0),
  });
  rodape.font = { bold: true };
  rodape.getCell("km").numFmt = FMT_KM;
  rodape.getCell("total").numFmt = FMT_BRL;

  // Uma aba por cliente (na ordem do resumo — maior total primeiro, "Sem
  // cliente" por último).
  const usados = new Set<string>(["resumo"]);
  for (const r of resumo) {
    const despesas = porCliente.get(r.cliente_id) ?? [];
    const sheet = workbook.addWorksheet(
      nomeAbaSeguro(r.cliente_nome, usados, "Cliente"),
    );
    sheet.columns = [
      { header: "Analista", key: "analista", width: 28 },
      { header: "Data", key: "data", width: 12 },
      { header: "Tipo", key: "tipo", width: 22 },
      { header: "Origem", key: "origem", width: 24 },
      { header: "Destino", key: "destino", width: 24 },
      { header: "KM", key: "km", width: 10 },
      { header: "Valor (R$)", key: "valor", width: 16 },
      // No modo consulta há status misto — a coluna diferencia PAGO de APROVADO.
      ...(consulta ? [{ header: "Status", key: "status", width: 12 }] : []),
    ];
    sheet.getRow(1).font = { bold: true };

    for (const d of despesas) {
      const linha = sheet.addRow({
        analista: d.usuario_nome,
        data: formatarData(d.data),
        tipo: labelTipo(d.tipo),
        origem: d.origem,
        destino: d.destino,
        km: d.quantidade_km,
        valor: d.valor_calculado,
        ...(consulta ? { status: labelStatus(d.status) } : {}),
      });
      linha.getCell("km").numFmt = FMT_KM;
      linha.getCell("valor").numFmt = FMT_BRL;
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

  const sufixo = consulta ? "-anterior" : "";

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": MIME_XLSX,
      "Content-Disposition": `attachment; filename="resumo-clientes${sufixo}-${hoje}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
