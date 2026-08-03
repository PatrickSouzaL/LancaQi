import PDFDocument from "pdfkit";

/**
 * Geração de PDF dos relatórios de Fechamento (por analista / por cliente).
 *
 * Espelha os exports em XLSX (`lib/xlsx.ts`): uma tabela de resumo consolidado
 * seguida de uma seção por entidade, com linha de total. O layout é montado a
 * partir de uma estrutura declarativa (`RelatorioPdf`) para os dois endpoints não
 * divergirem — cada route só monta os dados; o desenho da tabela mora aqui.
 *
 * Usa a fonte padrão Helvetica (WinAnsi), que cobre os acentos do português e o
 * símbolo "R$". pdfkit fica em `serverExternalPackages` (ver next.config.ts).
 */

export const MIME_PDF = "application/pdf";

export interface ColunaPdf {
  titulo: string;
  /** Largura relativa (fração da largura útil, normalizada entre as colunas). */
  peso: number;
  alinhar?: "left" | "right";
}

export interface SecaoPdf {
  /** Título da seção (nome do analista/cliente). Omitido no resumo. */
  titulo?: string;
  colunas: ColunaPdf[];
  linhas: string[][];
  /** Linha de total (negrito), alinhada às mesmas colunas. */
  rodape?: string[];
}

export interface RelatorioPdf {
  titulo: string;
  periodoRotulo: string;
  /** Nota de contexto (ex.: status incluídos). */
  observacao?: string;
  resumo: SecaoPdf;
  secoes: SecaoPdf[];
}

const MARGEM = 40;
const PAD_X = 4;
const PAD_Y = 5;
const FONTE = "Helvetica";
const FONTE_BOLD = "Helvetica-Bold";

/**
 * Coleta o stream do pdfkit num Buffer único. NÃO finaliza o documento — quem
 * chama desenha o conteúdo e só então invoca `doc.end()`; finalizar aqui abortaria
 * o documento antes de escrever qualquer coisa (erro "write after end").
 */
function coletarBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const partes: Buffer[] = [];
    doc.on("data", (parte: Buffer) => partes.push(parte));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
  });
}

export async function gerarPdfFechamento(rel: RelatorioPdf): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: MARGEM });
  const buffer = coletarBuffer(doc);

  const esquerda = doc.page.margins.left;
  const larguraUtil =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const rodapeY = doc.page.height - doc.page.margins.bottom;

  // Cursor vertical gerenciado manualmente — pdfkit não pagina tabelas sozinho.
  let y = doc.page.margins.top;

  // Cabeçalho do documento.
  doc.font(FONTE_BOLD).fontSize(16).fillColor("#111111");
  doc.text(rel.titulo, esquerda, y);
  y = doc.y + 4;
  doc.font(FONTE).fontSize(10).fillColor("#555555");
  doc.text(`Quinzena de ${rel.periodoRotulo}`, esquerda, y);
  y = doc.y;
  if (rel.observacao) {
    doc.text(rel.observacao, esquerda, y);
    y = doc.y;
  }
  y += 12;

  /** Larguras absolutas das colunas de uma seção. */
  function largurasDe(colunas: ColunaPdf[]): number[] {
    const totalPeso = colunas.reduce((s, c) => s + c.peso, 0);
    return colunas.map((c) => (c.peso / totalPeso) * larguraUtil);
  }

  /** Altura de uma linha dado o conteúdo (respeita quebra por largura). */
  function alturaLinha(
    celulas: string[],
    colunas: ColunaPdf[],
    larguras: number[],
    negrito: boolean,
  ): number {
    doc.font(negrito ? FONTE_BOLD : FONTE).fontSize(9);
    const alturas = celulas.map((texto, i) =>
      doc.heightOfString(texto || " ", {
        width: larguras[i] - 2 * PAD_X,
        align: colunas[i]?.alinhar ?? "left",
      }),
    );
    return Math.max(...alturas, 9) + 2 * PAD_Y;
  }

  /** Desenha uma linha de tabela na posição atual e avança `y`. */
  function desenharLinha(
    celulas: string[],
    colunas: ColunaPdf[],
    larguras: number[],
    opts: { negrito?: boolean; fundo?: boolean } = {},
  ) {
    const altura = alturaLinha(celulas, colunas, larguras, !!opts.negrito);

    if (opts.fundo) {
      doc
        .rect(esquerda, y, larguraUtil, altura)
        .fill("#f3f4f6");
    }

    doc
      .font(opts.negrito ? FONTE_BOLD : FONTE)
      .fontSize(9)
      .fillColor("#111111");

    let x = esquerda;
    celulas.forEach((texto, i) => {
      doc.text(texto || "", x + PAD_X, y + PAD_Y, {
        width: larguras[i] - 2 * PAD_X,
        align: colunas[i]?.alinhar ?? "left",
        lineBreak: true,
      });
      x += larguras[i];
    });

    // Linha divisória inferior.
    doc
      .moveTo(esquerda, y + altura)
      .lineTo(esquerda + larguraUtil, y + altura)
      .lineWidth(0.5)
      .strokeColor("#e5e7eb")
      .stroke();

    y += altura;
  }

  /** Renderiza uma seção (título opcional + cabeçalho + linhas + rodapé). */
  function desenharSecao(secao: SecaoPdf) {
    const larguras = largurasDe(secao.colunas);

    // Evita título órfão no pé da página.
    if (secao.titulo && y + 60 > rodapeY) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    if (secao.titulo) {
      y += 8;
      doc.font(FONTE_BOLD).fontSize(12).fillColor("#111111");
      doc.text(secao.titulo, esquerda, y);
      y = doc.y + 4;
    }

    const cabecalho = secao.colunas.map((c) => c.titulo);
    const desenharCabecalho = () =>
      desenharLinha(cabecalho, secao.colunas, larguras, {
        negrito: true,
        fundo: true,
      });

    // Quebra de página antes do cabeçalho, se necessário.
    if (y + alturaLinha(cabecalho, secao.colunas, larguras, true) > rodapeY) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    desenharCabecalho();

    for (const linha of secao.linhas) {
      const altura = alturaLinha(linha, secao.colunas, larguras, false);
      if (y + altura > rodapeY) {
        doc.addPage();
        y = doc.page.margins.top;
        desenharCabecalho();
      }
      desenharLinha(linha, secao.colunas, larguras);
    }

    if (secao.rodape) {
      const altura = alturaLinha(secao.rodape, secao.colunas, larguras, true);
      if (y + altura > rodapeY) {
        doc.addPage();
        y = doc.page.margins.top;
        desenharCabecalho();
      }
      desenharLinha(secao.rodape, secao.colunas, larguras, { negrito: true });
    }
  }

  // Página 1: o resumo consolidado (geral).
  desenharSecao(rel.resumo);

  // Cada entidade (analista/cliente) começa em sua própria página, espelhando
  // a estrutura de "uma aba por analista" do export em Excel.
  for (const secao of rel.secoes) {
    doc.addPage();
    y = doc.page.margins.top;
    desenharSecao(secao);
  }

  // Finaliza o documento — só agora, com todo o conteúdo escrito, o stream
  // dispara "end" e `coletarBuffer` resolve.
  doc.end();
  return buffer;
}
