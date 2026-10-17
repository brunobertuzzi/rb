"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, AuthSession, UserRole } from "@/types/auth";
import { hashPassword, generateSecureToken, sanitizeInput, computeSessionSignature } from "@/lib/authSecurity";

interface StoredCredential {
    userId: string;
    email: string;
    passwordHash: string;
}

interface AuthContextType {
    user: User | null;
    session: AuthSession | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, senha: string, lembrarMe?: boolean) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    recuperarSenha: (email: string, novaSenha: string, senhaAtual?: string) => Promise<{ success: boolean; message?: string }>;
    alterarSenha: (senhaAtual: string, novaSenha: string) => Promise<{ success: boolean; message?: string }>;
    bloqueadoAte: number | null;
    tentativasFalhas: number;
    hasRole: (requiredRole: UserRole | UserRole[]) => boolean;

    // Gestão Exclusiva de Usuários pelo Administrador
    usersList: User[];
    adicionarUsuarioPorAdmin: (dados: {
        nome: string;
        email: string;
        senha: string;
        cargo: string;
        role: UserRole;
        telefone?: string;
    }) => Promise<{ success: boolean; message?: string }>;
    atualizarUsuarioPorAdmin: (id: string, dados: Partial<User>) => void;
    excluirUsuarioPorAdmin: (id: string) => { success: boolean; message?: string };
    redefinirSenhaPorAdmin: (userId: string, novaSenha: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Conta corporativa principal pré-configurada
const DEFAULT_USERS: User[] = [
    {
        id: "usr-admin-01",
        nome: "Bruno Bertuzzi",
        email: "brunobertuzzib@gmail.com",
        cargo: "Developer Full Stack",
        role: "ADMIN",
        ativo: true,
        criadoEm: "2026-01-10T08:00:00.000Z",
    },
];

async function postSync(action: string, entity?: string, data?: unknown, id?: string) {
    try {
        await fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, entity, data, id }),
        });
    } catch (err) {
        console.warn("Sincronização de usuário com PostgreSQL pendente:", err);
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<AuthSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [usersList, setUsersList] = useState<User[]>(DEFAULT_USERS);
    const [credentials, setCredentials] = useState<StoredCredential[]>([]);
    const [tentativasFalhas, setTentativasFalhas] = useState<number>(0);
    const [bloqueadoAte, setBloqueadoAte] = useState<number | null>(null);

    const persistLockout = (tentativas: number, bloqueio: number | null) => {
        setTentativasFalhas(tentativas);
        setBloqueadoAte(bloqueio);
        if (typeof window !== "undefined") {
            if (tentativas === 0 && !bloqueio) {
                localStorage.removeItem("rb_auth_lockout");
            } else {
                localStorage.setItem(
                    "rb_auth_lockout",
                    JSON.stringify({ tentativasFalhas: tentativas, bloqueadoAte: bloqueio })
                );
            }
        }
    };

    // Inicialização e recuperação de sessão segura
    useEffect(() => {
        async function initAuth() {
            if (typeof window === "undefined") return;

            try {
                // Restaura estado de bloqueio contra força bruta
                const savedLockout = localStorage.getItem("rb_auth_lockout");
                if (savedLockout) {
                    try {
                        const parsedLockout = JSON.parse(savedLockout);
                        if (parsedLockout.bloqueadoAte && Date.now() < parsedLockout.bloqueadoAte) {
                            setBloqueadoAte(parsedLockout.bloqueadoAte);
                            setTentativasFalhas(parsedLockout.tentativasFalhas || 5);
                        } else if (parsedLockout.tentativasFalhas) {
                            setTentativasFalhas(parsedLockout.tentativasFalhas);
                            setBloqueadoAte(null);
                        }
                    } catch {
                        localStorage.removeItem("rb_auth_lockout");
                    }
                }

                const savedCreds = localStorage.getItem("rb_auth_credentials");
                const savedUsers = localStorage.getItem("rb_auth_users");

                const defaultAdminHash = await hashPassword("Onurb123**");

                let currentUsers: User[] = DEFAULT_USERS;
                if (savedUsers) {
                    try {
                        const parsed: User[] = JSON.parse(savedUsers);
                        if (Array.isArray(parsed)) {
                            currentUsers = parsed
                                .filter((u) => u.id !== "usr-gerente-02" && u.id !== "usr-vendas-03")
                                .map((u) => {
                                    if (u.id === "usr-admin-01") {
                                        return {
                                            ...u,
                                            nome: u.nome || "Bruno Bertuzzi",
                                            email: "brunobertuzzib@gmail.com",
                                            role: "ADMIN",
                                        };
                                    }
                                    return u;
                                });
                            if (!currentUsers.some((u) => u.id === "usr-admin-01" || u.role === "ADMIN")) {
                                currentUsers.unshift(DEFAULT_USERS[0]);
                            }
                        }
                    } catch {
                        currentUsers = DEFAULT_USERS;
                    }
                }
                setUsersList(currentUsers);
                localStorage.setItem("rb_auth_users", JSON.stringify(currentUsers));

                let currentCreds: StoredCredential[] = [
                    { userId: "usr-admin-01", email: "brunobertuzzib@gmail.com", passwordHash: defaultAdminHash },
                ];

                if (savedCreds) {
                    try {
                        const parsedCreds: StoredCredential[] = JSON.parse(savedCreds);
                        if (Array.isArray(parsedCreds)) {
                            currentCreds = parsedCreds
                                .filter((c) => c.userId !== "usr-gerente-02" && c.userId !== "usr-vendas-03")
                                .map((c) => {
                                    if (c.userId === "usr-admin-01" || c.email === "admin@rbagro.com.br" || c.email === "brunobertuzzib@gmail.com") {
                                        return {
                                            ...c,
                                            userId: "usr-admin-01",
                                            email: "brunobertuzzib@gmail.com",
                                            // Preserva o hash salvo caso o administrador já tenha alterado a senha
                                            passwordHash: c.passwordHash || defaultAdminHash,
                                        };
                                    }
                                    return c;
                                });
                            if (!currentCreds.some((c) => c.userId === "usr-admin-01")) {
                                currentCreds.unshift({ userId: "usr-admin-01", email: "brunobertuzzib@gmail.com", passwordHash: defaultAdminHash });
                            }
                        }
                    } catch {
                        // fallback
                    }
                }
                setCredentials(currentCreds);
                localStorage.setItem("rb_auth_credentials", JSON.stringify(currentCreds));

                // Sincroniza usuários e credenciais com PostgreSQL se disponível
                fetch("/api/sync")
                    .then((res) => res.json())
                    .then((result) => {
                        if (result?.connected && result?.data?.users?.length > 0) {
                            setUsersList(result.data.users);
                            if (result.data.credentials) setCredentials(result.data.credentials);
                        } else if (result?.connected && currentUsers.length > 0) {
                            postSync("seed_migration", undefined, { users: currentUsers, credentials: currentCreds });
                        }
                    })
                    .catch(() => {});

                // Recupera sessão existente se válida e íntegra contra adulteração de role
                const savedSession = localStorage.getItem("rb_auth_session");
                if (savedSession) {
                    const parsedSession: AuthSession & { signature?: string } = JSON.parse(savedSession);
                    const matchedUser = currentUsers.find(
                        (u) => u.id === parsedSession?.user?.id && u.ativo
                    );

                    if (parsedSession && Date.now() < parsedSession.expiresAt && matchedUser) {
                        const expectedSig = computeSessionSignature(
                            matchedUser.id,
                            matchedUser.email,
                            matchedUser.role,
                            String(parsedSession.expiresAt)
                        );
                        // Se havia assinatura e ela diverge do role armazenado na sessão, bloqueia adulteração
                        if (parsedSession.signature && parsedSession.signature !== expectedSig) {
                            localStorage.removeItem("rb_auth_session");
                        } else {
                            const verifiedSession = {
                                ...parsedSession,
                                user: matchedUser,
                                signature: expectedSig,
                            };
                            localStorage.setItem("rb_auth_session", JSON.stringify(verifiedSession));
                            setSession(verifiedSession);
                            setUser(matchedUser);
                        }
                    } else {
                        localStorage.removeItem("rb_auth_session");
                    }
                }
            } catch (err) {
                console.error("Erro ao inicializar segurança de autenticação:", err);
            } finally {
                setIsLoading(false);
            }
        }

        initAuth();
    }, []);

    // Login Seguro com bloqueio contra força bruta persistido
    const login = async (
        emailInput: string,
        senhaInput: string,
        lembrarMe: boolean = true
    ): Promise<{ success: boolean; message?: string }> => {
        const emailLimpo = sanitizeInput(emailInput).toLowerCase();

        // Verificação de bloqueio ativo por tentativas excessivas
        if (bloqueadoAte && Date.now() < bloqueadoAte) {
            const segundosRestantes = Math.ceil((bloqueadoAte - Date.now()) / 1000);
            return {
                success: false,
                message: `Acesso temporariamente bloqueado por segurança. Aguarde ${segundosRestantes} segundos para tentar novamente.`,
            };
        }

        const targetUser = usersList.find((u) => u.email.toLowerCase() === emailLimpo);
        const targetCred = credentials.find((c) => c.email.toLowerCase() === emailLimpo);

        if (!targetUser || !targetCred) {
            const novasTentativas = tentativasFalhas + 1;

            if (novasTentativas >= 5) {
                const tempoBloqueio = Date.now() + 30 * 1000;
                persistLockout(novasTentativas, tempoBloqueio);
                return {
                    success: false,
                    message: "Múltiplas tentativas incorretas. Sistema bloqueado por 30 segundos por proteção contra invasões.",
                };
            }

            persistLockout(novasTentativas, null);
            return {
                success: false,
                message: `E-mail ou senha incorretos. (${5 - novasTentativas} tentativas restantes antes do bloqueio)`,
            };
        }

        if (!targetUser.ativo) {
            return {
                success: false,
                message: "Esta conta de usuário está desativada. Contate a administração do sistema.",
            };
        }

        // Calcula e compara o hash da senha
        const hashedAttempt = await hashPassword(senhaInput);
        if (hashedAttempt !== targetCred.passwordHash) {
            const novasTentativas = tentativasFalhas + 1;

            if (novasTentativas >= 5) {
                const tempoBloqueio = Date.now() + 30 * 1000;
                persistLockout(novasTentativas, tempoBloqueio);
                return {
                    success: false,
                    message: "Múltiplas tentativas incorretas. Sistema bloqueado por 30 segundos por proteção contra invasões.",
                };
            }

            persistLockout(novasTentativas, null);
            return {
                success: false,
                message: `E-mail ou senha incorretos. (${5 - novasTentativas} tentativas restantes antes do bloqueio)`,
            };
        }

        // Sucesso na autenticação: reseta tentativas de falha
        persistLockout(0, null);

        // Criação de sessão segura assinada
        const duracaoMs = lembrarMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const expiresAt = Date.now() + duracaoMs;
        const updatedUser: User = {
            ...targetUser,
            ultimoAcesso: new Date().toISOString(),
        };

        const signature = computeSessionSignature(
            updatedUser.id,
            updatedUser.email,
            updatedUser.role,
            String(expiresAt)
        );

        const newSession: AuthSession & { signature?: string } = {
            token: generateSecureToken(),
            user: updatedUser,
            expiresAt,
            lembrarMe,
            signature,
        };

        setUser(updatedUser);
        setSession(newSession);

        const updatedUsersList = usersList.map((u) => (u.id === updatedUser.id ? updatedUser : u));
        setUsersList(updatedUsersList);
        localStorage.setItem("rb_auth_users", JSON.stringify(updatedUsersList));
        localStorage.setItem("rb_auth_session", JSON.stringify(newSession));

        return { success: true };
    };

    // Logout Seguro (invalidação imediata do token e sessão)
    const logout = () => {
        setUser(null);
        setSession(null);
        if (typeof window !== "undefined") {
            localStorage.removeItem("rb_auth_session");
        }
    };

    // Redefinição de Senha com validação obrigatória da senha atual (impede Account Takeover não autenticado)
    const recuperarSenha = async (
        emailInput: string,
        novaSenha: string,
        senhaAtual?: string
    ): Promise<{ success: boolean; message?: string }> => {
        const emailLimpo = sanitizeInput(emailInput).toLowerCase();
        const cred = credentials.find((c) => c.email.toLowerCase() === emailLimpo);

        if (!cred) {
            return { success: false, message: "Credenciais inválidas ou e-mail não localizado." };
        }

        // Exige validação da senha atual caso não seja um Administrador autenticado
        const isAdminAutenticado = user && user.role === "ADMIN";
        if (!isAdminAutenticado) {
            if (!senhaAtual) {
                return {
                    success: false,
                    message: "Por segurança, informe sua senha atual ou solicite o reset ao Administrador do sistema.",
                };
            }
            const hashAtual = await hashPassword(senhaAtual);
            if (hashAtual !== cred.passwordHash) {
                return {
                    success: false,
                    message: "A senha atual informada está incorreta. Caso não se lembre, solicite a redefinição ao Administrador.",
                };
            }
        }

        if (novaSenha.length < 6) {
            return { success: false, message: "A nova senha deve ter no mínimo 6 caracteres." };
        }

        const newHash = await hashPassword(novaSenha);
        const updatedCreds = credentials.map((c) =>
            c.email.toLowerCase() === emailLimpo ? { ...c, passwordHash: newHash } : c
        );

        setCredentials(updatedCreds);
        localStorage.setItem("rb_auth_credentials", JSON.stringify(updatedCreds));

        return { success: true, message: "Senha atualizada com sucesso! Você já pode acessar o sistema." };
    };

    // Alteração de Senha do usuário logado
    const alterarSenha = async (
        senhaAtual: string,
        novaSenha: string
    ): Promise<{ success: boolean; message?: string }> => {
        if (!user) return { success: false, message: "Nenhum usuário conectado." };

        const cred = credentials.find((c) => c.userId === user.id);
        if (!cred) return { success: false, message: "Credenciais de acesso não encontradas." };

        const hashAtual = await hashPassword(senhaAtual);
        if (hashAtual !== cred.passwordHash) {
            return { success: false, message: "A senha atual informada está incorreta." };
        }

        if (novaSenha.length < 6) {
            return { success: false, message: "A nova senha deve conter no mínimo 6 caracteres." };
        }

        const novoHash = await hashPassword(novaSenha);
        const updatedCreds = credentials.map((c) =>
            c.userId === user.id ? { ...c, passwordHash: novoHash } : c
        );

        setCredentials(updatedCreds);
        localStorage.setItem("rb_auth_credentials", JSON.stringify(updatedCreds));
        postSync("save_credential", "credential", { userId: user.id, email: user.email, passwordHash: novoHash });

        return { success: true, message: "Sua senha foi alterada com segurança!" };
    };

    // -------------------------------------------------------------
    // GESTÃO EXCLUSIVA DE USUÁRIOS PELO ADMINISTRADOR (CRUD)
    // -------------------------------------------------------------
    const adicionarUsuarioPorAdmin = async (dados: {
        nome: string;
        email: string;
        senha: string;
        cargo: string;
        role: UserRole;
        telefone?: string;
    }): Promise<{ success: boolean; message?: string }> => {
        if (!user || user.role !== "ADMIN") {
            return { success: false, message: "Acesso negado: apenas Administradores podem cadastrar usuários." };
        }

        const emailLimpo = sanitizeInput(dados.email).toLowerCase();

        if (!dados.nome || !emailLimpo || !dados.senha) {
            return { success: false, message: "Preencha todos os campos obrigatórios." };
        }

        if (dados.senha.length < 6) {
            return { success: false, message: "A senha provisória deve conter no mínimo 6 caracteres." };
        }

        if (usersList.some((u) => u.email.toLowerCase() === emailLimpo)) {
            return { success: false, message: "Este endereço de e-mail já está cadastrado no sistema." };
        }

        const novoId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const novoUsuario: User = {
            id: novoId,
            nome: sanitizeInput(dados.nome),
            email: emailLimpo,
            cargo: sanitizeInput(dados.cargo) || "Colaborador",
            role: dados.role || "VENDEDOR",
            telefone: dados.telefone ? sanitizeInput(dados.telefone) : undefined,
            ativo: true,
            criadoEm: new Date().toISOString(),
            ultimoAcesso: undefined,
        };

        const passHash = await hashPassword(dados.senha);
        const novaCred: StoredCredential = {
            userId: novoId,
            email: emailLimpo,
            passwordHash: passHash,
        };

        const updatedUsers = [...usersList, novoUsuario];
        const updatedCreds = [...credentials, novaCred];

        setUsersList(updatedUsers);
        setCredentials(updatedCreds);

        localStorage.setItem("rb_auth_users", JSON.stringify(updatedUsers));
        localStorage.setItem("rb_auth_credentials", JSON.stringify(updatedCreds));

        postSync("save_user", "user", novoUsuario);
        postSync("save_credential", "credential", novaCred);

        return { success: true };
    };

    const atualizarUsuarioPorAdmin = (id: string, dados: Partial<User>) => {
        if (!user || user.role !== "ADMIN") return;

        let usuarioAtualizado: User | null = null;
        const updated = usersList.map((u) => {
            if (u.id === id) {
                usuarioAtualizado = { ...u, ...dados };
                return usuarioAtualizado;
            }
            return u;
        });
        setUsersList(updated);
        localStorage.setItem("rb_auth_users", JSON.stringify(updated));

        if (usuarioAtualizado) {
            postSync("save_user", "user", usuarioAtualizado);
        }

        if (dados.email) {
            const emailLimpo = sanitizeInput(dados.email).toLowerCase();
            const updatedCreds = credentials.map((c) => (c.userId === id ? { ...c, email: emailLimpo } : c));
            setCredentials(updatedCreds);
            localStorage.setItem("rb_auth_credentials", JSON.stringify(updatedCreds));
            const credItem = updatedCreds.find((c) => c.userId === id);
            if (credItem) {
                postSync("save_credential", "credential", credItem);
            }
        }

        // Se editou o usuário ativo no momento, atualiza também a sessão
        if (user && user.id === id) {
            const updatedCurrentUser = { ...user, ...dados };
            setUser(updatedCurrentUser);
            if (session) {
                const sig = computeSessionSignature(
                    updatedCurrentUser.id,
                    updatedCurrentUser.email,
                    updatedCurrentUser.role,
                    String(session.expiresAt)
                );
                const updatedSession = { ...session, user: updatedCurrentUser, signature: sig };
                setSession(updatedSession);
                localStorage.setItem("rb_auth_session", JSON.stringify(updatedSession));
            }
        }
    };

    const excluirUsuarioPorAdmin = (id: string): { success: boolean; message?: string } => {
        if (!user || user.role !== "ADMIN") {
            return { success: false, message: "Acesso negado: apenas Administradores podem excluir usuários." };
        }
        if (user.id === id || id === "usr-admin-01") {
            return { success: false, message: "Você não pode excluir a conta principal de administrador." };
        }
        const updated = usersList.filter((u) => u.id !== id);
        const updatedCreds = credentials.filter((c) => c.userId !== id);
        setUsersList(updated);
        setCredentials(updatedCreds);
        localStorage.setItem("rb_auth_users", JSON.stringify(updated));
        localStorage.setItem("rb_auth_credentials", JSON.stringify(updatedCreds));

        postSync("delete_user", "user", undefined, id);
        return { success: true };
    };

    const redefinirSenhaPorAdmin = async (
        userId: string,
        novaSenha: string
    ): Promise<{ success: boolean; message?: string }> => {
        if (!user || user.role !== "ADMIN") {
            return { success: false, message: "Acesso negado: apenas Administradores podem redefinir senhas." };
        }
        if (novaSenha.length < 6) {
            return { success: false, message: "A nova senha deve ter no mínimo 6 caracteres." };
        }
        const newHash = await hashPassword(novaSenha);
        const updatedCreds = credentials.map((c) =>
            c.userId === userId ? { ...c, passwordHash: newHash } : c
        );
        setCredentials(updatedCreds);
        localStorage.setItem("rb_auth_credentials", JSON.stringify(updatedCreds));

        const credItem = updatedCreds.find((c) => c.userId === userId);
        if (credItem) {
            postSync("save_credential", "credential", credItem);
        }

        return { success: true, message: "Senha redefinida com sucesso!" };
    };

    // Verificação de permissões RBAC
    const hasRole = (requiredRole: UserRole | UserRole[]): boolean => {
        if (!user) return false;
        if (user.role === "ADMIN") return true;
        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(user.role);
        }
        return user.role === requiredRole;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                isAuthenticated: !!user && !!session,
                isLoading,
                login,
                logout,
                recuperarSenha,
                alterarSenha,
                bloqueadoAte,
                tentativasFalhas,
                hasRole,
                usersList,
                adicionarUsuarioPorAdmin,
                atualizarUsuarioPorAdmin,
                excluirUsuarioPorAdmin,
                redefinirSenhaPorAdmin,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
    }
    return context;
}
