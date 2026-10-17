"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { User, UserRole } from "@/types/auth";
import { evaluatePasswordStrength } from "@/lib/authSecurity";
import { formatDate } from "@/lib/utils";
import {
    Users,
    X,
    Plus,
    Trash2,
    Edit3,
    KeyRound,
    ShieldCheck,
    ShieldAlert,
    UserCheck,
    Save,
    Check,
    AlertCircle,
    Eye,
    EyeOff
} from "lucide-react";

interface UsuariosModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UsuariosModal({ isOpen, onClose }: UsuariosModalProps) {
    const {
        user,
        usersList,
        adicionarUsuarioPorAdmin,
        atualizarUsuarioPorAdmin,
        excluirUsuarioPorAdmin,
        redefinirSenhaPorAdmin
    } = useAuth();

    const [modoAba, setModoAba] = useState<"LISTA" | "NOVO" | "EDITAR" | "SENHA">("LISTA");
    const [usuarioSelecionado, setUsuarioSelecionado] = useState<User | null>(null);

    // Form de Novo Usuário
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [cargo, setCargo] = useState("Consultor de Vendas");
    const [role, setRole] = useState<UserRole>("VENDEDOR");
    const [telefone, setTelefone] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Form de Redefinição de Senha
    const [novaSenhaAdmin, setNovaSenhaAdmin] = useState("");

    const [mensagemErro, setMensagemErro] = useState<string | null>(null);
    const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const passStrength = evaluatePasswordStrength(senha);

    const handleAbrirNovo = () => {
        setNome("");
        setEmail("");
        setSenha("");
        setCargo("Consultor de Vendas");
        setRole("VENDEDOR");
        setTelefone("");
        setMensagemErro(null);
        setMensagemSucesso(null);
        setModoAba("NOVO");
    };

    const handleAbrirEditar = (u: User) => {
        setUsuarioSelecionado(u);
        setNome(u.nome);
        setEmail(u.email);
        setCargo(u.cargo);
        setRole(u.role);
        setTelefone(u.telefone || "");
        setMensagemErro(null);
        setMensagemSucesso(null);
        setModoAba("EDITAR");
    };

    const handleAbrirSenha = (u: User) => {
        setUsuarioSelecionado(u);
        setNovaSenhaAdmin("");
        setMensagemErro(null);
        setMensagemSucesso(null);
        setModoAba("SENHA");
    };

    const handleSalvarNovo = async (e: React.FormEvent) => {
        e.preventDefault();
        setMensagemErro(null);
        setMensagemSucesso(null);
        setLoading(true);

        try {
            const res = await adicionarUsuarioPorAdmin({
                nome,
                email,
                senha,
                cargo,
                role,
                telefone,
            });

            if (!res.success) {
                setMensagemErro(res.message || "Erro ao adicionar usuário.");
            } else {
                setMensagemSucesso("Novo usuário adicionado com sucesso!");
                setTimeout(() => setModoAba("LISTA"), 1200);
            }
        } catch {
            setMensagemErro("Erro ao cadastrar usuário.");
        } finally {
            setLoading(false);
        }
    };

