"use client";

import React, { useState } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AuthPage } from "@/components/AuthPage";
import { Header, TabType } from "@/components/Header";
import { DashboardView } from "@/components/DashboardView";
import { EstoqueView } from "@/components/EstoqueView";
import { ClientesView } from "@/components/ClientesView";
import { VendasView } from "@/components/VendasView";
import { CadernoView } from "@/components/CadernoView";
import { DocumentosView } from "@/components/DocumentosView";
import { RelatoriosView } from "@/components/RelatoriosView";
import { VeiculoFormModal } from "@/components/VeiculoFormModal";
import { VendaModal } from "@/components/VendaModal";
import { DocumentoModal } from "@/components/DocumentoModal";
import { DespesasModal } from "@/components/DespesasModal";
import { VeiculoDetalhesModal } from "@/components/VeiculoDetalhesModal";
import { ModeloFormModal } from "@/components/ModeloFormModal";
import { BackupModal } from "@/components/BackupModal";
import { UsuariosModal } from "@/components/UsuariosModal";
import { MobileNav } from "@/components/MobileNav";
import { Veiculo, ModeloDocumento } from "@/types";

function AuthenticatedApp() {
    const { user } = useAuth();
    const { veiculos } = useApp();
    const [currentTab, setCurrentTab] = useState<TabType>("dashboard");
    const [clienteFiltroCadernoId, setClienteFiltroCadernoId] = useState<string | null>(null);

    // Modais globais
    const [modalUsuariosAberto, setModalUsuariosAberto] = useState(false);
    const [modalVeiculoAberto, setModalVeiculoAberto] = useState(false);
    const [veiculoParaEditar, setVeiculoParaEditar] = useState<Veiculo | null>(null);

    const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
    const [veiculoParaDetalhes, setVeiculoParaDetalhes] = useState<Veiculo | null>(null);

    const [modalVendaAberto, setModalVendaAberto] = useState(false);
    const [veiculoParaVenda, setVeiculoParaVenda] = useState<Veiculo | null>(null);

    const [modalDocumentosAberto, setModalDocumentosAberto] = useState(false);
    const [veiculoParaDocumento, setVeiculoParaDocumento] = useState<Veiculo | null>(null);
    const [modeloParaDocumentoId, setModeloParaDocumentoId] = useState<string | undefined>(undefined);

    const [modalDespesasAberto, setModalDespesasAberto] = useState(false);
    const [veiculoParaDespesas, setVeiculoParaDespesas] = useState<Veiculo | null>(null);

    const [modalModeloAberto, setModalModeloAberto] = useState(false);
    const [modeloParaEditar, setModeloParaEditar] = useState<ModeloDocumento | null>(null);

    const [modalBackupAberto, setModalBackupAberto] = useState(false);

    // Abertura de Modais
    const handleNovoVeiculo = () => {
        setVeiculoParaEditar(null);
        setModalVeiculoAberto(true);
    };

    const handleEditarVeiculo = (veiculo: Veiculo) => {
        setVeiculoParaEditar(veiculo);
        setModalVeiculoAberto(true);
    };

    const handleVerDetalhes = (veiculo: Veiculo) => {
        setVeiculoParaDetalhes(veiculo);
        setModalDetalhesAberto(true);
    };

    const handleAbrirVenda = (veiculo?: Veiculo) => {
        setVeiculoParaVenda(veiculo || null);
        setModalVendaAberto(true);
    };

    const handleAbrirDocumentos = (veiculo?: Veiculo, modeloId?: string) => {
        setVeiculoParaDocumento(veiculo || null);
        setModeloParaDocumentoId(modeloId);
        setModalDocumentosAberto(true);
    };

    const handleAbrirDespesas = (veiculo: Veiculo) => {
        setVeiculoParaDespesas(veiculo);
        setModalDespesasAberto(true);
    };

    const handleNovoModelo = () => {
        setModeloParaEditar(null);
        setModalModeloAberto(true);
    };

    const handleEditarModelo = (modelo: ModeloDocumento) => {
        setModeloParaEditar(modelo);
        setModalModeloAberto(true);
    };

    const handleAbrirBackup = () => {
        setModalBackupAberto(true);
    };

    const handleAbrirCadernoCliente = (clienteId: string) => {
        setClienteFiltroCadernoId(clienteId);
        setCurrentTab("caderno");
    };

    return (
        <div className="min-h-screen bg-[#f2f2f7] text-zinc-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
            {/* Header Fixo */}
            <Header
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
                onOpenNovoVeiculo={handleNovoVeiculo}
                onOpenNovaVenda={() => handleAbrirVenda()}
                onOpenBackup={handleAbrirBackup}
                onOpenUsuarios={() => setModalUsuariosAberto(true)}
            />

            {/* Conteúdo Principal com padding inferior extra para a barra iOS TabBar */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-8">
                {currentTab === "dashboard" && (
                    <DashboardView
                        onOpenNovoVeiculo={handleNovoVeiculo}
                        onOpenVenda={handleAbrirVenda}
                        onOpenDocumentos={handleAbrirDocumentos}
                        onOpenDespesas={handleAbrirDespesas}
                        onNavigateToEstoque={() => setCurrentTab("estoque")}
                        onVerDetalhes={handleVerDetalhes}
                    />
                )}

                {currentTab === "estoque" && (
                    <EstoqueView
                        onOpenNovoVeiculo={handleNovoVeiculo}
                        onEditarVeiculo={handleEditarVeiculo}
                        onOpenVenda={handleAbrirVenda}
                        onOpenDocumentos={handleAbrirDocumentos}
                        onOpenDespesas={handleAbrirDespesas}
                        onVerDetalhes={handleVerDetalhes}
                    />
                )}

                {currentTab === "clientes" && (
                    <ClientesView onOpenCadernoCliente={handleAbrirCadernoCliente} />
                )}

                {currentTab === "vendas" && (
                    <VendasView
                        onOpenNovaVenda={() => handleAbrirVenda()}
                        onOpenDocumentos={handleAbrirDocumentos}
                    />
                )}

                {currentTab === "caderno" && (
                    <CadernoView
                        clienteFiltroInicialId={clienteFiltroCadernoId}
                        onClearClienteFiltro={() => setClienteFiltroCadernoId(null)}
                    />
                )}

                {currentTab === "documentos" && (
                    <DocumentosView
                        onOpenNovoDocumento={(modeloId) => handleAbrirDocumentos(undefined, modeloId)}
                        onOpenNovoModelo={handleNovoModelo}
                        onEditarModelo={handleEditarModelo}
                    />
                )}


                {currentTab === "relatorios" && user?.role !== "VENDEDOR" && <RelatoriosView />}
            </main>

            {/* Navegação Nativa de Celular Fixa no Rodapé */}
            <MobileNav
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
                onOpenNovaVenda={() => handleAbrirVenda()}
                onOpenBackup={handleAbrirBackup}
                onOpenUsuarios={() => setModalUsuariosAberto(true)}
            />

            {/* Modais Globais do Sistema */}
            <VeiculoFormModal
                isOpen={modalVeiculoAberto}
                veiculoParaEditar={veiculoParaEditar}
                onClose={() => setModalVeiculoAberto(false)}
            />

            <VeiculoDetalhesModal
                isOpen={modalDetalhesAberto}
                veiculo={veiculos.find((v) => v.id === veiculoParaDetalhes?.id) || veiculoParaDetalhes}
                onClose={() => setModalDetalhesAberto(false)}
                onOpenVenda={handleAbrirVenda}
                onOpenDocumentos={handleAbrirDocumentos}
                onOpenDespesas={handleAbrirDespesas}
                onEditar={handleEditarVeiculo}
            />

            <VendaModal
                isOpen={modalVendaAberto}
                veiculoInicial={veiculos.find((v) => v.id === veiculoParaVenda?.id) || veiculoParaVenda}
                onClose={() => setModalVendaAberto(false)}
            />

            <DocumentoModal
                isOpen={modalDocumentosAberto}
                veiculoInicial={veiculos.find((v) => v.id === veiculoParaDocumento?.id) || veiculoParaDocumento}
                modeloInicialId={modeloParaDocumentoId}
                onEditarModelo={handleEditarModelo}
                onClose={() => setModalDocumentosAberto(false)}
            />

            <DespesasModal
                isOpen={modalDespesasAberto}
                veiculo={veiculos.find((v) => v.id === veiculoParaDespesas?.id) || veiculoParaDespesas}
                onClose={() => setModalDespesasAberto(false)}
            />

            <ModeloFormModal
                isOpen={modalModeloAberto}
                modeloParaEditar={modeloParaEditar}
                onClose={() => setModalModeloAberto(false)}
            />

            <BackupModal
                isOpen={modalBackupAberto}
                onClose={() => setModalBackupAberto(false)}
            />

            <UsuariosModal
                isOpen={modalUsuariosAberto}
                onClose={() => setModalUsuariosAberto(false)}
            />
        </div>
    );
}

function MainApp() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#f2f2f7] flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white animate-pulse font-extrabold text-lg shadow-lg shadow-emerald-600/20">
                    RB
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AuthPage />;
    }

    return <AuthenticatedApp />;
}

export default function Page() {
    return (
        <AuthProvider>
            <AppProvider>
                <MainApp />
            </AppProvider>
        </AuthProvider>
    );
}
