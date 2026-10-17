import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatação monetária (Real Brasileiro: R$ 120.000,00)
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "R$ 0,00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

// Formata valor numérico para campo de digitação em Reais com pontos e vírgula (ex: 120000 -> "120.000,00")
export function formatCurrencyInput(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value) || value === 0) return "";
  const cents = Math.round(value * 100);
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Converte string digitada em campo de Reais para número com centavos (ex: "120.000,00" -> 120000)
export function parseCurrencyInput(rawValue: string): number {
  const digits = rawValue.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
}

// Retorna data local no formato YYYY-MM-DD sem desvio de fuso horário UTC
export function getLocalISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Formatação de data (DD/MM/AAAA) sem desvio de fuso horário UTC para strings YYYY-MM-DD
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  if (typeof date === "string") {
    const isoDateOnly = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateOnly) {
      return `${isoDateOnly[3]}/${isoDateOnly[2]}/${isoDateOnly[1]}`;
    }
  }
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

// Máscara e formatação de CPF ou CNPJ
export function formatCpfCnpj(value: string | null | undefined): string {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 11) {
    return cleaned
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return cleaned
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

// Máscara de Telefone / WhatsApp
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").slice(0, 15);
}

// Formatação de Quilometragem (KM)
export function formatUsage(veiculo: {
  quilometragem?: number | null;
}): string {
  return veiculo.quilometragem !== undefined && veiculo.quilometragem !== null
    ? `${veiculo.quilometragem.toLocaleString("pt-BR")} km`
    : "KM não inf.";
}

// Tradução amigável de status
export const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DISPONIVEL: { label: "Disponível", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800" },
  PREPARACAO: { label: "Em Preparação", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800" },
  RESERVADO: { label: "Reservado", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800" },
  VENDIDO: { label: "Vendido", color: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700" },
  DEVOLVIDO: { label: "Devolvido", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800" },
};

// Conversão de valor monetário por extenso (Ex: R$ 150.000,00 -> cento e cinquenta mil reais)
export function valorPorExtenso(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "zero reais";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || num === 0) return "zero reais";

  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  function converterGrupo(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const partes: string[] = [];
    if (c > 0) partes.push(centenas[c]);
    if (d === 1) {
      partes.push(especiais[u]);
    } else {
      if (d > 1) partes.push(dezenas[d]);
      if (u > 0) partes.push(unidades[u]);
    }
    return partes.join(" e ");
  }

  const totalCentavos = Math.round(Math.abs(num) * 100);
  const inteiro = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;

  const bilhoes = Math.floor(inteiro / 1_000_000_000);
  const milhoes = Math.floor((inteiro % 1_000_000_000) / 1_000_000);
  const milhares = Math.floor((inteiro % 1_000_000) / 1000);
  const resto = inteiro % 1000;

  const gruposTexto: string[] = [];
  if (bilhoes > 0) {
    gruposTexto.push(`${converterGrupo(bilhoes)} ${bilhoes === 1 ? "bilhão" : "bilhões"}`);
  }
  if (milhoes > 0) {
    gruposTexto.push(`${converterGrupo(milhoes)} ${milhoes === 1 ? "milhão" : "milhões"}`);
  }
  if (milhares > 0) {
    gruposTexto.push(milhares === 1 ? "mil" : `${converterGrupo(milhares)} mil`);
  }
  if (resto > 0) {
    gruposTexto.push(converterGrupo(resto));
  }

  let resultado = "";
  if (inteiro === 0) {
    resultado = "";
  } else if (inteiro === 1) {
    resultado = "um real";
  } else {
    const precisaDe = (bilhoes > 0 || milhoes > 0) && milhares === 0 && resto === 0;
    resultado = `${gruposTexto.join(" e ")} ${precisaDe ? "de reais" : "reais"}`;
  }

  if (centavos > 0) {
    const centavosTexto = centavos === 1 ? "um centavo" : `${converterGrupo(centavos)} centavos`;
    resultado = resultado ? `${resultado} e ${centavosTexto}` : centavosTexto;
  }

  return resultado || "zero reais";
}

// Formata o alinhamento do documento (título e assinatura centralizados, data à direita e corpo justificado), mantendo a fonte e tamanho originais
export function renderDocumentoFormatadoHtml(texto: string): string {
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const linhas = (texto || "").split(/\r?\n/);

  return linhas
    .map((linhaRaw) => {
      const trimmed = linhaRaw.trim();

      if (!trimmed) {
        return `<div style="min-height: 1.45em;">&nbsp;</div>`;
      }

      if (/^PROCURA[ÇC][ÃA]O$/i.test(trimmed) || /^_{5,}$/.test(trimmed)) {
        return `<div style="margin: 0; text-align: center;">${escapeHtml(trimmed)}</div>`;
      }

      if (/\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4};?$/i.test(trimmed) && trimmed.length < 90) {
        return `<div style="margin: 0; text-align: right;">${escapeHtml(trimmed)}</div>`;
      }

      return `<div style="margin: 0; text-align: justify;">${escapeHtml(linhaRaw)}</div>`;
    })
    .join("");
}

function encodePdfWinAnsi(str: string): string {
  const specialMap: Record<number, number> = {
    0x20ac: 0x80,
    0x201a: 0x82,
    0x201e: 0x84,
    0x2026: 0x85,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201c: 0x93,
    0x201d: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
  };

  let out = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code === 0x28 || code === 0x29 || code === 0x5c) {
      out += "\\" + str[i];
    } else if (code >= 0x20 && code <= 0x7e) {
      out += str[i];
    } else if (code >= 0xa0 && code <= 0xff) {
      out += "\\" + code.toString(8).padStart(3, "0");
    } else if (specialMap[code] !== undefined) {
      out += "\\" + specialMap[code].toString(8).padStart(3, "0");
    } else {
      out += "?";
    }
  }
  return out;
}

