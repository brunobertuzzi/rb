"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Veiculo, Cliente, ModeloDocumento } from "@/types";
import { formatCurrency, formatUsage, formatDate, valorPorExtenso, renderDocumentoFormatadoHtml, compartilharOuBaixarPdfDocumento, imprimirDocumento } from "@/lib/utils";
import {
    X,
    FileText,
    Printer,
    Check,
    Sparkles,
    Edit3,
    UserCheck,
    Car,
    AlertTriangle,
    Save,
    Lock,
    Share2
} from "lucide-react";

interface DocumentoModalProps {
    veiculoInicial?: Veiculo | null;
    modeloInicialId?: string;
    onEditarModelo?: (modelo: ModeloDocumento) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function DocumentoModal({ veiculoInicial, modeloInicialId, onEditarModelo, isOpen, onClose }: DocumentoModalProps) {
    const { veiculos, clientes, vendas, modelos, salvarDocumentoGerado, updateCliente } = useApp();

    const [modeloSelecionadoId, setModeloSelecionadoId] = useState<string>("");
    const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string>("");
    const [veiculoSelecionadoId, setVeiculoSelecionadoId] = useState<string>("");
    const [outorgadoSelecionadoId, setOutorgadoSelecionadoId] = useState<string>("");
    const [formaPagamento, setFormaPagamento] = useState<string>("À vista, através de transferência bancária / PIX");
    const [conteudoEditavel, setConteudoEditavel] = useState<string>("");
    const [savedSuccess, setSavedSuccess] = useState(false);

    // Gaveta de "Completar Cadastro Rápido"
    const [drawerCompletarAberto, setDrawerCompletarAberto] = useState(false);
    const [formCompletar, setFormCompletar] = useState({
        estadoCivil: "Casado(a)",
        profissao: "",
        endereco: "",
        cidade: "",
        estadoUf: "",
        telefone: "",
    });

    // Inicializa seleções padrão
    useEffect(() => {
        if (isOpen) {
            if (modeloInicialId) {
                setModeloSelecionadoId(modeloInicialId);
            } else if (modelos.length > 0 && !modeloSelecionadoId) {
                setModeloSelecionadoId(modelos[0].id);
            }

            const targetVeiculoId = veiculoInicial?.id || veiculoSelecionadoId || veiculos[0]?.id || "";
            if (targetVeiculoId && targetVeiculoId !== veiculoSelecionadoId) {
                setVeiculoSelecionadoId(targetVeiculoId);
            }

            const vendaDoVeiculo = vendas.find((vd) => vd.veiculoId === targetVeiculoId);
            let defaultOutorganteId = clienteSelecionadoId;
            if (vendaDoVeiculo) {
                defaultOutorganteId = vendaDoVeiculo.clienteId;
                setClienteSelecionadoId(vendaDoVeiculo.clienteId);
            } else if (clientes.length > 0 && !clienteSelecionadoId) {
                defaultOutorganteId = clientes[0].id;
                setClienteSelecionadoId(clientes[0].id);
            }

            const outorgadoValido = clientes.some((c) => c.id === outorgadoSelecionadoId);
            if (!outorgadoSelecionadoId || !outorgadoValido) {
                if (clientes.length > 0) {
                    const outro = clientes.find((c) => c.id !== defaultOutorganteId);
                    setOutorgadoSelecionadoId(outro ? outro.id : clientes[0].id);
                } else {
                    setOutorgadoSelecionadoId("");
                }
            }
        }
    }, [isOpen, modeloInicialId, veiculoInicial, modelos, veiculos, clientes, vendas]);

    const vendaAssociada = useMemo(
        () => vendas.find((vd) => vd.veiculoId === veiculoSelecionadoId),
        [vendas, veiculoSelecionadoId]
    );

    // Sincroniza comprador e descrição da forma de pagamento quando o veículo selecionado possui venda registrada
    useEffect(() => {
        if (!isOpen || !vendaAssociada) return;
        setClienteSelecionadoId(vendaAssociada.clienteId);

        if (vendaAssociada.formaPagamento === "FINANCIAMENTO") {
            const partes = [
                vendaAssociada.valorEntrada ? `Entrada de ${formatCurrency(vendaAssociada.valorEntrada)}` : "",
                vendaAssociada.valorFinanciado
                    ? `saldo financiado de ${formatCurrency(vendaAssociada.valorFinanciado)}${vendaAssociada.bancoFinanciador ? ` (${vendaAssociada.bancoFinanciador})` : ""}`
                    : "",
            ].filter(Boolean);
            setFormaPagamento(partes.length > 0 ? partes.join(" e ") : "Financiamento Bancário");
        } else if (vendaAssociada.formaPagamento === "TROCA_E_SALDO") {
            const partes = [
                vendaAssociada.valorTroca ? `Veículo na troca avaliado em ${formatCurrency(vendaAssociada.valorTroca)}` : "Veículo na troca",
                vendaAssociada.valorEntrada ? `volta de ${formatCurrency(vendaAssociada.valorEntrada)}` : "",
            ].filter(Boolean);
            setFormaPagamento(partes.join(" + "));
        } else if (vendaAssociada.formaPagamento === "PIX") {
            setFormaPagamento("À vista, através de transferência instantânea (PIX)");
        } else if (vendaAssociada.formaPagamento === "TRANSFERENCIA") {
            setFormaPagamento("À vista, através de transferência bancária (TED/DOC)");
        } else {
            setFormaPagamento("À vista, em moeda corrente nacional / transferência bancária");
        }
    }, [isOpen, vendaAssociada]);

    const modelo = modelos.find((m) => m.id === modeloSelecionadoId);
    const veiculo = veiculos.find((v) => v.id === veiculoSelecionadoId);
    const cliente = clientes.find((c) => c.id === clienteSelecionadoId);
    const clienteOutorgado = clientes.find((c) => c.id === outorgadoSelecionadoId);

    // Diagnóstico em tempo real: identifica quais tags necessárias pelo modelo estão sem preenchimento no cliente
    const camposPendentesCliente = useMemo(() => {
        if (!modelo || !cliente) return [];
        const pendencias: { campo: string; label: string }[] = [];

        const usaTag = (tag: string) => modelo.conteudo.includes(`{{${tag}}}`) || modelo.conteudo.includes(`{${tag}}`);

        if (usaTag("cliente_estado_civil") && !cliente.estadoCivil?.trim()) {
            pendencias.push({ campo: "estadoCivil", label: "Estado Civil" });
        }
        if (usaTag("cliente_profissao") && !cliente.profissao?.trim()) {
            pendencias.push({ campo: "profissao", label: "Profissão" });
        }
        if (usaTag("cliente_endereco") && !cliente.endereco?.trim()) {
            pendencias.push({ campo: "endereco", label: "Endereço Completo" });
        }
        if (usaTag("cliente_cidade") && !cliente.cidade?.trim()) {
            pendencias.push({ campo: "cidade", label: "Cidade" });
        }
        if (usaTag("cliente_uf") && !cliente.estadoUf?.trim()) {
            pendencias.push({ campo: "estadoUf", label: "UF" });
        }
        if (usaTag("cliente_telefone") && !cliente.telefone?.trim()) {
            pendencias.push({ campo: "telefone", label: "Telefone" });
        }

        return pendencias;
    }, [modelo, cliente]);

    // Abre a gaveta com os dados atuais do cliente
    const handleAbrirCompletar = () => {
        if (!cliente) return;
        setFormCompletar({
            estadoCivil: cliente.estadoCivil || "Casado(a)",
            profissao: cliente.profissao || "",
            endereco: cliente.endereco || "",
            cidade: cliente.cidade || "",
            estadoUf: cliente.estadoUf || "",
            telefone: cliente.telefone || "",
        });
        setDrawerCompletarAberto(true);
    };

    // Salva o cadastro do cliente e atualiza o documento instantaneamente
    const handleSalvarCompletar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!cliente) return;

