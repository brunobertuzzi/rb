"use client";

import React, { useState } from "react";
import {
    LayoutDashboard,
    Car,
    Users,
    BadgeDollarSign,
    MoreHorizontal,
    FileText,
    Database,
    X,
    TrendingUp,
    BarChart3,
    LogOut,
    BookOpen
} from "lucide-react";
import { TabType } from "./Header";
import { useAuth } from "@/context/AuthContext";

interface MobileNavProps {
    currentTab: TabType;
    setCurrentTab: (tab: TabType) => void;
    onOpenNovaVenda: () => void;
    onOpenBackup?: () => void;
    onOpenUsuarios?: () => void;
}

export function MobileNav({
    currentTab,
    setCurrentTab,
    onOpenNovaVenda,
    onOpenBackup,
    onOpenUsuarios,
}: MobileNavProps) {
    const { user, logout } = useAuth();
    const [menuAberto, setMenuAberto] = useState(false);

    const isMaisAtivo = ["vendas", "caderno", "relatorios"].includes(currentTab);

    const handleSelectTab = (tab: TabType) => {
        setCurrentTab(tab);
        setMenuAberto(false);
        if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    return (
        <>
            {/* iOS Modal Action Sheet / Drawer (Tema Claro Apple) */}
            {menuAberto && (
                <div className="fixed inset-0 z-60 flex flex-col justify-end md:hidden">
                    {/* Backdrop Suave Apple */}
                    <div
                        onClick={() => setMenuAberto(false)}
                        className="fixed inset-0 bg-black/35 backdrop-blur-xs transition-opacity"
                    />

                    {/* Sheet com Cantos Arredondados Nativos iOS e Grabber Bar */}
                    <div className="relative z-10 bg-white/95 backdrop-blur-2xl border-t border-black/[0.08] rounded-t-[28px] px-5 pt-2 pb-[max(env(safe-area-inset-bottom),24px)] shadow-2xl space-y-4 max-h-[82vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 text-zinc-900">
                        {/* iOS Grabber Handle */}
                        <div className="w-10 h-1 rounded-full bg-zinc-300 mx-auto mt-1 mb-2" />

                        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                    RB
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-zinc-950">Recursos e Operações</h3>
                                    <p className="text-[11px] text-zinc-500">Atalhos rápidos do sistema</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setMenuAberto(false)}
                                className="w-7 h-7 rounded-full bg-zinc-100 active:scale-95 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            {/* Vendas */}
                            <button
                                onClick={() => handleSelectTab("vendas")}
                                className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all active:scale-[0.98] ${currentTab === "vendas"
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                                    : "bg-zinc-50/80 border-black/[0.04] text-zinc-700 hover:bg-zinc-100"
                                    }`}
                            >
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                <div>
                                    <strong className="block text-xs font-semibold text-zinc-900">Vendas</strong>
                                    <span className="text-[10px] text-zinc-500">Histórico e faturamento</span>
                                </div>
                            </button>

                            {/* A Receber */}
                            <button
                                onClick={() => handleSelectTab("caderno")}
                                className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all active:scale-[0.98] ${currentTab === "caderno"
                                    ? "bg-amber-50 border-amber-300 text-amber-900 shadow-xs"
                                    : "bg-zinc-50/80 border-black/[0.04] text-zinc-700 hover:bg-zinc-100"
                                    }`}
                            >
                                <BookOpen className="w-4 h-4 text-amber-600" />
                                <div>
                                    <strong className="block text-xs font-semibold text-zinc-900">A Receber</strong>
                                    <span className="text-[10px] text-zinc-500">Parcelas e saldo devedor</span>
                                </div>
                            </button>

                            {/* Relatórios */}
                            {user?.role !== "VENDEDOR" && (
                                <button
                                    onClick={() => handleSelectTab("relatorios")}
                                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all active:scale-[0.98] ${currentTab === "relatorios"
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                                        : "bg-zinc-50/80 border-black/[0.04] text-zinc-700 hover:bg-zinc-100"
                                        }`}
                                >
                                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                                    <div>
                                        <strong className="block text-xs font-semibold text-zinc-900">Relatórios</strong>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Ação de Backup (Restrito a Admin) */}
                        {user?.role === "ADMIN" && onOpenBackup && (
                            <button
                                onClick={() => {
                                    setMenuAberto(false);
                                    onOpenBackup();
                                }}
                                className="w-full flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-black/[0.04] active:scale-[0.98] text-zinc-800 transition-all text-left"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Database className="w-4 h-4 text-amber-600" />
                                    <div>
                                        <strong className="text-xs font-semibold block text-zinc-900">Backup do Sistema</strong>
                                        <span className="text-[10px] text-zinc-500">Exportar ou restaurar dados</span>
                                    </div>
                                </div>
                                <span className="text-xs text-amber-600 font-semibold">&rarr;</span>
                            </button>
                        )}

                        {/* Usuários & Acessos (Admin) */}
                        {user?.role === "ADMIN" && onOpenUsuarios && (
                            <button
                                onClick={() => {
                                    setMenuAberto(false);
                                    onOpenUsuarios();
                                }}
                                className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 active:scale-[0.98] text-zinc-800 transition-all text-left"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Users className="w-4 h-4 text-emerald-600" />
                                    <div>
                                        <strong className="text-xs font-semibold block text-emerald-950">Gerenciar Usuários</strong>
                                        <span className="text-[10px] text-emerald-700/80">Acessos corporativos</span>
                                    </div>
                                </div>
                                <span className="text-xs text-emerald-700 font-semibold">&rarr;</span>
                            </button>
                        )}

                        {/* Perfil & Logout */}
                        {user && (
                            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                        {user.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <strong className="text-xs font-semibold block text-zinc-900">{user.nome}</strong>
                                        <span className="text-[10px] text-zinc-500">{user.cargo}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setMenuAberto(false);
                                        logout();
                                    }}
                                    className="flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold active:scale-95 transition-all"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>Sair</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Barra de Navegação Nativa Apple iOS TabBar (Tema Claro) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
                <nav className="bg-white/85 backdrop-blur-2xl border-t border-black/[0.08] px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),10px)] flex items-center justify-around shadow-lg">
                    {/* 1. Início */}
                    <button
                        type="button"
                        onClick={() => {
                            setCurrentTab("dashboard");
                            if (typeof window !== "undefined") {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                        }}
                        className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all active:scale-90 ${currentTab === "dashboard" ? "text-emerald-600 font-semibold" : "text-zinc-400"
                            }`}
                    >
                        <LayoutDashboard className="w-5 h-5 mb-0.5" strokeWidth={currentTab === "dashboard" ? 2.3 : 1.8} />
                        <span className="text-[10px] tracking-tight">Início</span>
                    </button>

                    {/* 2. Estoque */}
                    <button
                        type="button"
                        onClick={() => {
                            setCurrentTab("estoque");
                            if (typeof window !== "undefined") {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                        }}
                        className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all active:scale-90 ${currentTab === "estoque" ? "text-emerald-600 font-semibold" : "text-zinc-400"
                            }`}
                    >
                        <Car className="w-5 h-5 mb-0.5" strokeWidth={currentTab === "estoque" ? 2.3 : 1.8} />
                        <span className="text-[10px] tracking-tight">Estoque</span>
                    </button>

                    {/* 3. Documentos */}
                    <button
                        type="button"
                        onClick={() => {
                            setCurrentTab("documentos");
                            if (typeof window !== "undefined") {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                        }}
                        className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all active:scale-90 ${currentTab === "documentos" ? "text-emerald-600 font-semibold" : "text-zinc-400"
                            }`}
                    >
                        <FileText className="w-5 h-5 mb-0.5" strokeWidth={currentTab === "documentos" ? 2.3 : 1.8} />
                        <span className="text-[10px] tracking-tight">Documentos</span>
                    </button>

                    {/* 4. Clientes */}
                    <button
                        type="button"
                        onClick={() => {
                            setCurrentTab("clientes");
                            if (typeof window !== "undefined") {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                        }}
                        className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all active:scale-90 ${currentTab === "clientes" ? "text-emerald-600 font-semibold" : "text-zinc-400"
                            }`}
                    >
                        <Users className="w-5 h-5 mb-0.5" strokeWidth={currentTab === "clientes" ? 2.3 : 1.8} />
                        <span className="text-[10px] tracking-tight">Clientes</span>
                    </button>

                    {/* 5. Menu Mais */}
                    <button
                        type="button"
                        onClick={() => setMenuAberto(!menuAberto)}
                        className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all active:scale-90 relative ${isMaisAtivo || menuAberto ? "text-emerald-600 font-semibold" : "text-zinc-400"
                            }`}
                    >
                        <MoreHorizontal className="w-5 h-5 mb-0.5" strokeWidth={isMaisAtivo || menuAberto ? 2.3 : 1.8} />
                        <span className="text-[10px] tracking-tight">Mais</span>
                        {isMaisAtivo && (
                            <span className="absolute top-1 right-2.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                    </button>
                </nav>
            </div>
        </>
    );
}