export function gerarDocumentoPdfBlob(texto: string): Blob {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginLeft = 42.52; // 15 mm
  const marginRight = 42.52; // 15 mm
  const marginTop = 42.52; // 15 mm
  const marginBottom = 42.52; // 15 mm
  const contentWidth = pageWidth - marginLeft - marginRight;

  const fontSizePt = 11;
  const lineHeight = 16; // ~1.45 line height for 11pt

  let ctx: CanvasRenderingContext2D | null = null;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d");
  }

  const measureTextPt = (text: string): number => {
    if (ctx) {
      ctx.font = `100px "Times New Roman", Times, serif`;
      return (ctx.measureText(text).width / 100) * fontSizePt;
    }
    return text.length * fontSizePt * 0.48;
  };

  const spaceWidth = measureTextPt(" ");
  const pages: string[][] = [[]];
  let currentOps = pages[0];
  let y = pageHeight - marginTop - fontSizePt;

  const checkNewPage = (neededHeight: number) => {
    if (y - neededHeight < marginBottom) {
      currentOps = [];
      pages.push(currentOps);
      y = pageHeight - marginTop - fontSizePt;
    }
  };

  const linhas = (texto || "").split(/\r?\n/);

  for (const linhaRaw of linhas) {
    const trimmed = linhaRaw.trim();

    if (!trimmed) {
      y -= lineHeight;
      continue;
    }

    if (/^PROCURA[ÇC][ÃA]O$/i.test(trimmed) || /^_{5,}$/.test(trimmed)) {
      checkNewPage(lineHeight);
      const w = measureTextPt(trimmed);
      const x = marginLeft + Math.max(0, (contentWidth - w) / 2);
      currentOps.push(
        `BT /F1 ${fontSizePt} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${encodePdfWinAnsi(trimmed)}) Tj ET`
      );
      y -= lineHeight;
      continue;
    }

    if (/\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4};?$/i.test(trimmed) && trimmed.length < 90) {
      checkNewPage(lineHeight);
      const w = measureTextPt(trimmed);
      const x = marginLeft + Math.max(0, contentWidth - w);
      currentOps.push(
        `BT /F1 ${fontSizePt} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${encodePdfWinAnsi(trimmed)}) Tj ET`
      );
      y -= lineHeight;
      continue;
    }

    // Parágrafo do corpo (justificado, Times New Roman 11pt)
    const rawWords = trimmed.split(/\s+/);
    const words = rawWords.map((w) => ({
      text: w,
      width: measureTextPt(w),
    }));

    const wrappedLines: (typeof words)[] = [];
    let currentLine: typeof words = [];
    let currentLineWidth = 0;

    for (const word of words) {
      const addedWidth = currentLine.length === 0 ? word.width : spaceWidth + word.width;
      if (currentLine.length > 0 && currentLineWidth + addedWidth > contentWidth) {
        wrappedLines.push(currentLine);
        currentLine = [word];
        currentLineWidth = word.width;
      } else {
        currentLine.push(word);
        currentLineWidth += addedWidth;
      }
    }
    if (currentLine.length > 0) {
      wrappedLines.push(currentLine);
    }

    wrappedLines.forEach((lineWords, idx) => {
      checkNewPage(lineHeight);
      const isLastLine = idx === wrappedLines.length - 1;
      const totalWordsWidth = lineWords.reduce((acc, item) => acc + item.width, 0);
      const gap =
        !isLastLine && lineWords.length > 1
          ? (contentWidth - totalWordsWidth) / (lineWords.length - 1)
          : spaceWidth;

      let curX = marginLeft;
      for (const item of lineWords) {
        currentOps.push(
          `BT /F1 ${fontSizePt} Tf 1 0 0 1 ${curX.toFixed(2)} ${y.toFixed(2)} Tm (${encodePdfWinAnsi(item.text)}) Tj ET`
        );
        curX += item.width + gap;
      }
      y -= lineHeight;
    });
  }

  // Monta os objetos do PDF 1.4
  const objects: string[] = [];
  // Obj 1: Catalog
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  // Obj 2: Pages (placeholder preenchido abaixo)
  objects.push("");
  // Obj 3: Font F1 (Times-Roman WinAnsi)
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>");

  const pageObjNumbers: number[] = [];
  for (const pageOps of pages) {
    const streamContent = pageOps.join("\n");
    const contentObjNum = objects.length + 1;
    objects.push(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);

    const pageObjNum = objects.length + 1;
    pageObjNumbers.push(pageObjNum);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjNum} 0 R >>`
    );
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjNumbers.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export async function compartilharOuBaixarPdfDocumento(texto: string, titulo = "Procuracao"): Promise<void> {
  const blob = gerarDocumentoPdfBlob(texto);
  const nomeBase = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "procuracao";
  const nomeArquivo = `${nomeBase}.pdf`;
  const file = new File([blob], nomeArquivo, { type: "application/pdf" });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title: titulo,
        files: [file],
      });
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}


