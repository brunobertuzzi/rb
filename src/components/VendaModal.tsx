"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Veiculo, Cliente, FormaPagamento, ParcelaReceber } from "@/types";
import { formatCurrency, formatUsage, formatCurrencyInput, parseCurrencyInput, getLocalISODate } from "@/lib/utils";
import {
    X,
    BadgeDollarSign,
    BookOpen
} from "lucide-react";

function getDefaultFirstDueDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return getLocalISODate(d);
}

function addMonthsToISODate(isoDate: string, monthsToAdd: number): string {
    const parts = isoDate.split("-").map(Number);
    if (parts.length !== 3) return isoDate;
    const d = new Date(parts[0], parts[1] - 1 + monthsToAdd, parts[2], 12, 0, 0);
    return getLocalISODate(d);
}

function gerarParcelasPrevistas(saldoDevedor: number, qtd: number, primeiroVencimento: string): ParcelaReceber[] {
    const numParcelas = Math.max(1, Math.min(120, Math.floor(qtd || 1)));
    const totalCentavos = Math.round(saldoDevedor * 100);
    if (totalCentavos <= 0) return [];
    const baseCentavos = Math.floor(totalCentavos / numParcelas);
    const restoCentavos = totalCentavos - baseCentavos * numParcelas;

    return Array.from({ length: numParcelas }, (_, idx) => {
        const centavosParcela = idx === numParcelas - 1 ? baseCentavos + restoCentavos : baseCentavos;
        return {
            id: `parc-${Date.now()}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
            numero: idx + 1,
            valor: centavosParcela / 100,
            dataVencimento: addMonthsToISODate(primeiroVencimento || getDefaultFirstDueDate(), idx),
            pago: false,
        };
    });
}

interface VendaModalProps {
    veiculoInicial?: Veiculo | null;
    isOpen: boolean;
    onClose: () => void;
}

export function VendaModal({
    veiculoInicial,
    isOpen,
    onClose,
}: VendaModalProps) {
    const { veiculos, clientes, registrarVenda } = useApp();
    const { user } = useAuth();

    const [veiculoId, setVeiculoId] = useState<string>("");
    const [clienteId, setClienteId] = useState<string>("");
    const [valorVenda, setValorVenda] = useState<number>(0);
    const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("PIX");
    const [valorEntrada, setValorEntrada] = useState<number>(0);
    const [valorFinanciado, setValorFinanciado] = useState<number>(0);
    const [bancoFinanciador, setBancoFinanciador] = useState<string>("");
    const [observacoes, setObservacoes] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Dados de Parcelamento / Caderno de Anotações
    const [qtdParcelasCaderno, setQtdParcelasCaderno] = useState<number | "">(6);
    const [primeiroVencimentoCaderno, setPrimeiroVencimentoCaderno] = useState<string>(getDefaultFirstDueDate());
    const [anotacoesCaderno, setAnotacoesCaderno] = useState<string>("");
    const [parcelarVoltaTroca, setParcelarVoltaTroca] = useState<boolean>(false);

    // Dados de Veículo Recebido na Troca (TROCA_E_SALDO)
    const [trocaMarca, setTrocaMarca] = useState<string>("");
    const [trocaModelo, setTrocaModelo] = useState<string>("");
    const [trocaAnoFab, setTrocaAnoFab] = useState<number>(new Date().getFullYear());
    const [trocaAnoMod, setTrocaAnoMod] = useState<number>(new Date().getFullYear());
    const [trocaIdentificacao, setTrocaIdentificacao] = useState<string>("");
    const [trocaValorAvaliacao, setTrocaValorAvaliacao] = useState<number>(0);

    // Inicializa quando aberto
    useEffect(() => {
        if (isOpen) {
            setIsSubmitting(false);
            setValorEntrada(0);
            setValorFinanciado(0);
            setBancoFinanciador("");
            setObservacoes("");
            setQtdParcelasCaderno(6);
            setPrimeiroVencimentoCaderno(getDefaultFirstDueDate());
            setAnotacoesCaderno("");
            setParcelarVoltaTroca(false);

            setTrocaMarca("");
            setTrocaModelo("");
            setTrocaAnoFab(new Date().getFullYear());
            setTrocaAnoMod(new Date().getFullYear());
            setTrocaIdentificacao("");
            setTrocaValorAvaliacao(0);

            const disponiveis = veiculos.filter((v) => v.status === "DISPONIVEL");
            if (veiculoInicial && veiculoInicial.status !== "VENDIDO") {
                setVeiculoId(veiculoInicial.id);
                setValorVenda(veiculoInicial.precoAnunciado);
            } else if (disponiveis.length > 0) {
                setVeiculoId(disponiveis[0].id);
                setValorVenda(disponiveis[0].precoAnunciado);
            } else {
                setVeiculoId("");
                setValorVenda(0);
            }
            if (clientes.length > 0) {
                setClienteId((prev) => (clientes.some((c) => c.id === prev) ? prev : clientes[0].id));
            } else {
                setClienteId("");
            }
        }
    }, [isOpen, veiculoInicial, veiculos, clientes]);

    const veiculoSelecionado = veiculos.find((v) => v.id === veiculoId);

    // Cálculos em tempo real (Margem real sobre a receita de venda)
    const custoTotal = veiculoSelecionado ? veiculoSelecionado.custoTotal || veiculoSelecionado.valorAquisicao : 0;
    const margemLucro = valorVenda - custoTotal;
    const margemPercentual = valorVenda > 0 ? (margemLucro / valorVenda) * 100 : 0;

    if (!isOpen) return null;

    const handleFinalizarVenda = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!veiculoId) {
            alert("Selecione um veículo disponível para realizar a venda.");
            return;
        }
        if (!clienteId) {
            alert("Cadastre e selecione um cliente comprador antes de concretizar a venda.");
            return;
        }
        if (valorVenda <= 0) {
            alert("Informe um valor de venda válido maior que zero.");
            return;
        }

        if (formaPagamento === "FINANCIAMENTO") {
            const somaFinanciamento = Number(valorEntrada || 0) + Number(valorFinanciado || 0);
            if (Math.abs(valorVenda - somaFinanciamento) > 0.05) {
                alert(
                    `A soma de Entrada (${formatCurrency(valorEntrada)}) + Valor Financiado (${formatCurrency(valorFinanciado)}) deve ser igual ao Valor Final da Venda (${formatCurrency(valorVenda)}).`
                );
                return;
            }
        }

        if (formaPagamento === "PARCELADO") {
            const saldoDevedor = Math.max(0, Number(valorVenda) - Number(valorEntrada || 0));
            if (saldoDevedor <= 0) {
                alert("Para venda parcelada, o Saldo Devedor deve ser maior que zero (Valor da Venda maior que a Entrada).");
                return;
            }
        }

        if (formaPagamento === "TROCA_E_SALDO") {
            if (!trocaMarca.trim() || !trocaModelo.trim() || trocaValorAvaliacao <= 0) {
                alert("Preencha a Marca, Modelo e Valor de Avaliação do veículo recebido na troca.");
                return;
            }
            if (trocaValorAvaliacao > valorVenda) {
                alert("O valor de avaliação da troca não pode exceder o valor total da venda sem ajuste.");
                return;
            }
        }

        try {
            setIsSubmitting(true);

            const voltaTotalTroca = Math.max(0, Number(valorVenda) - Number(trocaValorAvaliacao));
            const usaCaderno =
                formaPagamento === "PARCELADO" || (formaPagamento === "TROCA_E_SALDO" && parcelarVoltaTroca && voltaTotalTroca > 0);

            const saldoDevedorCalculado =
                formaPagamento === "PARCELADO"
                    ? Math.max(0, Number(valorVenda) - Number(valorEntrada || 0))
                    : usaCaderno
                        ? Math.max(0, voltaTotalTroca - Number(valorEntrada || 0))
                        : 0;

            const parcelasGeradas =
                usaCaderno && saldoDevedorCalculado > 0
                    ? gerarParcelasPrevistas(saldoDevedorCalculado, Number(qtdParcelasCaderno) || 1, primeiroVencimentoCaderno)
                    : undefined;

            registrarVenda({
                veiculoId,
                clienteId,
                valorVenda,
                formaPagamento,
                valorEntrada:
                    formaPagamento === "TROCA_E_SALDO"
                        ? parcelarVoltaTroca
                            ? Number(valorEntrada || 0)
                            : voltaTotalTroca
                        : Number(valorEntrada || 0),
                valorFinanciado: formaPagamento === "FINANCIAMENTO" ? Number(valorFinanciado || 0) : 0,
                bancoFinanciador: formaPagamento === "FINANCIAMENTO" ? bancoFinanciador || undefined : undefined,
                veiculoTroca:
                    formaPagamento === "TROCA_E_SALDO"
                        ? {
                            marca: trocaMarca.trim(),
                            modelo: trocaModelo.trim(),
                            anoFabricacao: Number(trocaAnoFab) || new Date().getFullYear(),
                            anoModelo: Number(trocaAnoMod) || new Date().getFullYear(),
                            placa: trocaIdentificacao.trim().toUpperCase() || undefined,
                            valorAvaliacao: Number(trocaValorAvaliacao),
                        }
                        : undefined,
                saldoDevedorInicial: usaCaderno && saldoDevedorCalculado > 0 ? saldoDevedorCalculado : undefined,
                parcelas: parcelasGeradas,
                anotacoesCaderno: usaCaderno ? anotacoesCaderno.trim() || undefined : undefined,
                observacoes: observacoes.trim() || undefined,
            });

            onClose();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Erro ao registrar venda.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const veiculosElegiveis = veiculos.filter(
        (v) => v.status === "DISPONIVEL" || (veiculoInicial && v.id === veiculoInicial.id && v.status !== "VENDIDO")
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-md overflow-y-auto">
            <div className="bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
                {/* Header Apple iOS */}
                <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/70">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-xs">
                            <BadgeDollarSign className="w-5 h-5 font-bold" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-base sm:text-lg text-zinc-900 tracking-tight">
                                Concretizar Venda
                            </h3>
                            <p className="text-xs text-zinc-500 font-normal">
                                Fechamento de negócio rápido com cálculo de margem real.
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

                {/* Formulário de Venda */}
                <form onSubmit={handleFinalizarVenda} className="p-5 sm:p-6 space-y-4">
                        {(veiculosElegiveis.length === 0 || clientes.length === 0) && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3 text-xs font-medium">
                                {veiculosElegiveis.length === 0
                                    ? "Não há veículos com status Disponível no estoque no momento."
                                    : "Nenhum cliente cadastrado. Cadastre o cliente na aba Clientes antes de registrar a venda."}
                            </div>
                        )}

                        {/* Linha 1: Seleção de Veículo e Cliente */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                                    1. Veículo a Vender *
                                </label>
                                <select
                                    value={veiculoId}
                                    onChange={(e) => {
                                        setVeiculoId(e.target.value);
                                        const sel = veiculos.find((v) => v.id === e.target.value);
                                        if (sel) {
                                            setValorVenda(sel.precoAnunciado);
                                            if (formaPagamento === "FINANCIAMENTO") {
                                                setValorFinanciado(Math.max(0, sel.precoAnunciado - valorEntrada));
                                            }
                                        }
                                    }}
                                    required
                                    className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none font-medium shadow-xs"
                                >
                                    {veiculosElegiveis.length === 0 && (
                                        <option value="">Nenhum veículo disponível</option>
                                    )}
                                    {veiculosElegiveis.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.marca} {v.modelo} — Anunciado por {formatCurrency(v.precoAnunciado)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                                    2. Cliente Comprador *
                                </label>
                                <select
                                    value={clienteId}
                                    onChange={(e) => setClienteId(e.target.value)}
                                    required
                                    className="w-full bg-[#f2f2f7] border border-black/[0.08] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none font-medium shadow-xs"
                                >
                                    {clientes.length === 0 && (
                                        <option value="">Cadastre um cliente primeiro</option>
                                    )}
                                    {clientes.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.nome} ({c.cpfCnpj})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Linha 2: Condições Financeiras e Apuração de Lucro */}
                        <div className="bg-[#f2f2f7]/50 border border-black/[0.05] rounded-2xl p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider block">
                                    Condições Comerciais & Apuração em Tempo Real
                                </span>
                                {veiculoSelecionado?.valorFipe && veiculoSelecionado.valorFipe > 0 ? (
                                    <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
                                        Referência FIPE: {formatCurrency(veiculoSelecionado.valorFipe)}
                                    </span>
                                ) : null}
                            </div>

                            <div className={`grid grid-cols-1 ${user?.role === "VENDEDOR" ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-3`}>
                                <div>
                                    <label className="text-[11px] text-zinc-500 font-medium block mb-1">Valor Final da Venda (R$)</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="0,00"
                                        value={formatCurrencyInput(valorVenda)}
                                        onChange={(e) => {
                                            const novoValor = parseCurrencyInput(e.target.value);
                                            setValorVenda(novoValor);
                                            if (formaPagamento === "FINANCIAMENTO") {
                                                setValorFinanciado(Math.max(0, novoValor - valorEntrada));
                                            }
                                        }}
                                        required
                                        className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-zinc-900 font-bold focus:outline-none shadow-xs"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] text-zinc-500 font-medium block mb-1">Forma de Pagamento</label>
                                    <select
                                        value={formaPagamento}
                                        onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                                        className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:outline-none shadow-xs"
                                    >
                                        <option value="PIX">PIX</option>
                                        <option value="A_VISTA">Dinheiro à Vista</option>
                                        <option value="PARCELADO">Parcelado / A Prazo (A Receber)</option>
                                    </select>
                                </div>

                                {/* Box de Lucro Líquido Calculado (Apenas para Admin e Gerente) */}
                                {user?.role !== "VENDEDOR" && (
                                    <div className="bg-white border border-black/[0.06] rounded-xl p-3 flex flex-col justify-center shadow-xs">
                                        <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                                            {formaPagamento === "PARCELADO" ? "Lucro Projetado Final:" : "Lucro Líquido Apurado:"}
                                        </span>
                                        <div className="flex items-baseline gap-1.5 mt-0.5">
                                            <strong className={`text-base sm:text-lg font-bold ${margemLucro >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                                {margemLucro >= 0 ? "+" : ""}{formatCurrency(margemLucro)}
                                            </strong>
                                            <span className="text-xs text-zinc-500">
                                                ({margemPercentual.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-zinc-400 block">
                                            Custo total: {formatCurrency(custoTotal)}
                                        </span>
                                        {formaPagamento === "PARCELADO" && (
                                            <span className="text-[10px] text-amber-800 font-semibold block mt-1">
                                                * O valor vendido a prazo ainda não conta como lucro realizado até que as parcelas sejam recebidas.
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Detalhes de Venda Parcelada */}
                            {formaPagamento === "PARCELADO" && (
                                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-3 animate-in fade-in duration-150">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-950">
                                            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                                            <span>Lançamento em A Receber</span>
                                        </div>
                                        <span className="text-xs font-bold text-amber-800">
                                            Saldo Devedor a Receber: {formatCurrency(Math.max(0, valorVenda - valorEntrada))}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                        <div>
                                            <label className="text-[11px] text-amber-900 font-medium block mb-1">Entrada Paga Hoje (R$)</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={formatCurrencyInput(valorEntrada)}
                                                onChange={(e) => setValorEntrada(parseCurrencyInput(e.target.value))}
                                                placeholder="0,00"
                                                className="w-full bg-white border border-amber-200 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-amber-900 font-medium block mb-1">Qtd. de Parcelas Previstas</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={120}
                                                value={qtdParcelasCaderno}
                                                onChange={(e) => setQtdParcelasCaderno(e.target.value === "" ? "" : Math.max(1, Math.min(120, Number(e.target.value))))}
                                                className="w-full bg-white border border-amber-200 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-amber-900 font-medium block mb-1">1º Vencimento</label>
                                            <input
                                                type="date"
                                                value={primeiroVencimentoCaderno}
                                                onChange={(e) => setPrimeiroVencimentoCaderno(e.target.value)}
                                                className="w-full bg-white border border-amber-200 focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-zinc-900 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                        <span className="text-[11px] text-amber-800">
                                            Previsão:{" "}
                                            <strong>
                                                {Number(qtdParcelasCaderno) || 1}x de{" "}
                                                {formatCurrency(Math.max(0, valorVenda - valorEntrada) / Math.max(1, Number(qtdParcelasCaderno) || 1))}
                                            </strong>{" "}
                                            (você também poderá lançar abatimentos parciais livres em A Receber)
                                        </span>
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-amber-900 font-medium block mb-1">
                                            Anotação do Cliente (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={anotacoesCaderno}
                                            onChange={(e) => setAnotacoesCaderno(e.target.value)}
                                            placeholder="Ex: Deixou notas promissórias / Combinado pagamento mensal..."
                                            className="w-full bg-white border border-amber-200 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Linha 4: Observações Gerais */}
                        <div>
                            <label className="text-[11px] text-zinc-500 font-medium block mb-1">Observações da Venda (opcional)</label>
                            <input
                                type="text"
                                placeholder="Observações sobre a transação"
                                value={observacoes}
                                onChange={(e) => setObservacoes(e.target.value)}
                                className="w-full bg-[#f2f2f7] border border-black/[0.06] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none shadow-xs"
                            />
                        </div>

                        {/* Rodapé: Botão de Confirmar Venda */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <span className="text-xs text-zinc-500">
                                Ao clicar em concretizar, o status mudará para Vendido.
                            </span>

                            <button
                                type="submit"
                                disabled={isSubmitting || veiculosElegiveis.length === 0 || clientes.length === 0}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-xl transition-all shadow-xs active:scale-95 min-h-[40px]"
                            >
                                <BadgeDollarSign className="w-4 h-4" />
                                <span>{isSubmitting ? "Registrando..." : "Confirmar Venda"}</span>
                            </button>
                        </div>
                    </form>
            </div>
        </div>
    );
}
