import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJwt, verifyPasswordHash, hashPasswordServer, checkRateLimit, resetRateLimit, getClientIp } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Rate limit: máximo de 5 tentativas a cada 5 minutos por IP
    const rateCheck = checkRateLimit(`login:${ip}`, 5, 300);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Múltiplas tentativas incorretas. Acesso bloqueado temporariamente por ${rateCheck.remainingSeconds} segundos por segurança.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, senha, lembrarMe } = body;

    const emailLimpo = String(email || "").trim().toLowerCase();
    const senhaStr = String(senha || "");

    if (!emailLimpo || !senhaStr) {
      return NextResponse.json(
        { success: false, message: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { success: false, message: "Banco de dados não configurado no servidor." },
        { status: 503 }
      );
    }

    // Se a tabela de usuários estiver vazia, cria a conta padrão do administrador
    const totalUsers = await prisma.user.count();
    if (totalUsers === 0) {
      const defaultAdminPass = process.env.INITIAL_ADMIN_PASSWORD || "Onurb123**";
      const initialHash = await hashPasswordServer(defaultAdminPass);
      await prisma.user.create({
        data: {
          id: "usr-admin-01",
          nome: "Bruno Bertuzzi",
          email: "brunobertuzzib@gmail.com",
          cargo: "Developer Full Stack",
          role: "ADMIN",
          ativo: true,
          credential: {
            create: {
              email: "brunobertuzzib@gmail.com",
              passwordHash: initialHash,
            },
          },
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: emailLimpo },
      include: { credential: true },
    });

    if (!user || !user.credential) {
      return NextResponse.json(
        { success: false, message: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    if (!user.ativo) {
      return NextResponse.json(
        { success: false, message: "Esta conta está desativada. Contate a administração." },
        { status: 403 }
      );
    }

    const senhaCorreta = await verifyPasswordHash(senhaStr, user.credential.passwordHash);
    if (!senhaCorreta) {
      return NextResponse.json(
        { success: false, message: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // Sucesso: reseta tentativas de falha do IP
    resetRateLimit(`login:${ip}`);

    // Registra timestamp do último acesso
    await prisma.user.update({
      where: { id: user.id },
      data: { ultimoAcesso: new Date() },
    }).catch(() => null);

    const duracaoSegundos = lembrarMe ? 7 * 24 * 3600 : 24 * 3600;
    const token = await signJwt(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        nome: user.nome,
      },
      duracaoSegundos
    );

    const safeUser = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      cargo: user.cargo,
      role: user.role,
      telefone: user.telefone || undefined,
      ativo: user.ativo,
      ultimoAcesso: new Date().toISOString(),
      criadoEm: user.criadoEm.toISOString(),
    };

    const res = NextResponse.json({
      success: true,
      user: safeUser,
      token,
    });

    const forwardedProto = req.headers.get("x-forwarded-proto");
    const isHttps = forwardedProto === "https" || req.nextUrl.protocol === "https:";

    res.cookies.set("rb_session", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: duracaoSegundos,
    });

    return res;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro no login do servidor:", msg);
    return NextResponse.json({ success: false, message: "Erro interno no servidor de autenticação." }, { status: 500 });
  }
}
