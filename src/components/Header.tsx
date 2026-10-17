"use client";

import React, { useState } from "react";
import {
    LayoutDashboard,
    Car,
    Users,
    BadgeDollarSign,
    FileText,
    Plus,
    Database,
    BarChart3,
    LogOut,
    ChevronDown,
    BookOpen,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { calcularResumoCadernoVenda } from "./CadernoView";

export type TabType =
    | "dashboard"
    | "estoque"
    | "clientes"
    | "vendas"
    | "caderno"
    | "relatorios"
    | "documentos";

interface HeaderProps {
    currentTab: TabType;
    setCurrentTab: (tab: TabType) => void;
    onOpenNovoVeiculo: () => void;
    onOpenNovaVenda: () => void;
    onOpenBackup?: () => void;
    onOpenUsuarios?: () => void;
}

export function Header({
    currentTab,
    setCurrentTab,
    onOpenNovoVeiculo,
    onOpenNovaVenda,
    onOpenBackup,
    onOpenUsuarios,
}: HeaderProps) {
    const { veiculos, vendas } = useApp();
    const { user, logout } = useAuth();
    const [menuUsuarioAberto, setMenuUsuarioAberto] = useState(false);

    const veiculosDisponiveis = veiculos.filter((v) => v.status === "DISPONIVEL");
    const cadernosEmAberto = vendas.filter((v) => {
        const res = calcularResumoCadernoVenda(v);
        return res.temCaderno && !res.quitado;
    }).length;

    // Abas principais Apple iOS
    const primaryNavItems: { id: TabType; label: string; icon: React.ElementType; badge?: number }[] = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "estoque", label: "Estoque", icon: Car, badge: veiculosDisponiveis.length },
        { id: "vendas", label: "Vendas", icon: BadgeDollarSign },
        { id: "caderno", label: "A Receber", icon: BookOpen, badge: cadernosEmAberto > 0 ? cadernosEmAberto : undefined },
        { id: "clientes", label: "Clientes", icon: Users },
        { id: "documentos", label: "Documentos", icon: FileText },
        ...(user?.role !== "VENDEDOR" ? [{ id: "relatorios" as TabType, label: "Relatórios", icon: BarChart3 }] : []),
    ];

    const getRoleBadge = (role?: string) => {
        switch (role) {
            case "ADMIN":
                return { label: "Admin", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
            case "GERENTE":
                return { label: "Gerente", bg: "bg-amber-50 text-amber-700 border-amber-200" };
            default:
                return { label: "Vendas", bg: "bg-blue-50 text-blue-700 border-blue-200" };
        }
    };

    const roleInfo = getRoleBadge(user?.role);

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-black/[0.06] text-zinc-900 shadow-2xs">
            {/* Top Bar Limpo estilo Apple */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
                {/* Brand */}
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center font-bold text-sm text-white shadow-xs shrink-0">
                        RB
                    </div>
                    <div>
                        <span className="font-bold text-base tracking-tight text-zinc-950 block leading-tight">
                            RB Agronegócios
                        </span>
                    </div>
                </div>

                {/* Navegação Principal Limpa Apple iOS (Desktop) */}
                <nav className="hidden md:flex items-center gap-1 bg-zinc-100/80 p-1 rounded-2xl border border-black/[0.04]">
                    {primaryNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentTab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setCurrentTab(item.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                    isActive
                                        ? "bg-white text-zinc-950 font-semibold shadow-xs border border-black/[0.04]"
                                        : "text-zinc-600 hover:text-zinc-950 hover:bg-white/60"
                                }`}
                            >
                                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-600" : "text-zinc-500"}`} strokeWidth={isActive ? 2.2 : 1.8} />
                                <span>{item.label}</span>
                                {item.badge !== undefined && (
                                    <span className="text-[10px] font-semibold bg-zinc-200/70 text-zinc-700 px-1.5 py-0.2 rounded-full">
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Perfil do Usuário (somente Desktop; no celular fica em "Mais") */}
                <div className="flex items-center gap-2">
                    {user && (
                        <div className="hidden md:block relative ml-0.5">
                            <button
                                onClick={() => setMenuUsuarioAberto(!menuUsuarioAberto)}
                                className="flex items-center gap-1.5 bg-white hover:bg-zinc-50 border border-zinc-200/90 p-1.5 rounded-xl transition-all text-xs shadow-2xs"
                                title={user.nome}
                            >
                                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[11px]">
                                    {user.nome.charAt(0).toUpperCase()}
                                </div>
                                <span className="hidden lg:block font-medium text-zinc-800 text-xs max-w-[80px] truncate">
                                    {user.nome.split(" ")[0]}
                                </span>
                                <ChevronDown className="w-3 h-3 text-zinc-400" />
                            </button>

                            {/* Dropdown do Usuário */}
                            {menuUsuarioAberto && (
                                <div 
                                    className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-2xl border border-black/[0.08] rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                                    onMouseLeave={() => setMenuUsuarioAberto(false)}
                                >
                                    <div className="pb-2 mb-2 border-b border-zinc-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                                {user.nome.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-semibold text-xs text-zinc-900 truncate">{user.nome}</h4>
                                                <span className={`text-[9px] px-1.5 py-0.2 rounded-md border font-medium inline-block mt-0.5 ${roleInfo.bg}`}>
                                                    {roleInfo.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        {user.role === "ADMIN" && onOpenUsuarios && (
                                            <button
                                                onClick={() => {
                                                    setMenuUsuarioAberto(false);
                                                    onOpenUsuarios();
                                                }}
                                                className="w-full flex items-center gap-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 px-2 py-1.5 rounded-lg transition-all"
                                            >
                                                <Users className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>Gerenciar Usuários</span>
                                            </button>
                                        )}

                                        {user.role === "ADMIN" && onOpenBackup && (
                                            <button
                                                onClick={() => {
                                                    setMenuUsuarioAberto(false);
                                                    onOpenBackup();
                                                }}
                                                className="w-full flex items-center gap-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 px-2 py-1.5 rounded-lg transition-all"
                                            >
                                                <Database className="w-3.5 h-3.5 text-blue-600" />
                                                <span>Backup & Restauração</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => {
                                                setMenuUsuarioAberto(false);
                                                logout();
                                            }}
                                            className="w-full flex items-center gap-2 text-xs font-medium text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition-all"
                                        >
                                            <LogOut className="w-3.5 h-3.5" />
                                            <span>Sair</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