        updateCliente(cliente.id, {
            ...formCompletar,
        });

        setDrawerCompletarAberto(false);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
    };

    // Função para interpolar tags do documento
    const gerarTextoInterpolado = () => {
        if (!modelo) return "";

        let texto = modelo.conteudo;

        const aplicarTag = (tag: string, valor: string) => {
            texto = texto.replaceAll(`{{${tag}}}`, valor);
            texto = texto.replaceAll(`{${tag}}`, valor);
        };

        // Substituições do Cliente Outorgante (com indicação visual clara caso falte no cadastro)
        if (cliente) {
            aplicarTag("cliente_nome", (cliente.nome || "").toUpperCase());
            aplicarTag("cliente_cpf_cnpj", cliente.cpfCnpj);
            aplicarTag("cliente_rg", "");
            aplicarTag("cliente_nacionalidade", "brasileiro(a)");
            aplicarTag("cliente_estado_civil", (cliente.estadoCivil?.trim() || "[ESTADO CIVIL NÃO INFORMADO]").toLowerCase());
            aplicarTag("cliente_profissao", (cliente.profissao?.trim() || "[PROFISSÃO NÃO INFORMADA]").toLowerCase());
            aplicarTag("cliente_endereco", cliente.endereco?.trim() || "[ENDEREÇO NÃO INFORMADO]");
            aplicarTag("cliente_cidade", cliente.cidade?.trim() || "[CIDADE NÃO INFORMADA]");
            aplicarTag("cliente_uf", (cliente.estadoUf?.trim() || "[UF NÃO INFORMADA]").toUpperCase());
            aplicarTag("cliente_telefone", cliente.telefone?.trim() || "[TELEFONE NÃO INFORMADO]");
        } else {
            aplicarTag("cliente_nome", "[Cliente Outorgante não selecionado]");
            aplicarTag("cliente_cpf_cnpj", "[CPF/CNPJ não informado]");
            aplicarTag("cliente_rg", "");
            aplicarTag("cliente_nacionalidade", "brasileiro(a)");
            aplicarTag("cliente_estado_civil", "[Estado Civil não informado]");
            aplicarTag("cliente_profissao", "[Profissão não informada]");
            aplicarTag("cliente_endereco", "[Endereço não informado]");
            aplicarTag("cliente_cidade", "[Cidade não informada]");
            aplicarTag("cliente_uf", "[UF não informada]");
            aplicarTag("cliente_telefone", "[Telefone não informado]");
        }

        // Substituições do Veículo (prioriza o valor real negociado na venda caso exista)
        if (veiculo) {
            const valorNegociado = vendaAssociada ? vendaAssociada.valorVenda : veiculo.precoAnunciado;
            const modUpper = (veiculo.modelo || "").trim().toUpperCase();
            const verUpper = (veiculo.versao || "").trim().toUpperCase();
            const modeloComVersao = verUpper && !modUpper.includes(verUpper) ? `${modUpper} ${verUpper}`.trim() : modUpper;
            aplicarTag("veiculo_tipo", "Veículo Automotor");
            aplicarTag("veiculo_marca", (veiculo.marca || "").toUpperCase());
            aplicarTag("veiculo_modelo", modeloComVersao);
            aplicarTag("veiculo_versao", verUpper);
            aplicarTag("veiculo_ano", `${veiculo.anoFabricacao}/${veiculo.anoModelo}`);
            aplicarTag("veiculo_cor", (veiculo.cor || "").toUpperCase());
            aplicarTag("veiculo_placa", (veiculo.placa || "Sem emplacamento").toUpperCase());
            aplicarTag("veiculo_renavam", veiculo.renavam || "Não informado");
            aplicarTag("veiculo_chassi", (veiculo.chassi || "Não informado").toUpperCase());
            aplicarTag("veiculo_uso", formatUsage(veiculo));
            aplicarTag("valor_venda", formatCurrency(valorNegociado));
            aplicarTag("valor_venda_extenso", valorPorExtenso(valorNegociado));
        } else {
            aplicarTag("veiculo_tipo", "Veículo Automotor");
            aplicarTag("veiculo_marca", "[Marca não selecionada]");
            aplicarTag("veiculo_modelo", "[Modelo não selecionado]");
            aplicarTag("veiculo_versao", "");
            aplicarTag("veiculo_ano", "[Ano não informado]");
            aplicarTag("veiculo_cor", "[Cor não informada]");
            aplicarTag("veiculo_placa", "[Placa não informada]");
            aplicarTag("veiculo_renavam", "[RENAVAM não informado]");
            aplicarTag("veiculo_chassi", "[Chassi não informado]");
            aplicarTag("veiculo_uso", "[KM não informada]");
            aplicarTag("valor_venda", "R$ 0,00");
            aplicarTag("valor_venda_extenso", "zero reais");
        }

        // Substituições do Outorgado / Procurador (a partir da lista de Clientes)
        if (clienteOutorgado) {
            const cidadeUfOutorgado = [clienteOutorgado.cidade, clienteOutorgado.estadoUf?.toUpperCase()].filter(Boolean).join("/") || "localidade não informada";
            const qualificacaoOutorgado = clienteOutorgado.tipoPessoa === "JURIDICA"
                ? `pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${clienteOutorgado.cpfCnpj}, com sede em ${cidadeUfOutorgado}`
                : `brasileiro(a), ${(clienteOutorgado.estadoCivil || "casado(a)").toLowerCase()}, ${(clienteOutorgado.profissao || "autônomo(a)").toLowerCase()}, inscrito(a) no CPF sob o nº ${clienteOutorgado.cpfCnpj}`;

            aplicarTag("outorgado_nome", (clienteOutorgado.nome || "").toUpperCase());
            aplicarTag("outorgado_documento", clienteOutorgado.cpfCnpj);
            aplicarTag("outorgado_cpf_cnpj", clienteOutorgado.cpfCnpj);
            aplicarTag("outorgado_rg", "");
            aplicarTag("outorgado_estado_civil", (clienteOutorgado.estadoCivil?.trim() || "[ESTADO CIVIL DO PROCURADOR NÃO INFORMADO]").toLowerCase());
            aplicarTag("outorgado_profissao", (clienteOutorgado.profissao?.trim() || "[PROFISSÃO DO PROCURADOR NÃO INFORMADA]").toLowerCase());
            aplicarTag("outorgado_qualificacao", qualificacaoOutorgado);
            aplicarTag("outorgado_endereco", clienteOutorgado.endereco?.trim() || "[ENDEREÇO DO PROCURADOR NÃO INFORMADO]");
            aplicarTag("outorgado_cidade", clienteOutorgado.cidade?.trim() || "[CIDADE DO PROCURADOR NÃO INFORMADA]");
            aplicarTag("outorgado_uf", (clienteOutorgado.estadoUf?.trim() || "[UF DO PROCURADOR NÃO INFORMADA]").toUpperCase());
        } else {
            aplicarTag("outorgado_nome", "[Outorgado não selecionado]");
            aplicarTag("outorgado_documento", "[Documento não informado]");
            aplicarTag("outorgado_cpf_cnpj", "[CPF/CNPJ não informado]");
            aplicarTag("outorgado_rg", "");
            aplicarTag("outorgado_estado_civil", "[Estado Civil do Procurador não informado]");
            aplicarTag("outorgado_profissao", "[Profissão do Procurador não informada]");
            aplicarTag("outorgado_qualificacao", "[Qualificação cartorial não informada]");
            aplicarTag("outorgado_endereco", "[Endereço não informado]");
            aplicarTag("outorgado_cidade", "[Cidade não informada]");
            aplicarTag("outorgado_uf", "[UF não informada]");
        }

        // Forma de Pagamento
        aplicarTag("forma_pagamento", formaPagamento || "À vista, via transferência bancária / PIX");

        // Datas e Localidades por Extenso
        const hoje = new Date();
        const meses = [
            "janeiro", "fevereiro", "março", "abril", "maio", "junho",
            "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
        ];
        const dataFormatada = `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
        aplicarTag("data_atual", dataFormatada);

        const cidadeUfCliente = [cliente?.cidade, cliente?.estadoUf?.toUpperCase()].filter(Boolean).join("/");
        const cidadeExtenso = cidadeUfCliente
            ? `${cidadeUfCliente}, ${dataFormatada}`
            : dataFormatada;
        aplicarTag("cidade_data_extenso", cidadeExtenso);

        return texto;
    };

    // Atualiza o texto interpolado quando as seleções ou dados dos clientes mudam
    useEffect(() => {
        const texto = gerarTextoInterpolado();
        setConteudoEditavel(texto);
    }, [modeloSelecionadoId, clienteSelecionadoId, veiculoSelecionadoId, outorgadoSelecionadoId, formaPagamento, modelos, veiculos, clientes, vendas]);

    if (!isOpen) return null;

    // Imprimir diretamente em folha A4 com tipografia legal (compatível com celulares e desktop)
    const handleImprimir = () => {
        if (camposPendentesCliente.length > 0) {
            const lista = camposPendentesCliente.map((p) => p.label).join(", ");
            alert(
                `Emissão Bloqueada: Não é permitido imprimir ou salvar em PDF enquanto houver dados cadastrais pendentes (${lista}).\n\nPor favor, complete as informações clicando no botão "Completar Cadastro Rápido".`
            );
            return;
        }

        salvarHistorico();
        const nomeOutorgante = cliente?.nome ? cliente.nome.trim().split(/\s+/)[0] : "";
        const nomeOutorgado = clienteOutorgado?.nome ? clienteOutorgado.nome.trim().split(/\s+/)[0] : "";
        const tituloDoc =
            nomeOutorgante && nomeOutorgado
                ? `PROCURACAO_${nomeOutorgante}_${nomeOutorgado}`
                : modelo?.titulo || "PROCURACAO";
        imprimirDocumento(conteudoEditavel, tituloDoc);
    };

    const handleEncaminharPdf = async () => {
        if (camposPendentesCliente.length > 0) {
            const lista = camposPendentesCliente.map((p) => p.label).join(", ");
            alert(
                `Emissão Bloqueada: Não é permitido encaminhar o PDF enquanto houver dados cadastrais pendentes (${lista}).\n\nPor favor, complete as informações clicando no botão "Completar Cadastro Rápido".`
            );
            return;
        }

        salvarHistorico();
        const nomeOutorgante = cliente?.nome ? cliente.nome.trim().split(/\s+/)[0] : "";
        const nomeOutorgado = clienteOutorgado?.nome ? clienteOutorgado.nome.trim().split(/\s+/)[0] : "";
        const tituloPdf =
            nomeOutorgante && nomeOutorgado
                ? `PROCURACAO_${nomeOutorgante}_${nomeOutorgado}`
                : modelo?.titulo || "PROCURACAO";
        await compartilharOuBaixarPdfDocumento(conteudoEditavel, tituloPdf);
    };

    const salvarHistorico = () => {
        if (!modelo || !clienteSelecionadoId || !veiculoSelecionadoId) return;

        salvarDocumentoGerado({
            modeloId: modelo.id,
            clienteId: clienteSelecionadoId,
            veiculoId: veiculoSelecionadoId,
            vendaId: vendaAssociada?.id,
            outorgadoId: outorgadoSelecionadoId,
            titulo: modelo.titulo,
            conteudoFinal: conteudoEditavel,
        });

        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-md p-1.5 sm:p-4 flex items-center justify-center">
            <div className="bg-white border border-black/[0.08] rounded-2xl sm:rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[96vh] sm:h-[92vh] max-h-[900px] relative animate-in fade-in zoom-in-95 duration-200">
                {/* Header Apple iOS */}
                <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/80 shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
                            <FileText className="w-4 h-4 font-bold" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm sm:text-lg text-zinc-950 tracking-tight truncate">
                                Emissor de Procurações & Contratos
                            </h3>
                            <p className="text-[11px] sm:text-xs text-zinc-500 font-normal truncate hidden sm:block">
                                Gere procurações DETRAN, contratos de compra e venda e termos preenchidos.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors shrink-0 ml-2 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Barra de Seleção de Entidades */}
                <div className="px-3 sm:px-6 py-2 sm:py-3 bg-[#f2f2f7]/80 border-b border-black/[0.06] grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
                    {/* 1. Modelo de Documento */}
                    <div className="min-w-0 flex flex-col justify-between">
                        <div className="flex items-center justify-between h-4 mb-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 truncate">
                                1. Modelo:
                            </label>
                        </div>
                        <select
                            value={modeloSelecionadoId}
                            onChange={(e) => setModeloSelecionadoId(e.target.value)}
                            className="w-full bg-white border border-black/[0.08] focus:border-blue-500 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none font-medium shadow-2xs truncate"
                        >
                            {modelos.length === 0 ? (
                                <option value="">Nenhum modelo cadastrado</option>
                            ) : (
                                modelos.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.titulo}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* 2. Cliente (Outorgante / Vendedor / Dono) */}
                    <div className="min-w-0 flex flex-col justify-between">
                        <div className="flex items-center justify-between h-4 mb-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 truncate">
                                2. Outorgante (Cliente):
                            </label>
                        </div>
                        <select
                            value={clienteSelecionadoId}
                            onChange={(e) => setClienteSelecionadoId(e.target.value)}
                            className="w-full bg-white border border-black/[0.08] focus:border-blue-500 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none font-medium shadow-2xs truncate"
                        >
                            {clientes.length === 0 ? (
                                <option value="">Nenhum cliente cadastrado</option>
                            ) : (
                                clientes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nome} ({c.cpfCnpj})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* 3. Veículo Automotor */}
                    <div className="min-w-0 flex flex-col justify-between">
                        <div className="flex items-center justify-between h-4 mb-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 truncate">
                                3. Veículo:
                            </label>
                        </div>
                        <select
                            value={veiculoSelecionadoId}
                            onChange={(e) => setVeiculoSelecionadoId(e.target.value)}
                            className="w-full bg-white border border-black/[0.08] focus:border-blue-500 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none font-medium shadow-2xs truncate"
                        >
                            {veiculos.length === 0 ? (
                                <option value="">Nenhum veículo no estoque</option>
                            ) : (
                                veiculos.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.marca} {v.modelo} {v.versao || ""} ({v.placa ? `Placa: ${v.placa}` : `Chassi: ${v.chassi || "S/ Placa"}`})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* 4. Outorgado (Procurador) */}
                    <div className="min-w-0 flex flex-col justify-between">
                        <div className="flex items-center justify-between h-4 mb-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 truncate">
                                4. Outorgado (Cliente):
                            </label>
                        </div>
                        <select
                            value={outorgadoSelecionadoId}
                            onChange={(e) => setOutorgadoSelecionadoId(e.target.value)}
                            className="w-full bg-white border border-black/[0.08] focus:border-blue-500 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none font-medium shadow-2xs truncate"
                        >
                            {clientes.length === 0 ? (
                                <option value="">Nenhum cliente cadastrado</option>
                            ) : (
                                clientes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nome} ({c.cpfCnpj})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                </div>

                {/* Banner Inteligente: Alerta de Dados Faltantes no Cadastro com Ação Rápida */}
                {camposPendentesCliente.length > 0 && (
                    <div className="mx-2.5 sm:mx-6 mt-2.5 p-3 sm:px-4 sm:py-2.5 bg-amber-50/95 border border-amber-200/90 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 animate-in fade-in shadow-2xs shrink-0">
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-6 h-6 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-amber-950 break-words leading-tight">
                                    {camposPendentesCliente.length === 1
                                        ? `1 dado exigido por este modelo está pendente no cadastro de ${cliente?.nome}:`
                                        : `${camposPendentesCliente.length} dados exigidos por este modelo estão pendentes no cadastro de ${cliente?.nome}:`}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {camposPendentesCliente.map((p) => (
                                        <span key={p.campo} className="text-[10px] bg-amber-100/90 text-amber-900 font-semibold px-2 py-0.5 rounded-md border border-amber-200">
                                            {p.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleAbrirCompletar}
                            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Completar Cadastro Rápido</span>
                        </button>
                    </div>
                )}

                {/* Área Central: Visualizador de Documento (Folha A4 Apple Material com scroll perfeito) */}
                <div className="p-2 sm:p-6 overflow-y-auto flex-1 min-h-0 bg-[#f2f2f7] flex flex-col items-center">
                    {savedSuccess && (
                        <div className="w-full max-w-3xl flex justify-end mb-3 text-xs shrink-0">
                            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl shadow-xs animate-in fade-in">
                                <Check className="w-3.5 h-3.5" /> Atualizado com sucesso!
                            </span>
                        </div>
                    )}

                    {/* Folha A4 Simulada */}
                    <div className="w-full max-w-3xl bg-white text-zinc-900 rounded-2xl shadow-sm p-4 sm:p-10 border border-black/[0.06] my-auto">
                        <div
                            className="font-serif text-sm sm:text-base leading-relaxed break-words text-zinc-900 select-text"
                            dangerouslySetInnerHTML={{ __html: renderDocumentoFormatadoHtml(conteudoEditavel) }}
                        />
                    </div>
                </div>

                {/* Rodapé com Botões de Ação */}
                <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 border-t border-black/[0.06] bg-zinc-50/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
                    <div className="text-xs flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
                        {camposPendentesCliente.length > 0 && (
                            <div className="flex items-start sm:items-center gap-2 w-full bg-amber-500/10 border border-amber-300/70 p-2 sm:p-0 sm:bg-transparent sm:border-0 rounded-xl">
                                <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
                                <span className="text-amber-900 font-medium text-[11px] sm:text-xs break-words leading-tight flex-1">
                                    Emissão bloqueada: Complete os {camposPendentesCliente.length} dados pendentes no banner acima para liberar a impressão e o envio do PDF.
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                        <button
                            type="button"
                            onClick={handleImprimir}
                            disabled={camposPendentesCliente.length > 0}
                            title={camposPendentesCliente.length > 0 ? "Preencha todos os dados pendentes para liberar a impressão" : "Imprimir"}
                            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all ${camposPendentesCliente.length > 0
                                    ? "bg-zinc-100 text-zinc-400 border border-zinc-200/80 cursor-not-allowed opacity-60 shadow-none"
                                    : "bg-white text-zinc-800 hover:text-zinc-950 hover:bg-zinc-50 border border-black/[0.08] active:scale-95 shadow-2xs cursor-pointer"
                                }`}
                        >
                            {camposPendentesCliente.length > 0 ? (
                                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                            ) : (
                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>Imprimir</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleEncaminharPdf}
                            disabled={camposPendentesCliente.length > 0}
                            title={camposPendentesCliente.length > 0 ? "Preencha todos os dados pendentes para liberar o envio" : "Encaminhar PDF"}
                            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all ${camposPendentesCliente.length > 0
                                    ? "bg-zinc-200 text-zinc-400 border border-zinc-300/80 cursor-not-allowed opacity-60 shadow-none"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-xs cursor-pointer"
                                }`}
                        >
                            {camposPendentesCliente.length > 0 ? (
                                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                            ) : (
                                <Share2 className="w-3.5 h-3.5" />
                            )}
                            <span>Encaminhar PDF</span>
                        </button>
                    </div>
                </div>

                {/* Mini-Painel / Drawer: Completar Cadastro Rápido sem sair da tela */}
                {drawerCompletarAberto && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
                        <div className="bg-white border border-black/[0.08] rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/80">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shadow-2xs shrink-0">
                                        <UserCheck className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-semibold text-xs sm:text-base text-zinc-950 tracking-tight truncate">
                                            Completar Cadastro de {cliente?.nome}
                                        </h4>
                                        <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
                                            Preencha as informações pendentes para atualizar o documento.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDrawerCompletarAberto(false)}
                                    className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSalvarCompletar} className="p-4 sm:p-6 space-y-3 sm:space-y-3.5">
                                {/* Telefone / WhatsApp */}
                                <div>
                                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                                        Telefone / WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        value={formCompletar.telefone}
                                        onChange={(e) => setFormCompletar({ ...formCompletar, telefone: e.target.value })}
                                        placeholder="(00) 00000-0000"
                                        className="w-full bg-zinc-50 border border-black/[0.08] focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                    {/* Estado Civil */}
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-700 block mb-1">
                                            Estado Civil
                                        </label>
                                        <select
                                            value={formCompletar.estadoCivil}
                                            onChange={(e) => setFormCompletar({ ...formCompletar, estadoCivil: e.target.value })}
                                            className="w-full bg-zinc-50 border border-black/[0.08] focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:outline-none transition-all"
                                        >
                                            <option value="Solteiro(a)">Solteiro(a)</option>
                                            <option value="Casado(a)">Casado(a)</option>
                                            <option value="Divorciado(a)">Divorciado(a)</option>
                                            <option value="Viúvo(a)">Viúvo(a)</option>
                                            <option value="União Estável">União Estável</option>
                                        </select>
                                    </div>

                                    {/* Profissão */}
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-700 block mb-1">
                                            Profissão
                                        </label>
                                        <input
                                            type="text"
                                            value={formCompletar.profissao}
                                            onChange={(e) => setFormCompletar({ ...formCompletar, profissao: e.target.value })}
                                            placeholder="Profissão ou ocupação"
                                            className="w-full bg-zinc-50 border border-black/[0.08] focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Endereço Completo */}
                                <div>
                                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                                        Endereço Completo com CEP
                                    </label>
                                    <input
                                        type="text"
                                        value={formCompletar.endereco}
                                        onChange={(e) => setFormCompletar({ ...formCompletar, endereco: e.target.value })}
                                        placeholder="Logradouro, número, bairro e CEP"
                                        className="w-full bg-zinc-50 border border-black/[0.08] focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:outline-none transition-all"
                                    />
                                </div>

                                {/* Cidade e UF */}
                                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                                    <div className="col-span-2">
                                        <label className="text-xs font-semibold text-zinc-700 block mb-1">Cidade</label>
                                        <input
                                            type="text"
                                            value={formCompletar.cidade}
                                            onChange={(e) => setFormCompletar({ ...formCompletar, cidade: e.target.value })}
                                            placeholder="Cidade"
                                            className="w-full bg-zinc-50 border border-black/[0.08] focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-700 block mb-1">UF</label>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            value={formCompletar.estadoUf}
                                            onChange={(e) => setFormCompletar({ ...formCompletar, estadoUf: e.target.value.toUpperCase() })}
                                            placeholder="UF"
                                            className="w-full bg-zinc-50 border border-black/[0.08] focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium uppercase focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Rodapé */}
                                <div className="pt-3 border-t border-black/[0.06] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDrawerCompletarAberto(false)}
                                        className="w-full sm:w-auto text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-4 py-2 rounded-xl transition-colors text-center cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 sm:py-2 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Salvar e Atualizar Documento</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
