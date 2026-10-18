"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { ModeloDocumento, DocumentoGerado } from "@/types";
import { formatDate, renderDocumentoFormatadoHtml, compartilharOuBaixarPdfDocumento, imprimirDocumento } from "@/lib/utils";
import {
    FileText,
    Plus,
    Printer,
    Edit3,
    Trash2,
    Sparkles,
    Calendar,
    FileCheck,
    Share2
} from "lucide-react";

interface DocumentosViewProps {
    onOpenNovoDocumento: (modeloId?: string) => void;
    onOpenNovoModelo?: () => void;
    onEditarModelo?: (modelo: ModeloDocumento) => void;
}

export function DocumentosView({
    onOpenNovoDocumento,
    onOpenNovoModelo,
    onEditarModelo,
}: DocumentosViewProps) {
    const { modelos, documentosGerados, deleteModelo, deleteDocumentoGerado } = useApp();

    const imprimirDocHistorico = (doc: DocumentoGerado) => {
        imprimirDocumento(doc.conteudoFinal, doc.titulo || "Documento");
    };

    return (
        <div className="space-y-5">
            {/* Header Apple iOS */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06]">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                        Documentos e Procurações
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        Emissão de procurações de transferência DETRAN, contratos de compra e venda e termos de responsabilidade.
                    </p>
                </div>

                {/* Ações de Emissão */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {onOpenNovoModelo && (
                        <button
                            onClick={onOpenNovoModelo}
                            className="flex items-center justify-center gap-1.5 bg-white hover:bg-zinc-50 text-zinc-800 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all border border-black/[0.08] shadow-2xs active:scale-95"
                        >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Novo Modelo</span>
                        </button>
                    )}

                    <button
                        onClick={() => onOpenNovoDocumento()}
                        className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Emitir Documento</span>
                    </button>
                </div>
            </div>

            {/* Modelos Pré-Configurados Disponíveis */}
            <div className="space-y-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                    Modelos Jurídicos Cadastrados ({modelos.length})
                </span>

                {modelos.length === 0 ? (
                    <div className="bg-white border border-black/[0.06] rounded-2xl p-8 text-center text-zinc-500 text-xs shadow-xs">
                        Nenhum modelo de documento cadastrado. Clique em &quot;Novo Modelo&quot; para criar seu primeiro modelo de procuração ou contrato.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {modelos.map((modelo) => (
                            <div
                                key={modelo.id}
                                className="bg-white border border-black/[0.06] rounded-2xl p-5 hover:border-black/[0.12] hover:shadow-md transition-all flex flex-col justify-between group shadow-xs"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <h4 className="font-semibold text-sm text-zinc-950 group-hover:text-emerald-600 transition-colors">
                                                {modelo.titulo}
                                            </h4>
                                        </div>

                                        {onEditarModelo && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() => onEditarModelo(modelo)}
                                                    title="Editar Modelo"
                                                    className="w-7 h-7 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600 hover:text-zinc-950 flex items-center justify-center transition-colors"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Tem certeza que deseja excluir o modelo "${modelo.titulo}"?`)) {
                                                            deleteModelo(modelo.id);
                                                        }
                                                    }}
                                                    title="Excluir Modelo"
                                                    className="w-7 h-7 rounded-xl bg-zinc-100 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-xs text-zinc-500 mt-2 line-clamp-3 leading-relaxed">
                                        {modelo.conteudo}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-black/[0.04] flex items-center justify-between">
                                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Atualizado em {formatDate(modelo.updatedAt)}
                                    </span>
                                    <button
                                        onClick={() => onOpenNovoDocumento(modelo.id)}
                                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
                                    >
                                        <span>Preencher</span>
                                        <span>&rarr;</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Histórico de Documentos Gerados */}
            <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/70">
                    <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                            Histórico de Documentos Emitidos
                        </h3>
                    </div>
                    <span className="text-xs text-zinc-500 font-semibold">{documentosGerados.length} emitido(s)</span>
                </div>

                {documentosGerados.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-xs">
                        Nenhum documento salvo no histórico ainda. Quando você emitir ou imprimir uma procuração ou contrato, ele será salvo aqui com cópia de segurança.
                    </div>
                ) : (
                    <div className="divide-y divide-black/[0.04]">
                        {documentosGerados.map((doc) => (
                            <div
                                key={doc.id}
                                className="p-4 flex items-center justify-between hover:bg-zinc-50/80 transition-colors text-xs"
                            >
                                <div>
                                    <strong className="text-zinc-950 font-semibold block">{doc.titulo}</strong>
                                    <span className="text-[11px] text-zinc-400">
                                        Emitido em {formatDate(doc.createdAt)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => imprimirDocHistorico(doc)}
                                        className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 px-3 py-1.5 rounded-xl font-medium transition-all shadow-2xs"
                                    >
                                        <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Imprimir</span>
                                    </button>

                                    <button
                                        onClick={() => compartilharOuBaixarPdfDocumento(doc.conteudoFinal, doc.titulo)}
                                        className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 px-3 py-1.5 rounded-xl font-semibold transition-all shadow-2xs"
                                    >
                                        <Share2 className="w-3.5 h-3.5" />
                                        <span>Encaminhar PDF</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (confirm(`Excluir o registro de "${doc.titulo}" do histórico?`)) {
                                                deleteDocumentoGerado(doc.id);
                                            }
                                        }}
                                        title="Excluir do Histórico"
                                        className="w-7 h-7 rounded-xl bg-zinc-100 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
