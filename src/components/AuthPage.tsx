"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    ShieldCheck,
    Lock,
    Mail,
    Eye,
    EyeOff,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    KeyRound,
    Building2
} from "lucide-react";

export function AuthPage() {
    const { login, recuperarSenha, bloqueadoAte } = useAuth();

    const [modo, setModo] = useState<"LOGIN" | "RECUPERAR">("LOGIN");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mensagemErro, setMensagemErro] = useState<string | null>(null);
    const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

    // Form de Login
    const [loginEmail, setLoginEmail] = useState("");
    const [loginSenha, setLoginSenha] = useState("");
    const [lembrarMe, setLembrarMe] = useState(true);

    // Form de Recuperação / Troca de Senha
    const [recEmail, setRecEmail] = useState("");
    const [recSenhaAtual, setRecSenhaAtual] = useState("");
    const [recNovaSenha, setRecNovaSenha] = useState("");

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMensagemErro(null);
        setMensagemSucesso(null);
        setLoading(true);

        try {
            const res = await login(loginEmail, loginSenha, lembrarMe);
            if (!res.success) {
                setMensagemErro(res.message || "Falha na autenticação.");
            }
        } catch {
            setMensagemErro("Ocorreu um erro no servidor de autenticação.");
        } finally {
            setLoading(false);
        }
    };

    const handleRecuperarSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMensagemErro(null);
        setMensagemSucesso(null);
        setLoading(true);

        try {
            const res = await recuperarSenha(recEmail, recNovaSenha, recSenhaAtual);
            if (!res.success) {
                setMensagemErro(res.message || "Erro na alteração de senha.");
            } else {
                setMensagemSucesso(res.message || "Senha redefinida com sucesso!");
                setTimeout(() => {
                    setModo("LOGIN");
                    setLoginEmail(recEmail);
                    setLoginSenha("");
                    setRecSenhaAtual("");
                    setRecNovaSenha("");
                }, 1500);
            }
        } catch {
            setMensagemErro("Erro ao redefinir credencial.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f2f2f7] text-zinc-900 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
            {/* Background radial sutil */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-200">
                {/* Logo e Cabeçalho Apple iOS */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 mb-3 border border-emerald-500/30">
                        <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
                        RB Agronegócios
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                        Plataforma Corporativa de Gestão de Estoque, Finanças & Documentação
                    </p>
                </div>

                {/* Card Principal de Autenticação */}
                <div className="bg-white/95 border border-black/[0.08] rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-xl">
                    {/* Header do Card */}
                    <div className="pb-4 mb-4 border-b border-black/[0.06] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-emerald-600" />
                            <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">
                                {modo === "LOGIN" ? "Acesso ao Sistema" : "Alterar / Recuperar Senha"}
                            </h2>
                        </div>
                    </div>

                    {/* Feedback de Erro ou Sucesso */}
                    {mensagemErro && (
                        <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{mensagemErro}</span>
                        </div>
                    )}

                    {mensagemSucesso && (
                        <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2 animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{mensagemSucesso}</span>
                        </div>
                    )}

                    {/* Bloqueio Ativo por Tentativas */}
                    {bloqueadoAte && Date.now() < bloqueadoAte && (
                        <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-start gap-2">
                            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                                Proteção ativa contra tentativas incorretas. O sistema foi temporariamente bloqueado.
                            </span>
                        </div>
                    )}

                    {/* Formulário: LOGIN */}
                    {modo === "LOGIN" && (
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-zinc-600 font-medium block mb-1.5">
                                    E-mail Corporativo
                                </label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="seu.email@rbagro.com.br"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        className="w-full bg-[#f2f2f7] border border-black/[0.08] rounded-xl pl-10 pr-3 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-emerald-500 min-h-[42px] transition-all shadow-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs text-zinc-600 font-medium">
                                        Senha de Acesso
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModo("RECUPERAR");
                                            setRecEmail(loginEmail);
                                            setMensagemErro(null);
                                            setMensagemSucesso(null);
                                        }}
                                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium"
                                    >
                                        Alterar / Esqueceu a senha?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        value={loginSenha}
                                        onChange={(e) => setLoginSenha(e.target.value)}
                                        className="w-full bg-[#f2f2f7] border border-black/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-emerald-500 min-h-[42px] transition-all shadow-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1">
                                <label className="flex items-center gap-2 text-zinc-500 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={lembrarMe}
                                        onChange={(e) => setLembrarMe(e.target.checked)}
                                        className="rounded bg-white border-black/[0.15] text-emerald-600 focus:ring-0 focus:ring-offset-0"
                                    />
                                    <span>Permanecer conectado</span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm py-3 px-4 rounded-xl transition-all shadow-xs active:scale-95 min-h-[44px]"
                            >
                                {loading ? (
                                    <span>Validando credenciais...</span>
                                ) : (
                                    <>
                                        <span>Entrar no Sistema</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Formulário: RECUPERAR / ALTERAR SENHA */}
                    {modo === "RECUPERAR" && (
                        <form onSubmit={handleRecuperarSubmit} className="space-y-4">
                            <div className="text-center pb-2">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                                <h3 className="font-semibold text-sm text-zinc-900">Alteração Segura de Senha</h3>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                    Confirme sua senha atual para definir uma nova senha, ou solicite a redefinição ao Administrador do sistema.
                                </p>
                            </div>

                            <div>
                                <label className="text-xs text-zinc-600 font-medium block mb-1">
                                    E-mail Corporativo
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="seu.email@rbagro.com.br"
                                    value={recEmail}
                                    onChange={(e) => setRecEmail(e.target.value)}
                                    className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[42px] focus:outline-none shadow-xs"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-zinc-600 font-medium block mb-1">
                                    Senha Atual
                                </label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Informe sua senha atual"
                                    value={recSenhaAtual}
                                    onChange={(e) => setRecSenhaAtual(e.target.value)}
                                    className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[42px] focus:outline-none shadow-xs"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-zinc-600 font-medium block mb-1">
                                    Nova Senha
                                </label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Mínimo 6 caracteres"
                                    value={recNovaSenha}
                                    onChange={(e) => setRecNovaSenha(e.target.value)}
                                    className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[42px] focus:outline-none shadow-xs"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModo("LOGIN");
                                        setMensagemErro(null);
                                        setMensagemSucesso(null);
                                    }}
                                    className="flex-1 py-2.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-xl bg-zinc-100 hover:bg-zinc-200 transition-all min-h-[42px]"
                                >
                                    Voltar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-xs active:scale-95 min-h-[42px]"
                                >
                                    {loading ? "Salvando..." : "Salvar Nova Senha"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
