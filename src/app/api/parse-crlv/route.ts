import { NextRequest, NextResponse } from "next/server";
import { parseCRLVFromPdfBuffer } from "@/lib/crlvParser";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { sucesso: false, erro: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json(
        { sucesso: false, erro: "O arquivo excede o tamanho máximo permitido de 10 MB." },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Valida cabeçalho mágico %PDF-
    const header = buffer.subarray(0, 5).toString("ascii");
    if (header !== "%PDF-") {
      return NextResponse.json(
        { sucesso: false, erro: "Arquivo inválido. Envie um documento PDF oficial do CRLV-e." },
        { status: 400 }
      );
    }

    const dados = parseCRLVFromPdfBuffer(buffer);

    if (!dados.placa && !dados.chassi && !dados.renavam) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Não foi possível extrair os dados deste PDF. Verifique se é um CRLV-e digital original do SENATRAN/CDT.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: "CRLV-e processado com sucesso!",
      dados,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao processar o CRLV-e.";
    return NextResponse.json(
      { sucesso: false, erro: message },
      { status: 500 }
    );
  }
}
