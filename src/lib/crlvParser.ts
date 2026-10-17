import zlib from "zlib";

export interface DadosCRLV {
  placa: string;
  renavam: string;
  chassi: string;
  anoFabricacao: number;
  anoModelo: number;
  exercicio?: number;
  marca: string;
  modelo: string;
  versao: string;
  cor: string;
  combustivel: string;
  categoria: string;
  motor?: string;
  crv?: string;
  cla?: string;
  proprietarioNome?: string;
  proprietarioCpf?: string;
  cidadeUf?: string;
  cidade?: string;
  uf?: string;
  rawLines?: string[];
}

export function parseCRLVFromPdfBuffer(pdfBuffer: Buffer): DadosCRLV {
  const binary = pdfBuffer.toString("binary");

  // Encontra e descomprime todas as streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let sm: RegExpExecArray | null;
  const cmaps: Map<number, string>[] = [];
  const textStreams: string[] = [];

  while ((sm = streamRegex.exec(binary)) !== null) {
    const raw = Buffer.from(sm[1], "binary");
    try {
      const dec = zlib.inflateSync(raw);
      const str = dec.toString("latin1");
      if (str.includes("beginbfrange") || str.includes("beginbfchar")) {
        const map = new Map<number, string>();
        const bfrangeMatch = str.match(/beginbfrange([\s\S]*?)endbfrange/g);
        if (bfrangeMatch) {
          for (const block of bfrangeMatch) {
            const lines = block.split(/\r?\n/);
            for (const l of lines) {
              const p = l.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
              if (p) {
                const start = parseInt(p[1], 16);
                const end = parseInt(p[2], 16);
                let dst = parseInt(p[3], 16);
                for (let i = start; i <= end; i++) {
                  map.set(i, String.fromCharCode(dst++));
                }
              }
            }
          }
        }
        if (map.size > 0) {
          cmaps.push(map);
        }
      } else if (str.includes("/F3") || (str.includes("BT") && str.includes("ET"))) {
        textStreams.push(str);
      }
    } catch {
      // Ignora streams não compactadas ou outros filtros
    }
  }

  // Identifica o CMap de texto do CRLV (FreeMonoBold do CDT / SENATRAN)
  let crlvMap = cmaps.find((m) => m.get(0x24) === "A" && m.get(0x13) === "0");
  if (!crlvMap && cmaps.length > 0) {
    crlvMap = cmaps[cmaps.length - 1];
  }

  const rawLines: string[] = [];
  const tjRegex = /\((.*?)(?<!\\)\)\s*Tj/g;

  for (const textStream of textStreams) {
    let tm: RegExpExecArray | null;
    while ((tm = tjRegex.exec(textStream)) !== null) {
      const rawStr = tm[1];
      const unescaped = rawStr
        .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\");

      let decoded = "";
      for (let i = 0; i < unescaped.length; i += 2) {
        const hi = unescaped.charCodeAt(i);
        const lo = i + 1 < unescaped.length ? unescaped.charCodeAt(i + 1) : 0;
        const cid = (hi << 8) | lo;
        if (crlvMap && crlvMap.has(cid)) {
          decoded += crlvMap.get(cid);
        } else if (crlvMap && crlvMap.has(unescaped.charCodeAt(i))) {
          decoded += crlvMap.get(unescaped.charCodeAt(i));
        } else {
          decoded += "?";
        }
      }

      const clean = decoded.trim();
      if (clean && clean !== "*" && !clean.includes("???")) {
        rawLines.push(clean);
      }
    }
  }

  // Mapeamento dos campos oficiais do CRLV-e digital com fallback por padrão regex
  const plateRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i;
  const renavamRegex = /^\d{9,11}$/;
  const chassiRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
  const yearRegex = /^(19\d{2}|20\d{2})$/;
  const cpfCnpjRegex = /^(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})$/;

  const renavam =
    (rawLines[0] && renavamRegex.test(rawLines[0].replace(/\D/g, "")) ? rawLines[0] : "") ||
    rawLines.find((l) => renavamRegex.test(l.replace(/\s/g, ""))) ||
    rawLines[0] ||
    "";

  const placa =
    (rawLines[1] && plateRegex.test(rawLines[1].replace(/[^A-Z0-9]/gi, "")) ? rawLines[1] : "") ||
    rawLines.find((l) => plateRegex.test(l.replace(/[^A-Z0-9]/gi, ""))) ||
    rawLines[1] ||
    "";

  const yearLines = rawLines.filter((l) => yearRegex.test(l.trim())).map((l) => parseInt(l.trim(), 10));
  const currentYear = new Date().getFullYear();
  const exercicio = parseInt(rawLines[2], 10) || yearLines[0] || currentYear;
  const anoFabricacao = parseInt(rawLines[3], 10) || yearLines[1] || yearLines[0] || currentYear;
  const anoModelo = parseInt(rawLines[4], 10) || yearLines[2] || anoFabricacao;

  const crv = rawLines[5] || "";
  const cla = rawLines[6] || "";

  // Localiza linha de Marca/Modelo (geralmente contém '/' e não é data nem CPF/CNPJ)
  const marcaModeloFull =
    (rawLines[7] && rawLines[7].includes("/") ? rawLines[7] : "") ||
    rawLines.find((l, idx) => idx >= 4 && idx <= 14 && l.includes("/") && !cpfCnpjRegex.test(l) && !/^\d/.test(l)) ||
    rawLines[7] ||
    "";

  const especieTipo = rawLines[8] || "";
  const chassi =
    (rawLines[9] && chassiRegex.test(rawLines[9].trim()) ? rawLines[9].trim() : "") ||
    rawLines.find((l) => chassiRegex.test(l.trim())) ||
    rawLines[9] ||
    "";

  const knownColors = ["BRANC", "PRAT", "PRET", "CINZ", "VERMELH", "AZUL", "VERD", "AMAREL", "BEGE", "MARROM", "DOURAD", "LARANJ"];
  const corRaw =
    (rawLines[10] && knownColors.some((k) => rawLines[10].toUpperCase().startsWith(k)) ? rawLines[10] : "") ||
    rawLines.find((l) => knownColors.some((k) => l.toUpperCase().startsWith(k))) ||
    rawLines[10] ||
    "";

  const knownFuels = ["DIESEL", "GASOLINA", "ALCOOL", "FLEX", "ETANOL", "HIBRIDO", "ELETRICO", "GNV"];
  const combustivelRaw =
    (rawLines[11] && knownFuels.some((k) => rawLines[11].toUpperCase().includes(k)) ? rawLines[11] : "") ||
    rawLines.find((l) => knownFuels.some((k) => l.toUpperCase().includes(k))) ||
    rawLines[11] ||
    "";

  const motor = rawLines[16] || "";

  const cpfLineIndex = rawLines.findIndex((l, idx) => idx >= 12 && cpfCnpjRegex.test(l.trim()));
  const proprietarioCpf =
    cpfLineIndex !== -1 ? rawLines[cpfLineIndex] : rawLines[22] || "";
  const proprietarioNome =
    cpfLineIndex > 0 ? rawLines[cpfLineIndex - 1] : rawLines[21] || "";
  const cidadeUf =
    cpfLineIndex !== -1 && rawLines[cpfLineIndex + 1] ? rawLines[cpfLineIndex + 1] : rawLines[23] || "";

  // Trata Marca e Modelo (remove prefixo I/, IMP/ ou NAC/ antes do split)
  const marcaModeloLimpo = marcaModeloFull.replace(/^(I|IMP|NAC)\//i, "").trim();
  const parts = marcaModeloLimpo.split("/");
  let marca = parts[0]?.trim() || "";
  if (marca.toUpperCase().startsWith("VW") || marca.toUpperCase().startsWith("VOLKS")) {
    marca = "Volkswagen";
  } else if (marca.toUpperCase().startsWith("GM") || marca.toUpperCase().startsWith("CHEV")) {
    marca = "Chevrolet";
  } else if (marca.toUpperCase() === "M.BENZ" || marca.toUpperCase().startsWith("MERCEDES")) {
    marca = "Mercedes-Benz";
  } else if (marca) {
    marca = marca.charAt(0).toUpperCase() + marca.slice(1).toLowerCase();
  }

  const modeloCompleto = parts.slice(1).join("/").trim() || "";
  const modeloTokens = modeloCompleto.split(" ");
  const versao = modeloTokens.length > 1 ? modeloTokens.slice(1).join(" ") : "";

  // Trata Cor
  let cor = "";
  const c = corRaw.toUpperCase();
  if (c.startsWith("BRANC")) cor = "Branco";
  else if (c.startsWith("PRAT")) cor = "Prata";
  else if (c.startsWith("PRET")) cor = "Preto";
  else if (c.startsWith("CINZ")) cor = "Cinza";
  else if (c.startsWith("VERMELH")) cor = "Vermelho";
  else if (c.startsWith("AZUL")) cor = "Azul";
  else if (c.startsWith("VERD")) cor = "Verde";
  else if (c.startsWith("AMAREL")) cor = "Amarelo";
  else if (c.startsWith("MARROM")) cor = "Marrom";
  else if (c.startsWith("BEGE")) cor = "Bege";
  else if (c) cor = c.charAt(0) + c.slice(1).toLowerCase();

  // Trata Combustível
  let combustivel = "";
  const comb = combustivelRaw.toUpperCase();
  if (comb.includes("DIESEL")) combustivel = "Diesel";
  else if (comb.includes("ALCOOL") || comb.includes("FLEX") || comb.includes("ETANOL")) combustivel = "Flex";
  else if (comb.includes("GASOLINA")) combustivel = "Gasolina";
  else if (comb.includes("HIBRIDO")) combustivel = "Híbrido";
  else if (comb.includes("ELETRICO")) combustivel = "Elétrico";

  // Trata Categoria
  let categoria = "";
  const esp = (especieTipo + " " + rawLines.join(" ")).toUpperCase();
  if (esp.includes("CAMINHONETE") || esp.includes("CABINE DUPLA") || esp.includes("ABERTA")) {
    categoria = "Picape";
  } else if (esp.includes("UTILITARIO") || esp.includes("CAMIONETA")) {
    categoria = "SUV";
  } else if (esp.includes("AUTOMOVEL")) {
    categoria = "Carro de Passeio";
  } else if (esp.includes("CAMINHAO")) {
    categoria = "Caminhão";
  } else if (esp.includes("TRATOR")) {
    categoria = "Trator";
  }

  let cidade = "";
  let uf = "";
  if (cidadeUf) {
    const parts = cidadeUf.trim().split(" ");
    if (parts.length > 1) {
      uf = parts[parts.length - 1].toUpperCase();
      cidade = parts.slice(0, -1).join(" ");
    } else {
      cidade = cidadeUf;
    }
  }

  return {
    placa: placa.replace(/[^A-Z0-9]/gi, "").toUpperCase(),
    renavam,
    chassi: chassi.toUpperCase(),
    anoFabricacao,
    anoModelo,
    exercicio,
    marca,
    modelo: modeloCompleto,
    versao,
    cor,
    combustivel,
    categoria,
    motor,
    crv,
    cla,
    proprietarioNome,
    proprietarioCpf,
    cidadeUf,
    cidade,
    uf,
    rawLines,
  };
}
