"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, AuthSession, UserRole } from "@/types/auth";
import { sanitizeInput } from "@/lib/authSecurity";

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
        console.warn("Sincronização com PostgreSQL pendente:", err);
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<AuthSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [usersList, setUsersList] = useState<User[]>(DEFAULT_USERS);
    const [tentativasFalhas, setTentativasFalhas] = useState<number>(0);
    const [bloqueadoAte, setBloqueadoAte] = useState<number | null>(null);

    // Inicialização da sessão e verificação de autenticação com o servidor
    useEffect(() => {
        async function initAuth() {
            if (typeof window === "undefined") return;

            try {
                // 1. Verifica se já existe uma sessão HTTP-Only válida e ativa no servidor
                try {
                    const meRes = await fetch("/api/auth/me");
                    if (meRes.ok) {
                        const meData = await meRes.json();
                        if (meData?.authenticated && meData?.user) {
                            setUser(meData.user);
                            setSession({
                                token: "cookie_session",
                                user: meData.user,
                                expiresAt: Date.now() + 24 * 3600 * 1000,
                                lembrarMe: true,
                            });
                        }
                    } else if (meRes.status === 401) {
                        localStorage.removeItem("rb_auth_session");
                    }
                } catch {
                    // Servidor offline, recupera cache local seguro
                    const savedSession = localStorage.getItem("rb_auth_session");
                    if (savedSession) {
                        try {
                            const parsed = JSON.parse(savedSession);
                            if (parsed && Date.now() < parsed.expiresAt) {
                                setUser(parsed.user);
                                setSession(parsed);
                            }
                        } catch {
                            localStorage.removeItem("rb_auth_session");
                        }
                    }
                }

                // 2. Carrega lista de usuários em cache local
                const savedUsers = localStorage.getItem("rb_auth_users");
                if (savedUsers) {
                    try {
                        const parsedUsers = JSON.parse(savedUsers);
                        if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
                            setUsersList(parsedUsers);
                        }
                    } catch {
                        // ignore
                    }
                }

                // 3. Atualiza lista de usuários a partir do servidor
                fetch("/api/sync")
                    .then((res) => (res.ok ? res.json() : null))
                    .then((result) => {
                        if (result?.connected && Array.isArray(result?.data?.users) && result.data.users.length > 0) {
                            setUsersList(result.data.users);
                            localStorage.setItem("rb_auth_users", JSON.stringify(result.data.users));
                        }
                    })
                    .catch(() => {});
            } catch (err) {
                console.error("Erro na inicialização da autenticação:", err);
            } finally {
                setIsLoading(false);
            }
        }

        initAuth();
    }, []);

    // Login Seguro no Servidor com Rate Limiting e Cookie HTTP-Only
    const login = async (
        emailInput: string,
        senhaInput: string,
        lembrarMe: boolean = true
    ): Promise<{ success: boolean; message?: string }> => {
        const emailLimpo = sanitizeInput(emailInput).toLowerCase();

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailLimpo, senha: senhaInput, lembrarMe }),
            });

            const data = await res.json();

            if (res.status === 429) {
                return {
                    success: false,
                    message: data.message || "Múltiplas tentativas incorretas. Aguarde alguns minutos antes de tentar novamente.",
                };
            }

            if (res.ok && data.success && data.user) {
                setUser(data.user);
                const newSession: AuthSession = {
                    token: data.token || "cookie_session",
                    user: data.user,
                    expiresAt: Date.now() + (lembrarMe ? 7 * 24 * 3600 * 1000 : 24 * 3600 * 1000),
                    lembrarMe,
                };
                setSession(newSession);
                localStorage.setItem("rb_auth_session", JSON.stringify(newSession));
                setTentativasFalhas(0);
                setBloqueadoAte(null);
                return { success: true };
            }

            return {
                success: false,
                message: data.message || "E-mail ou senha incorretos.",
            };
        } catch {
            return {
                success: false,
                message: "Não foi possível conectar ao servidor de autenticação. Verifique sua conexão de rede.",
            };
        }
    };

    // Logout Seguro: invalida o cookie no servidor e limpa a sessão local
    const logout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch {
            // Ignora erro de rede no logout
        }
        setUser(null);
        setSession(null);
        if (typeof window !== "undefined") {
            localStorage.removeItem("rb_auth_session");
        }
    };

    // Alteração de Senha do próprio usuário autenticado
    const alterarSenha = async (
        senhaAtual: string,
        novaSenha: string
    ): Promise<{ success: boolean; message?: string }> => {
        if (!user) return { success: false, message: "Nenhum usuário conectado." };

        if (novaSenha.length < 6) {
            return { success: false, message: "A nova senha deve conter no mínimo 6 caracteres." };
        }

        try {
            const verifyRes = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user.email, senha: senhaAtual }),
            });

            if (!verifyRes.ok) {
                return { success: false, message: "A senha atual informada está incorreta." };
            }

            await postSync("save_credential", "credential", {
                userId: user.id,
                email: user.email,
                senha: novaSenha,
            });

            return { success: true, message: "Sua senha foi alterada com segurança!" };
        } catch {
            return { success: false, message: "Erro ao comunicar com o servidor para alterar a senha." };
        }
    };

    // Recuperação / Troca com validação de senha atual
    const recuperarSenha = async (
        emailInput: string,
        novaSenha: string,
        senhaAtual?: string
    ): Promise<{ success: boolean; message?: string }> => {
        const emailLimpo = sanitizeInput(emailInput).toLowerCase();

        if (novaSenha.length < 6) {
            return { success: false, message: "A nova senha deve conter no mínimo 6 caracteres." };
        }

        const isAdminAutenticado = user && user.role === "ADMIN";
        if (!isAdminAutenticado) {
            if (!senhaAtual) {
                return {
                    success: false,
                    message: "Por segurança, informe sua senha atual ou solicite a redefinição ao Administrador do sistema.",
                };
            }

            const verifyRes = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailLimpo, senha: senhaAtual }),
            });

            if (!verifyRes.ok) {
                return { success: false, message: "A senha atual informada está incorreta." };
            }
        }

        const targetUser = usersList.find((u) => u.email.toLowerCase() === emailLimpo);
        if (targetUser) {
            await postSync("save_credential", "credential", {
                userId: targetUser.id,
                email: emailLimpo,
                senha: novaSenha,
            });
        }

        return { success: true, message: "Senha atualizada com sucesso! Você já pode acessar o sistema." };
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

        const updatedUsers = [...usersList, novoUsuario];
        setUsersList(updatedUsers);
        localStorage.setItem("rb_auth_users", JSON.stringify(updatedUsers));

        await postSync("save_user", "user", novoUsuario);
        await postSync("save_credential", "credential", {
            userId: novoId,
            email: emailLimpo,
            senha: dados.senha,
        });

        return { success: true };
    };

    const atualizarUsuarioPorAdmin = async (id: string, dados: Partial<User>) => {
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
            await postSync("save_user", "user", usuarioAtualizado);
        }

        if (user && user.id === id && usuarioAtualizado) {
            setUser(usuarioAtualizado);
            if (session) {
                const updatedSession = { ...session, user: usuarioAtualizado };
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
        setUsersList(updated);
        localStorage.setItem("rb_auth_users", JSON.stringify(updated));

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

        const targetUser = usersList.find((u) => u.id === userId);
        if (targetUser) {
            await postSync("save_credential", "credential", {
                userId,
                email: targetUser.email,
                senha: novaSenha,
            });
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
