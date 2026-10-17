import { NextRequest, NextResponse } from "next/server";

const FIPE_BASE_URL = "https://fipe.parallelum.com.br/api/v2";

interface FipeItem {
  code: string;
  name: string;
}

interface FipePriceResponse {
  vehicleType: number;
  price: string;
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  codeFipe: string;
  referenceMonth: string;
  fuelAcronym: string;
}

// Cache simples em memória para economizar cota de requisições de marcas e modelos
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 horas

async function fipeFetch<T>(path: string): Promise<T> {
  const cached = memoryCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  const token = process.env.FIPE_API_TOKEN;
  const res = await fetch(`${FIPE_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { "X-Subscription-Token": token } : {}),
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Erro na API FIPE (${res.status}): ${res.statusText}`);
  }

  const data = (await res.json()) as T;
  memoryCache.set(path, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

function parseFipePriceString(priceStr: string): number {
  if (!priceStr) return 0;
  // Ex: "R$ 119.329,00" -> 119329.00
  const cleaned = priceStr.replace(/[^\d,]/g, "").replace(",", ".");
  const val = parseFloat(cleaned);
  return Number.isFinite(val) ? val : 0;
}

function normalizeStr(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BRAND_ALIASES: Record<string, string[]> = {
  VW: ["VW", "VOLKSWAGEN"],
  VOLKSWAGEN: ["VW", "VOLKSWAGEN"],
  GM: ["GM", "CHEVROLET"],
  CHEVROLET: ["GM", "CHEVROLET"],
  MB: ["MERCEDES", "MERCEDES BENZ"],
  "M.BENZ": ["MERCEDES", "MERCEDES BENZ"],
  MERCEDES: ["MERCEDES", "MERCEDES BENZ"],
  LAND: ["LAND ROVER"],
};

function findBestBrand(brands: FipeItem[], marcaInput: string): FipeItem | null {
  const normInput = normalizeStr(marcaInput);
  if (!normInput) return null;

  const firstWord = normInput.split(" ")[0];
  const candidateTerms = [
    normInput,
    ...(BRAND_ALIASES[normInput] || []),
    ...(BRAND_ALIASES[firstWord] || []),
  ];

  // 1. Match exato ou início
  for (const term of candidateTerms) {
    const exact = brands.find((b) => normalizeStr(b.name) === term);
    if (exact) return exact;
  }

  // 2. Contém palavra inteira
  for (const term of candidateTerms) {
    const wordMatch = brands.find((b) => {
      const words = normalizeStr(b.name).split(" ");
      return words.includes(term) || normalizeStr(b.name).includes(term);
    });
    if (wordMatch) return wordMatch;
  }

  return null;
}

function scoreModelMatch(fipeModelName: string, searchFull: string): number {
  const normFipe = normalizeStr(fipeModelName);
  const normSearch = normalizeStr(searchFull);
  if (!normSearch) return 0;

  if (normFipe === normSearch) return 1000;

  const searchTokens = normSearch.split(" ").filter((t) => t.length >= 1);
  const fipeTokens = normFipe.split(" ").filter((t) => t.length >= 1);
  if (searchTokens.length === 0) return 0;

  let score = 0;

  // Primeiro token (nome base do modelo, ex: PUNTO, FRONTIER, STRADA, HILUX, GOL) tem peso alto
  const baseModel = searchTokens[0];
  if (fipeTokens[0] === baseModel) {
    score += 50;
  } else if (fipeTokens.includes(baseModel)) {
    score += 30;
  } else if (normFipe.includes(baseModel)) {
    score += 15;
  } else {
    return 0; // Se nem o nome base do modelo bate, descarta
  }

  for (let i = 1; i < searchTokens.length; i++) {
    const token = searchTokens[i];
    if (fipeTokens.includes(token)) {
      // Motorização (ex: 1.6, 2.0, 4X4) ou versão exata ganha mais pontos
      score += /\d/.test(token) ? 18 : 14;
    } else if (normFipe.includes(token)) {
      score += 7;
    }
  }

  return score;
}

function findBestYear(
  years: FipeItem[],
  anoModeloInput: string,
  combustivelInput: string
): FipeItem | null {
  if (years.length === 0) return null;
  const anoLimpo = (anoModeloInput || "").replace(/\D/g, "");
  const normComb = normalizeStr(combustivelInput);

  const matchingYearCandidates = anoLimpo
    ? years.filter((y) => y.code.startsWith(`${anoLimpo}-`) || y.name.startsWith(anoLimpo))
    : years;

  const pool = matchingYearCandidates.length > 0 ? matchingYearCandidates : years;

  if (normComb) {
    const byComb = pool.find((y) => {
      const yNorm = normalizeStr(y.name);
      if (normComb.includes("DIESEL") && yNorm.includes("DIESEL")) return true;
      if (normComb.includes("FLEX") && (yNorm.includes("FLEX") || yNorm.includes("GASOLINA"))) return true;
      if (normComb.includes("GASOLINA") && yNorm.includes("GASOLINA")) return true;
      if ((normComb.includes("ALCOOL") || normComb.includes("ETANOL")) && yNorm.includes("ALCOOL")) return true;
      if (normComb.includes("ELETRICO") && yNorm.includes("ELETRICO")) return true;
      if (normComb.includes("HIBRIDO") && yNorm.includes("HIBRIDO")) return true;
      return false;
    });
    if (byComb) return byComb;
  }

  return pool[0];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "brands";
    const type = searchParams.get("type") || "cars"; // cars | trucks | motorcycles

    if (action === "brands") {
      const brands = await fipeFetch<FipeItem[]>(`/${type}/brands`);
      return NextResponse.json({ sucesso: true, brands });
    }

    if (action === "models") {
      const brandId = searchParams.get("brandId");
      if (!brandId) {
        return NextResponse.json({ sucesso: false, erro: "brandId é obrigatório." }, { status: 400 });
      }
      const models = await fipeFetch<FipeItem[]>(`/${type}/brands/${brandId}/models`);
      return NextResponse.json({ sucesso: true, models });
    }

    if (action === "years") {
      const brandId = searchParams.get("brandId");
      const modelId = searchParams.get("modelId");
      if (!brandId || !modelId) {
        return NextResponse.json({ sucesso: false, erro: "brandId e modelId são obrigatórios." }, { status: 400 });
      }
      const years = await fipeFetch<FipeItem[]>(`/${type}/brands/${brandId}/models/${modelId}/years`);
      return NextResponse.json({ sucesso: true, years });
    }

    if (action === "price") {
      const brandId = searchParams.get("brandId");
      const modelId = searchParams.get("modelId");
      const yearId = searchParams.get("yearId");
      if (!brandId || !modelId || !yearId) {
        return NextResponse.json(
          { sucesso: false, erro: "brandId, modelId e yearId são obrigatórios." },
          { status: 400 }
        );
      }
      const info = await fipeFetch<FipePriceResponse>(
        `/${type}/brands/${brandId}/models/${modelId}/years/${yearId}`
      );
      return NextResponse.json({
        sucesso: true,
        fipeInfo: {
          ...info,
          priceNumeric: parseFipePriceString(info.price),
        },
      });
    }


    if (action === "smart-search") {
      const marca = searchParams.get("marca") || "";
      const modelo = searchParams.get("modelo") || "";
      const versao = searchParams.get("versao") || "";
      const ano = searchParams.get("ano") || "";
      const combustivel = searchParams.get("combustivel") || "";

      const brands = await fipeFetch<FipeItem[]>(`/${type}/brands`);
      const matchedBrand = findBestBrand(brands, marca);

      if (!matchedBrand) {
        return NextResponse.json({
          sucesso: true,
          brands,
          matchedBrand: null,
          models: [],
          matchedModel: null,
          years: [],
          matchedYear: null,
          fipeInfo: null,
        });
      }

      const models = await fipeFetch<FipeItem[]>(`/${type}/brands/${matchedBrand.code}/models`);
      const fullSearch = `${modelo} ${versao}`.trim();

      let matchedModel: FipeItem | null = null;
      if (fullSearch) {
        const scored = models
          .map((m) => ({ item: m, score: scoreModelMatch(m.name, fullSearch) }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score);

        if (scored.length > 0) {
          matchedModel = scored[0].item;
        }
      }

      if (!matchedModel) {
        return NextResponse.json({
          sucesso: true,
          brands,
          matchedBrand,
          models,
          matchedModel: null,
          years: [],
          matchedYear: null,
          fipeInfo: null,
        });
      }

      const years = await fipeFetch<FipeItem[]>(
        `/${type}/brands/${matchedBrand.code}/models/${matchedModel.code}/years`
      );
      const matchedYear = findBestYear(years, ano, combustivel);

      let fipeInfo = null;
      if (matchedYear) {
        const rawInfo = await fipeFetch<FipePriceResponse>(
          `/${type}/brands/${matchedBrand.code}/models/${matchedModel.code}/years/${matchedYear.code}`
        );
        fipeInfo = {
          ...rawInfo,
          priceNumeric: parseFipePriceString(rawInfo.price),
        };
      }

      return NextResponse.json({
        sucesso: true,
        brands,
        matchedBrand,
        models,
        matchedModel,
        years,
        matchedYear,
        fipeInfo,
      });
    }

    return NextResponse.json({ sucesso: false, erro: "Ação inválida." }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao consultar a Tabela FIPE.";
    return NextResponse.json({ sucesso: false, erro: message }, { status: 500 });
  }
}
