"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Cliente, TipoPessoa } from "@/types";
import { formatCpfCnpj, formatPhone, formatCurrency } from "@/lib/utils";
import { calcularResumoCadernoVenda } from "./CadernoView";
import {
    Users,
    Search,
    Plus,
    Edit3,
    Trash2,
    X,
    Save,
    User,
    Building2,
    BookOpen
} from "lucide-react";

interface ClientesViewProps {
    onOpenCadernoCliente?: (clienteId: string) => void;
}

export function ClientesView({ onOpenCadernoCliente }: ClientesViewProps) {
    const { clientes, vendas, addCliente, updateCliente, deleteCliente } = useApp();

    const [busca, setBusca] = useState("");
    const [modalAberto, setModalAberto] = useState(false);
    const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);

    // Campos do formulário enxuto
    const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("FISICA");
    const [nome, setNome] = useState("");
    const [cpfCnpj, setCpfCnpj] = useState("");
    const [telefone, setTelefone] = useState("");
    const [cidade, setCidade] = useState("");
    const [estadoUf, setEstadoUf] = useState("");
    const [estadoCivil, setEstadoCivil] = useState("Casado(a)");
    const [profissao, setProfissao] = useState("");
    const [endereco, setEndereco] = useState("");
    const [observacoes, setObservacoes] = useState("");

    const clientesFiltrados = clientes.filter((c) => {
        const termo = busca.toLowerCase();
        return (
            (c.nome || "").toLowerCase().includes(termo) ||
            (c.cpfCnpj || "").toLowerCase().includes(termo) ||
            (c.telefone || "").toLowerCase().includes(termo) ||
            (c.cidade || "").toLowerCase().includes(termo)
        );
    });

    const handleAbrirModal = (cliente?: Cliente) => {
        if (cliente) {
            setClienteParaEditar(cliente);
            setTipoPessoa(cliente.tipoPessoa);
            setNome(cliente.nome);
            setCpfCnpj(cliente.cpfCnpj);
            setTelefone(cliente.telefone);
            setCidade(cliente.cidade || "");
            setEstadoUf(cliente.estadoUf || "");
            setEstadoCivil(cliente.estadoCivil || "Casado(a)");
            setProfissao(cliente.profissao || "");
            setEndereco(cliente.endereco || "");
            setObservacoes(cliente.observacoes || "");
        } else {
            setClienteParaEditar(null);
            setTipoPessoa("FISICA");
            setNome("");
            setCpfCnpj("");
            setTelefone("");
            setCidade("");
            setEstadoUf("");
            setEstadoCivil("Casado(a)");
            setProfissao("");
            setEndereco("");
            setObservacoes("");
        }
        setModalAberto(true);
    };

    const handleSalvar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim() || !cpfCnpj.trim() || !telefone.trim()) {
            alert("Por favor, preencha todos os campos obrigatórios (Nome, CPF/CNPJ e Telefone).");
            return;
        }

        const docLimpo = cpfCnpj.replace(/\D/g, "");
        if (docLimpo.length > 0) {
            const duplicado = clientes.find(
                (c) => c.id !== clienteParaEditar?.id && (c.cpfCnpj || "").replace(/\D/g, "") === docLimpo
            );
            if (duplicado) {
                alert(`Já existe um cliente cadastrado com este CPF/CNPJ (${duplicado.nome}).`);
                return;
            }
        }

        if (clienteParaEditar) {
            updateCliente(clienteParaEditar.id, {
                tipoPessoa,
                nome: nome.trim(),
                cpfCnpj: cpfCnpj.trim(),
                telefone: telefone.trim(),
                cidade: cidade.trim(),
                estadoUf: estadoUf.trim().toUpperCase(),
                estadoCivil,
                profissao: profissao.trim(),
                endereco: endereco.trim(),
                observacoes: observacoes.trim(),
            });
        } else {
            addCliente({
                tipoPessoa,
                nome: nome.trim(),
                cpfCnpj: cpfCnpj.trim(),
                telefone: telefone.trim(),
                cidade: cidade.trim(),
                estadoUf: estadoUf.trim().toUpperCase(),
                estadoCivil,
                profissao: profissao.trim(),
                endereco: endereco.trim(),
                observacoes: observacoes.trim(),
            });
        }

        setModalAberto(false);
    };

    return (
        <div className="space-y-4">
            {/* Header Clean Apple iOS */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                            Clientes
                        </h2>
                        <span className="text-xs text-zinc-500 font-medium">
                            ({clientesFiltrados.length})
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => handleAbrirModal()}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Cliente</span>
                </button>
            </div>

            {/* Busca Clean Apple iOS */}
            <div className="bg-white border border-black/[0.06] rounded-2xl p-2.5 flex items-center justify-between gap-3 shadow-xs">
                <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, CPF/CNPJ ou cidade..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full bg-zinc-100/80 focus:bg-white border border-transparent focus:border-emerald-500/50 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none transition-colors"
                    />
                </div>

                <span className="text-xs text-zinc-400 hidden sm:block">
                    {clientesFiltrados.length} contato(s) registrado(s)
                </span>
            </div>

            {/* Grid de Clientes Clean Apple iOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientesFiltrados.map((cliente) => {
                    const vendasDoCliente = vendas.filter((v) => v.clienteId === cliente.id);
                    const saldoDevedorTotal = vendasDoCliente.reduce((acc, v) => {
                        const res = calcularResumoCadernoVenda(v);
                        return acc + (res.temCaderno ? res.saldoRestante : 0);
                    }, 0);
                    const temHistoricoCaderno = vendasDoCliente.some((v) => calcularResumoCadernoVenda(v).temCaderno);

                    return (
                        <div
                            key={cliente.id}
                            className={`bg-white border rounded-2xl p-4.5 hover:shadow-md transition-all flex flex-col justify-between group shadow-xs ${
                                saldoDevedorTotal > 0.01
                                    ? "border-amber-200/90 hover:border-amber-300"
                                    : "border-black/[0.06] hover:border-zinc-300"
                            }`}
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                                            {cliente.tipoPessoa === "JURIDICA" ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-sm text-zinc-950 truncate">{cliente.nome}</h4>
                                            <span className="text-[11px] text-zinc-500 font-mono">
                                                {formatCpfCnpj(cliente.cpfCnpj)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => handleAbrirModal(cliente)}
                                            title="Editar"
                                            className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Excluir cliente ${cliente.nome}?`)) {
                                                    deleteCliente(cliente.id);
                                                }
                                            }}
                                            title="Excluir"
                                            className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {saldoDevedorTotal > 0.01 && (
                                    <div className="mb-2.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs">
                                        <span className="text-amber-900 font-semibold flex items-center gap-1.5">
                                            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                            Saldo a Receber:
                                        </span>
                                        <strong className="text-amber-700 font-extrabold">
                                            {formatCurrency(saldoDevedorTotal)}
                                        </strong>
                                    </div>
                                )}

                                <div className="mt-3 space-y-1.5 text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                                    {cliente.telefone && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-zinc-400 text-[11px]">Telefone:</span>
                                            <span className="text-zinc-800 font-medium">{formatPhone(cliente.telefone)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <span className="text-zinc-400 text-[11px]">Cidade/UF:</span>
                                        <span className="text-zinc-800 font-medium">
                                            {[cliente.cidade, cliente.estadoUf].filter(Boolean).join(" - ") || "Não informado"}
                                        </span>
                                    </div>
                                    {cliente.profissao && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-zinc-400 text-[11px]">Ocupação:</span>
                                            <span className="text-zinc-700">{cliente.profissao}</span>
                                        </div>
                                    )}
                                    {cliente.endereco && (
                                        <div className="flex flex-col pt-1 border-t border-zinc-200/60">
                                            <span className="text-zinc-400 text-[10px]">Endereço:</span>
                                            <span className="text-zinc-700 text-[11px] truncate">{cliente.endereco}</span>
                                        </div>
                                    )}
                                </div>

                                {temHistoricoCaderno && onOpenCadernoCliente && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenCadernoCliente(cliente.id)}
                                        className="mt-3 w-full flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs py-2 px-3 rounded-xl transition-all"
                                    >
                                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Ver Conta a Receber</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Cadastro / Edição Apple iOS */}
            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white border border-black/[0.08] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 text-zinc-900">
                        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600" />
                                <h3 className="font-semibold text-sm text-zinc-950">
                                    {clienteParaEditar ? "Editar Cliente" : "Novo Cliente Rápido"}
                                </h3>
                            </div>
                            <button
                                onClick={() => setModalAberto(false)}
                                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <form onSubmit={handleSalvar} className="p-5 space-y-3.5">
                            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setTipoPessoa("FISICA")}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tipoPessoa === "FISICA" ? "bg-white text-zinc-950 font-semibold shadow-xs" : "text-zinc-600 hover:text-zinc-950"
                                        }`}
                                >
                                    Pessoa Física
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTipoPessoa("JURIDICA")}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tipoPessoa === "JURIDICA" ? "bg-white text-zinc-950 font-semibold shadow-xs" : "text-zinc-600 hover:text-zinc-950"
                                        }`}
                                >
                                    Pessoa Jurídica (Empresa / CNPJ)
                                </button>
                            </div>

                            <div>
                                <label className="text-xs text-zinc-600 font-medium block mb-1">
                                    {tipoPessoa === "FISICA" ? "Nome Completo *" : "Razão Social *"}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder={tipoPessoa === "FISICA" ? "Nome completo do cliente" : "Razão Social ou Nome Fantasia"}
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-emerald-500 min-h-[40px]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-zinc-600 font-medium block mb-1">
                                        {tipoPessoa === "FISICA" ? "CPF *" : "CNPJ *"}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder={tipoPessoa === "FISICA" ? "000.000.000-00" : "00.000.000/0001-00"}
                                        value={cpfCnpj}
                                        onChange={(e) => setCpfCnpj(e.target.value)}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono focus:bg-white focus:outline-none focus:border-emerald-500 min-h-[40px]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-600 font-medium block mb-1">Telefone / WhatsApp *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="(00) 00000-0000"
                                        value={telefone}
                                        onChange={(e) => setTelefone(e.target.value)}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500 min-h-[40px]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs text-zinc-600 font-medium block mb-1">Cidade</label>
                                    <input
                                        type="text"
                                        placeholder="Cidade"
                                        value={cidade}
                                        onChange={(e) => setCidade(e.target.value)}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500 min-h-[40px]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-600 font-medium block mb-1">UF</label>
                                    <input
                                        type="text"
                                        placeholder="UF"
                                        value={estadoUf}
                                        maxLength={2}
                                        onChange={(e) => setEstadoUf(e.target.value.toUpperCase())}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 uppercase text-center font-bold focus:bg-white focus:outline-none focus:border-emerald-500 min-h-[40px]"
                                    />
                                </div>
                            </div>

                            {/* Campos adicionais para documentos */}
                            <div className="pt-2 border-t border-zinc-100 space-y-3">
                                <div>
                                    <label className="text-[11px] text-zinc-500 block mb-1">Profissão</label>
                                    <input
                                        type="text"
                                        placeholder="Profissão ou ocupação"
                                        value={profissao}
                                        onChange={(e) => setProfissao(e.target.value)}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500 min-h-[38px]"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] text-zinc-500 block mb-1">Endereço Completo</label>
                                    <input
                                        type="text"
                                        placeholder="Logradouro, número, bairro"
                                        value={endereco}
                                        onChange={(e) => setEndereco(e.target.value)}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500 min-h-[38px]"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setModalAberto(false)}
                                    className="text-xs text-zinc-600 hover:text-zinc-900 px-3 py-2 rounded-xl transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-xs active:scale-95"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Salvar Cliente</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