    const handleSalvarEdicao = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usuarioSelecionado) return;
        setMensagemErro(null);
        setMensagemSucesso(null);
        setLoading(true);

        try {
            atualizarUsuarioPorAdmin(usuarioSelecionado.id, {
                nome,
                cargo,
                role,
                telefone,
            });

            setMensagemSucesso("Dados do usuário atualizados com sucesso!");
            setTimeout(() => setModoAba("LISTA"), 1200);
        } catch {
            setMensagemErro("Erro ao editar usuário.");
        } finally {
            setLoading(false);
        }
    };

    const handleSalvarNovaSenha = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usuarioSelecionado) return;
        setMensagemErro(null);
        setMensagemSucesso(null);
        setLoading(true);

        try {
            const res = await redefinirSenhaPorAdmin(usuarioSelecionado.id, novaSenhaAdmin);
            if (!res.success) {
                setMensagemErro(res.message || "Erro ao redefinir senha.");
            } else {
                setMensagemSucesso("Senha redefinida com sucesso!");
                setTimeout(() => setModoAba("LISTA"), 1200);
            }
        } catch {
            setMensagemErro("Erro ao redefinir senha.");
        } finally {
            setLoading(false);
        }
    };

    const handleExcluir = (u: User) => {
        if (confirm(`Tem certeza que deseja revogar o acesso e excluir o usuário "${u.nome}"?`)) {
            const res = excluirUsuarioPorAdmin(u.id);
            if (!res.success) {
                alert(res.message);
            }
        }
    };

    const handleAlternarStatus = (u: User) => {
        if (u.id === user?.id) {
            alert("Você não pode desativar seu próprio acesso ativo.");
            return;
        }
        atualizarUsuarioPorAdmin(u.id, { ativo: !u.ativo });
    };

    const getRoleBadge = (r: UserRole) => {
        switch (r) {
            case "ADMIN":
                return null;
            case "GERENTE":
                return { label: "Gerente Geral", bg: "bg-amber-50 text-amber-700 border-amber-200" };
            default:
                return { label: "Consultor Vendas", bg: "bg-blue-50 text-blue-700 border-blue-200" };
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-md overflow-y-auto">
            <div className="bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
                {/* Header Apple iOS */}
                <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/70 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                            <Users className="w-5 h-5 font-bold" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base sm:text-lg text-zinc-900 tracking-tight">
                                    Controle de Acessos e Usuários
                                </h3>
                            </div>
                            <p className="text-xs text-zinc-500 font-normal">
                                Apenas a Diretoria pode autorizar, editar ou revogar credenciais de colaboradores.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Feedback Messages */}
                {mensagemErro && (
                    <div className="mx-5 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{mensagemErro}</span>
                    </div>
                )}

                {mensagemSucesso && (
                    <div className="mx-5 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
                        <Check className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{mensagemSucesso}</span>
                    </div>
                )}

                {/* Conteúdo Dinâmico por Aba */}
                <div className="p-5 overflow-y-auto flex-1">
                    {/* ABA: LISTA DE USUÁRIOS */}
                    {modoAba === "LISTA" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
                                        Usuários Autorizados no Sistema
                                    </h4>
                                    <span className="text-[11px] text-zinc-500">
                                        {usersList.length} colaborador(es) com acesso liberado
                                    </span>
                                </div>

                                <button
                                    onClick={handleAbrirNovo}
                                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Cadastrar Novo Usuário</span>
                                </button>
                            </div>

                            <div className="space-y-2.5">
                                {usersList.map((u) => {
                                    const roleBadge = getRoleBadge(u.role);
                                    const isCurrent = u.id === user?.id;

                                    return (
                                        <div
                                            key={u.id}
                                            className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${u.ativo
                                                ? "bg-white border-black/[0.06] hover:border-black/[0.1] shadow-xs"
                                                : "bg-zinc-50 border-black/[0.04] opacity-60"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {u.nome.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <strong className="text-xs sm:text-sm font-semibold text-zinc-900">
                                                            {u.nome}
                                                        </strong>
                                                        {isCurrent && (
                                                            <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded shadow-xs">
                                                                VOCÊ
                                                            </span>
                                                        )}
                                                        {roleBadge && (
                                                            <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${roleBadge.bg}`}>
                                                                {roleBadge.label}
                                                            </span>
                                                        )}
                                                        {!u.ativo && (
                                                            <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded-full">
                                                                Inativo
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                                                        <span>{u.email}</span>
                                                        <span>•</span>
                                                        <span>{u.cargo}</span>
                                                        {u.ultimoAcesso && (
                                                            <>
                                                                <span>•</span>
                                                                <span>Último acesso: {formatDate(u.ultimoAcesso)}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-black/[0.06]">
                                                {/* Ativar/Desativar */}
                                                <button
                                                    onClick={() => handleAlternarStatus(u)}
                                                    title={u.ativo ? "Desativar Acesso" : "Ativar Acesso"}
                                                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${u.ativo
                                                        ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-black/[0.06]"
                                                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                        }`}
                                                >
                                                    {u.ativo ? "Desativar" : "Ativar"}
                                                </button>

                                                {/* Redefinir Senha */}
                                                <button
                                                    onClick={() => handleAbrirSenha(u)}
                                                    title="Redefinir Senha do Usuário"
                                                    className="w-7 h-7 rounded-xl bg-zinc-100 hover:bg-amber-50 text-zinc-500 hover:text-amber-700 border border-black/[0.06] flex items-center justify-center transition-colors"
                                                >
                                                    <KeyRound className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Editar */}
                                                <button
                                                    onClick={() => handleAbrirEditar(u)}
                                                    title="Editar Usuário"
                                                    className="w-7 h-7 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 border border-black/[0.06] flex items-center justify-center transition-colors"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Excluir */}
                                                {!isCurrent && (
                                                    <button
                                                        onClick={() => handleExcluir(u)}
                                                        title="Excluir Usuário"
                                                        className="w-7 h-7 rounded-xl bg-zinc-100 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 border border-black/[0.06] flex items-center justify-center transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ABA: CADASTRAR NOVO USUÁRIO */}
                    {modoAba === "NOVO" && (
                        <form onSubmit={handleSalvarNovo} className="space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                                <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                                    Adicionar Novo Colaborador
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => setModoAba("LISTA")}
                                    className="text-xs text-zinc-500 hover:text-zinc-900"
                                >
                                    &larr; Voltar para a lista
                                </button>
                            </div>

                            <div>
                                <label className="text-xs text-zinc-600 font-medium block mb-1">
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Nome completo do colaborador"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] focus:outline-none shadow-xs"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-zinc-600 font-medium block mb-1">
                                        E-mail Institucional *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="colaborador@empresa.com.br"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] focus:outline-none shadow-xs"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-zinc-600 font-medium block mb-1">
                                        Telefone / WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="(00) 00000-0000"
                                        value={telefone}
                                        onChange={(e) => setTelefone(e.target.value)}
                                        className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] focus:outline-none shadow-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-zinc-600 font-medium block mb-1">
                                        Nível de Acesso
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as UserRole)}
                                        className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] focus:outline-none shadow-xs"
                                    >
                                        <option value="ADMIN">Diretor (Acesso Total)</option>
                                        <option value="GERENTE">Gerente de Pátio & Docs</option>
                                        <option value="VENDEDOR">Consultor de Vendas</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-zinc-600 font-medium block mb-1">
                                        Cargo / Função
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Cargo ou função"
                                        value={cargo}
                                        onChange={(e) => setCargo(e.target.value)}
                                        className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] focus:outline-none shadow-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-zinc-600 font-medium block mb-1">
                                    Senha Inicial de Acesso *
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="No mínimo 6 caracteres"
                                        value={senha}
                                        onChange={(e) => setSenha(e.target.value)}
                                        className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 pr-10 py-2 text-xs text-zinc-900 min-h-[40px] focus:outline-none shadow-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {senha.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-zinc-500">Força da Senha:</span>
                                            <span className="font-semibold text-zinc-700">{passStrength.label}</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1 h-1.5">
                                            {[1, 2, 3, 4].map((step) => (
                                                <div
                                                    key={step}
                                                    className={`rounded-full h-full transition-all ${passStrength.score >= step ? passStrength.color : "bg-zinc-200"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06]">
                                <button
                                    type="button"
                                    onClick={() => setModoAba("LISTA")}
                                    className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs active:scale-95 min-h-[40px]"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>Cadastrar Usuário</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ABA: EDITAR DADOS DO USUÁRIO */}
                    {modoAba === "EDITAR" && usuarioSelecionado && (
                        <form onSubmit={handleSalvarEdicao} className="space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                                <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                                    Editar Colaborador: {usuarioSelecionado.nome}
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => setModoAba("LISTA")}
                                    className="text-xs text-zinc-500 hover:text-zinc-900"
                                >
                                    &larr; Voltar para a lista
                                </button>
                            </div>

                            <div>
                                <label className="text-xs text-zinc-600 font-medium block mb-1">
                                    Nome Completo
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] focus:outline-none shadow-xs"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-zinc-600 font-medium block mb-1">
                                        E-mail (fixo)
                                    </label>
                                    <input
                                        type="email"
                                        disabled
                                        value={email}
                                        className="w-full bg-zinc-100 border border-black/[0.05] rounded-xl px-3 py-2 text-xs text-zinc-400 cursor-not-allowed min-h-[40px]"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-zinc-600 font-medium block mb-1">
                                        Telefone
                                    </label>
                                    <input
                                        type="text"
                                        value={telefone}
                                        onChange={(e) => setTelefone(e.target.value)}
                                        className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] focus:outline-none shadow-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-zinc-600 font-medium block mb-1">
                                        Nível de Acesso
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as UserRole)}
                                        className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] focus:outline-none shadow-xs"
                                    >
                                        <option value="ADMIN">Diretor (Acesso Total)</option>
                                        <option value="GERENTE">Gerente de Pátio & Docs</option>
                                        <option value="VENDEDOR">Consultor de Vendas</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-zinc-600 font-medium block mb-1">
                                        Cargo / Função
                                    </label>
                                    <input
                                        type="text"
                                        value={cargo}
                                        onChange={(e) => setCargo(e.target.value)}
                                        className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] focus:outline-none shadow-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06]">
                                <button
                                    type="button"
                                    onClick={() => setModoAba("LISTA")}
                                    className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs active:scale-95 min-h-[40px]"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>Salvar Alterações</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ABA: REDEFINIR SENHA DO USUÁRIO */}
                    {modoAba === "SENHA" && usuarioSelecionado && (
                        <form onSubmit={handleSalvarNovaSenha} className="space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                                <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                                    Redefinir Senha de: {usuarioSelecionado.nome}
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => setModoAba("LISTA")}
                                    className="text-xs text-zinc-500 hover:text-zinc-900"
                                >
                                    &larr; Voltar para a lista
                                </button>
                            </div>

                            <div className="p-3 bg-zinc-50 border border-black/[0.05] rounded-xl text-xs text-zinc-600">
                                Como Administrador, você pode definir uma nova senha para este usuário caso ele tenha esquecido a credencial de acesso.
                            </div>

                            <div>
                                <label className="text-xs text-zinc-600 font-medium block mb-1">
                                    Nova Senha para o Colaborador *
                                </label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Mínimo 6 caracteres"
                                    value={novaSenhaAdmin}
                                    onChange={(e) => setNovaSenhaAdmin(e.target.value)}
                                    className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] focus:outline-none shadow-xs"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06]">
                                <button
                                    type="button"
                                    onClick={() => setModoAba("LISTA")}
                                    className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs active:scale-95 min-h-[40px]"
                                >
                                    <KeyRound className="w-4 h-4" />
                                    <span>Salvar Nova Senha</span>
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
