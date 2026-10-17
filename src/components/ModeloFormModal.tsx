"use client";

import React, { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { ModeloDocumento } from "@/types";
import {
    X,
    FileText,
    Save,
    Sparkles,
    Tag
} from "lucide-react";

interface ModeloFormModalProps {
    modeloParaEditar?: ModeloDocumento | null;
    isOpen: boolean;
    onClose: () => void;
}

const GRUPOS_TAGS = [
    {
        grupo: "Dados do Cliente",
        tags: [
            { tag: "{{cliente_nome}}", label: "Nome do Cliente" },
            { tag: "{{cliente_cpf_cnpj}}", label: "CPF/CNPJ" },
            { tag: "{{cliente_nacionalidade}}", label: "Nacionalidade" },
            { tag: "{{cliente_estado_civil}}", label: "Estado Civil" },
            { tag: "{{cliente_profissao}}", label: "Profissão" },
            { tag: "{{cliente_endereco}}", label: "Endereço Completo" },
            { tag: "{{cliente_cidade}}", label: "Cidade" },
            { tag: "{{cliente_uf}}", label: "UF" },
            { tag: "{{cliente_telefone}}", label: "Telefone/WhatsApp" },
        ],
    },
    {
        grupo: "Dados do Veículo",
        tags: [
            { tag: "{{veiculo_tipo}}", label: "Tipo do Bem" },
            { tag: "{{veiculo_marca}}", label: "Marca" },
            { tag: "{{veiculo_modelo}}", label: "Modelo" },
            { tag: "{{veiculo_versao}}", label: "Versão" },
            { tag: "{{veiculo_ano}}", label: "Ano Fab/Mod" },
            { tag: "{{veiculo_cor}}", label: "Cor" },
            { tag: "{{veiculo_placa}}", label: "Placa" },
            { tag: "{{veiculo_renavam}}", label: "RENAVAM" },
            { tag: "{{veiculo_chassi}}", label: "Chassi" },
            { tag: "{{veiculo_uso}}", label: "Quilometragem (KM)" },
        ],
    },
    {
        grupo: "Procurador / Outorgado",
        tags: [
            { tag: "{{outorgado_nome}}", label: "Nome / Razão Social" },
            { tag: "{{outorgado_cpf_cnpj}}", label: "CPF/CNPJ Outorgado" },
            { tag: "{{outorgado_estado_civil}}", label: "Estado Civil Outorgado" },
            { tag: "{{outorgado_profissao}}", label: "Profissão Outorgado" },
            { tag: "{{outorgado_endereco}}", label: "Endereço Outorgado" },
            { tag: "{{outorgado_cidade}}", label: "Cidade Outorgado" },
            { tag: "{{outorgado_uf}}", label: "UF Outorgado" },
            { tag: "{{outorgado_qualificacao}}", label: "Qualificação Completa" },
        ],
    },
    {
        grupo: "Valores & Datas",
        tags: [
            { tag: "{{valor_venda}}", label: "Valor (R$)" },
            { tag: "{{valor_venda_extenso}}", label: "Valor por Extenso" },
            { tag: "{{forma_pagamento}}", label: "Forma de Pagamento" },
            { tag: "{{data_atual}}", label: "Data Atual" },
            { tag: "{{cidade_data_extenso}}", label: "Cidade e Data por Extenso" },
        ],
    },
];

export function ModeloFormModal({ modeloParaEditar, isOpen, onClose }: ModeloFormModalProps) {
    const { addModelo, updateModelo } = useApp();

    const [titulo, setTitulo] = useState(modeloParaEditar?.titulo || "");
    const [conteudo, setConteudo] = useState(modeloParaEditar?.conteudo || "");
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Sincroniza titulo e conteudo sempre que abrir para edição ou novo modelo
    useEffect(() => {
        if (isOpen) {
            setTitulo(modeloParaEditar ? modeloParaEditar.titulo : "");
            setConteudo(modeloParaEditar ? modeloParaEditar.conteudo : "");
        }
    }, [isOpen, modeloParaEditar]);

    if (!isOpen) return null;

    const inserirTag = (tag: string) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const novoTexto = conteudo.substring(0, start) + tag + conteudo.substring(end);
        setConteudo(novoTexto);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 50);
    };

    const handleSalvar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo || !conteudo) return;

        if (modeloParaEditar) {
            updateModelo(modeloParaEditar.id, {
                titulo,
                conteudo,
            });
        } else {
            addModelo({
                titulo,
                conteudo,
                isPadrao: false,
            });
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/40 backdrop-blur-md overflow-y-auto">
            <div className="bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
                {/* Header Apple iOS */}
                <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/70 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                            <FileText className="w-5 h-5 font-bold" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-base sm:text-lg text-zinc-950 tracking-tight">
                                {modeloParaEditar ? "Editar Modelo de Documento" : "Novo Modelo de Documento"}
                            </h3>
                            <p className="text-xs text-zinc-500 font-normal">
                                Escreva o texto do contrato ou procuração e clique nas tags para inserção dinâmica no cursor.
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

                {/* Formulário */}
                <form onSubmit={handleSalvar} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-zinc-700 block mb-1">Título do Modelo de Documento *</label>
                        <input
                            type="text"
                            required
                            placeholder="Título do modelo"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            className="w-full bg-zinc-50 border border-black/[0.08] focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-zinc-900 font-semibold focus:outline-none transition-all"
                        />
                    </div>

                    {/* Tags Dinâmicas Organizadas por Categoria */}
                    <div className="bg-zinc-50/80 p-3.5 rounded-2xl border border-black/[0.06] space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Tags Dinâmicas Disponíveis:
                            </span>
                            <span className="text-[10px] text-zinc-400">Clique para inserir no texto</span>
                        </div>

                        <div className="space-y-2.5">
                            {GRUPOS_TAGS.map((g) => (
                                <div key={g.grupo}>
                                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                                        {g.grupo}:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {g.tags.map((item) => (
                                            <button
                                                key={item.tag}
                                                type="button"
                                                onClick={() => inserirTag(item.tag)}
                                                className="bg-white hover:bg-emerald-50 text-zinc-700 hover:text-emerald-700 border border-black/[0.08] hover:border-emerald-300 text-[11px] font-mono font-medium px-2 py-1 rounded-lg transition-all active:scale-95 shadow-2xs flex items-center gap-1"
                                                title={item.label}
                                            >
                                                <span>{item.tag}</span>
                                                <span className="text-zinc-400 font-sans text-[10px]">({item.label})</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Editor de Texto do Modelo */}
                    <div>
                        <label className="text-xs font-semibold text-zinc-700 block mb-1">
                            Conteúdo Jurídico do Documento (com as tags entre &#123;&#123; &#125;&#125;) *
                        </label>
                        <textarea
                            ref={textareaRef}
                            required
                            rows={14}
                            value={conteudo}
                            onChange={(e) => setConteudo(e.target.value)}
                            placeholder="Digite as cláusulas e use as tags acima para interpolação automática dos dados..."
                            className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-2xl p-4 text-xs font-mono text-zinc-900 leading-relaxed resize-none focus:outline-none transition-all shadow-inner"
                        />
                    </div>

                    {/* Rodapé */}
                    <div className="pt-3 border-t border-black/[0.06] flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-4 py-2 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs active:scale-95"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>Salvar Modelo</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
