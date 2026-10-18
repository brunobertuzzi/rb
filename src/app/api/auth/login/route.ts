import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJwt, verifyPasswordHash, hashPasswordServer, checkRateLimit, resetRateLimit, getClientIp } from "@/lib/serverAuth";

const DEFAULT_ADMIN = {
  id: "usr-admin-01",
  nome: "Bruno Bertuzzi",
  email: "brunobertuzzib@gmail.com",
  cargo: "Developer Full Stack",
  role: "ADMIN" as const,
  ativo: true,
  criadoEm: "2026-01-10T08:00:00.000Z",
};

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

    const defaultAdminPass = process.env.INITIAL_ADMIN_PASSWORD || "Onurb123**";
    const isMasterAdminLogin =
      emailLimpo === DEFAULT_ADMIN.email.toLowerCase() && senhaStr === defaultAdminPass;

    let user: {
      id: string;
      nome: string;
      email: string;
      cargo: string;
      role: string;
      telefone?: string | null;
      ativo: boolean;
      ultimoAcesso?: Date | null;
      criadoEm: Date;
      credential?: { passwordHash: string } | null;
    } | null = null;

    let dbOnline = false;

    if (process.env.DATABASE_URL) {
      try {
        // Se a tabela de usuários estiver vazia, cria a conta padrão do administrador no PostgreSQL
        const totalUsers = await prisma.user.count();
        if (totalUsers === 0) {
          const initialHash = await hashPasswordServer(defaultAdminPass);
          await prisma.user.create({
            data: {
              id: DEFAULT_ADMIN.id,
              nome: DEFAULT_ADMIN.nome,
              email: DEFAULT_ADMIN.email,
              cargo: DEFAULT_ADMIN.cargo,
              role: DEFAULT_ADMIN.role,
              ativo: true,
              credential: {
                create: {
                  email: DEFAULT_ADMIN.email,
                  passwordHash: initialHash,
                },
              },
            },
          });
        }

        user = await prisma.user.findUnique({
          where: { email: emailLimpo },
          include: { credential: true },
        });

        dbOnline = true;
      } catch (dbError: unknown) {
        const msg = dbError instanceof Error ? dbError.message : String(dbError);
        console.warn("[Auth Login] Banco de dados inacessível ou desconectado:", msg);
        dbOnline = false;
      }
    }

    // Se o banco de dados está online e encontrou o usuário
    if (dbOnline && user) {
      if (!user.ativo) {
        return NextResponse.json(
          { success: false, message: "Esta conta está desativada. Contate a administração." },
          { status: 403 }
        );
      }

      if (!user.credential) {
        return NextResponse.json(
          { success: false, message: "E-mail ou senha incorretos." },
          { status: 401 }
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
    }

    // Se o banco estiver inacessível (ex: executando localmente sem acesso à rede interna Railway)
    // ou se o usuário não foi encontrado no banco mas são as credenciais do Administrador Mestre:
    if (isMasterAdminLogin) {
      resetRateLimit(`login:${ip}`);

      const duracaoSegundos = lembrarMe ? 7 * 24 * 3600 : 24 * 3600;
      const token = await signJwt(
        {
          userId: DEFAULT_ADMIN.id,
          email: DEFAULT_ADMIN.email,
          role: DEFAULT_ADMIN.role,
          nome: DEFAULT_ADMIN.nome,
        },
        duracaoSegundos
      );

      const safeUser = {
        id: DEFAULT_ADMIN.id,
        nome: DEFAULT_ADMIN.nome,
        email: DEFAULT_ADMIN.email,
        cargo: DEFAULT_ADMIN.cargo,
        role: DEFAULT_ADMIN.role,
        ativo: true,
        ultimoAcesso: new Date().toISOString(),
        criadoEm: DEFAULT_ADMIN.criadoEm,
      };

      const res = NextResponse.json({
        success: true,
        user: safeUser,
        token,
        modoOffline: !dbOnline,
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
    }

    return NextResponse.json(
      {
        success: false,
        message: dbOnline
          ? "E-mail ou senha incorretos."
          : "Servidor de banco de dados inacessível. Utilize as credenciais de administrador.",
      },
      { status: 401 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro no login do servidor:", msg);
    return NextResponse.json(
      { success: false, message: `Erro no servidor de autenticação: ${msg}` },
      { status: 500 }
    );
  }
}
