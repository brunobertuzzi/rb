import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/serverAuth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protege endpoints sensíveis da API
  if (pathname.startsWith("/api/sync") || pathname.startsWith("/api/parse-crlv")) {
    // Caso especial: se não houver DATABASE_URL configurada, permite o GET /api/sync retornar o status offline
    if (pathname === "/api/sync" && req.method === "GET" && !process.env.DATABASE_URL) {
      return NextResponse.next();
    }

    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Acesso não autorizado. Faça login para acessar ou sincronizar dados.",
        },
        { status: 401 }
      );
    }

    // Injeta headers seguros com as credenciais do usuário autenticado no servidor
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", session.userId);
    requestHeaders.set("x-user-email", session.email);
    requestHeaders.set("x-user-role", session.role);
    requestHeaders.set("x-user-nome", session.nome);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/sync",
    "/api/sync/:path*",
    "/api/parse-crlv",
    "/api/parse-crlv/:path*",
  ],
};
