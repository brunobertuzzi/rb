import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (process.env.DATABASE_URL) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
      });
      if (user && user.ativo) {
        return NextResponse.json({
          authenticated: true,
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            cargo: user.cargo,
            role: user.role,
            telefone: user.telefone || undefined,
            ativo: user.ativo,
            ultimoAcesso: user.ultimoAcesso ? user.ultimoAcesso.toISOString() : undefined,
            criadoEm: user.criadoEm.toISOString(),
          },
        });
      }
    } catch {
      // Continua com os dados do token se o banco oscilar
    }
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      nome: session.nome,
      email: session.email,
      role: session.role,
    },
  });
}
