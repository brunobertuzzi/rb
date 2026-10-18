import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true, message: "Sessão encerrada com sucesso." });
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https" || req.nextUrl?.protocol === "https:";

  res.cookies.set("rb_session", "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
