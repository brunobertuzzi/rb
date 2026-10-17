"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calcularFinanceiroVenda, calcularTotaisFinanceiros } from "@/lib/financial";
import {
    BarChart3,
    TrendingUp,
    Car,
    Wrench,
    CalendarRange,
    PieChart,
    Clock,
    Award,
    Wallet,
    Layers,
    Activity,
} from "lucide-react";

export type PeriodoRelatorio =
    | "TODOS"
    | "MES_ATUAL"
    | "ANO_ATUAL"
    | "PERSONALIZADO";

const FORMA_PAGAMENTO_LABELS: Record<string, { label: string; color: string; bar: string; stroke: string }> = {
    PIX: { label: "PIX", color: "text-emerald-700", bar: "bg-emerald-500", stroke: "#10b981" },
    A_VISTA: { label: "À Vista", color: "text-teal-700", bar: "bg-teal-500", stroke: "#14b8a6" },
    TRANSFERENCIA: { label: "Transferência", color: "text-blue-700", bar: "bg-blue-500", stroke: "#3b82f6" },
    FINANCIAMENTO: { label: "Financiamento", color: "text-indigo-700", bar: "bg-indigo-500", stroke: "#6366f1" },
    PARCELADO: { label: "A Prazo / A Receber", color: "text-amber-700", bar: "bg-amber-500", stroke: "#f59e0b" },
    TROCA_E_SALDO: { label: "Troca + Volta", color: "text-purple-700", bar: "bg-purple-500", stroke: "#a855f7" },
};

const CATEGORIA_DESPESA_NOMES: Record<string, string> = {
    OFICINA: "Mecânica e Revisão",
    PINTURA: "Funilaria e Pintura",
    PNEUS: "Pneus e Borracharia",
    LAVAGEM: "Lavagem e Polimento",
    TRANSPORTE: "Guincho e Transporte",
    DOCUMENTACAO: "Documento e Despachante",
    OUTROS: "Outros Gastos",
};

const CATEGORIA_DESPESA_COLORS: Record<string, string> = {
    OFICINA: "bg-amber-500",
    PINTURA: "bg-rose-500",
    PNEUS: "bg-zinc-700",
    LAVAGEM: "bg-sky-500",
    TRANSPORTE: "bg-indigo-500",
    DOCUMENTACAO: "bg-emerald-500",
    OUTROS: "bg-purple-500",
};

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function RelatoriosView() {
    const { veiculos, vendas } = useApp();

    const [periodo, setPeriodo] = useState<PeriodoRelatorio>("TODOS");
    const [dataInicioCustom, setDataInicioCustom] = useState<string>("");
    const [dataFimCustom, setDataFimCustom] = useState<string>("");
    const [anoAtual, setAnoAtual] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        setAnoAtual(new Date().getFullYear());
    }, []);

    // Filtragem de vendas pelo período escolhido
    const vendasFiltradas = useMemo(() => {
        return vendas.filter((v) => {
            if (periodo === "TODOS") return true;

            const dataV = new Date(v.dataVenda + "T00:00:00");
            const hoje = new Date();

            if (periodo === "MES_ATUAL") {
                return dataV.getMonth() === hoje.getMonth() && dataV.getFullYear() === hoje.getFullYear();
            }

            if (periodo === "ANO_ATUAL") {
                return dataV.getFullYear() === hoje.getFullYear();
            }

            if (periodo === "PERSONALIZADO") {
                if (dataInicioCustom && dataV < new Date(dataInicioCustom + "T00:00:00")) return false;
                if (dataFimCustom && dataV > new Date(dataFimCustom + "T23:59:59")) return false;
                return true;
            }

            return true;
        });
    }, [vendas, periodo, dataInicioCustom, dataFimCustom]);

    // Totais Financeiros das Vendas (Regime de Caixa e Competência)
    const totaisFinanceiros = useMemo(
        () => calcularTotaisFinanceiros(vendasFiltradas),
        [vendasFiltradas]
    );

    const faturamentoTotal = totaisFinanceiros.faturamentoContratado;
    const faturamentoRecebido = totaisFinanceiros.faturamentoRecebido;
    const saldoTotalAReceber = totaisFinanceiros.saldoTotalAReceber;
    const lucroLiquidoRealizado = totaisFinanceiros.lucroRealizado;
    const lucroPendente = totaisFinanceiros.lucroPendente;
    const lucroProjetado = totaisFinanceiros.lucroProjetado;

    const custoAquisicaoVendido = useMemo(
        () =>
            vendasFiltradas.reduce((acc, v) => {
                const vRef = v.veiculo || veiculos.find((x) => x.id === v.veiculoId);
                return acc + (vRef ? vRef.valorAquisicao : v.custoTotal);
            }, 0),
        [vendasFiltradas, veiculos]
    );

    const despesasVendido = useMemo(
        () =>
            vendasFiltradas.reduce((acc, v) => {
                const vRef = v.veiculo || veiculos.find((x) => x.id === v.veiculoId);
                const desp = (vRef?.despesas || []).reduce((a, b) => a + b.valor, 0);
                return acc + desp;
            }, 0),
        [vendasFiltradas, veiculos]
    );

    const ticketMedioVenda = vendasFiltradas.length > 0 ? faturamentoTotal / vendasFiltradas.length : 0;
    const lucroMedioPorVenda = vendasFiltradas.length > 0 ? lucroLiquidoRealizado / vendasFiltradas.length : 0;

    // Dados do Estoque Atual
    const veiculosDisponiveis = useMemo(
        () => veiculos.filter((v) => v.status === "DISPONIVEL"),
        [veiculos]
    );
    const veiculosEmPreparacao = useMemo(
        () => veiculos.filter((v) => v.status === "PREPARACAO"),
        [veiculos]
    );
    const veiculosReservados = useMemo(
        () => veiculos.filter((v) => v.status === "RESERVADO"),
        [veiculos]
    );
    const veiculosVendidos = useMemo(
        () => veiculos.filter((v) => v.status === "VENDIDO"),
        [veiculos]
    );

    const capitalEstoque = useMemo(
        () => veiculosDisponiveis.reduce((acc, v) => acc + (v.custoTotal || v.valorAquisicao), 0),
        [veiculosDisponiveis]
    );
    const valorAnunciadoTotal = useMemo(
        () => veiculosDisponiveis.reduce((acc, v) => acc + v.precoAnunciado, 0),
        [veiculosDisponiveis]
    );
    const lucroPotencialPatio = valorAnunciadoTotal - capitalEstoque;

    // Média de dias que os carros disponíveis estão no pátio
    const mediaDiasPatio = useMemo(() => {
        if (veiculosDisponiveis.length === 0) return 0;
        const hoje = Date.now();
        const somaDias = veiculosDisponiveis.reduce((acc, v) => {
            const entrada = new Date(v.dataEntrada + "T00:00:00").getTime();
            const diff = isNaN(entrada) ? 0 : Math.max(0, Math.floor((hoje - entrada) / (1000 * 60 * 60 * 24)));
            return acc + diff;
        }, 0);
        return Math.round(somaDias / veiculosDisponiveis.length);
    }, [veiculosDisponiveis]);

    // Gráfico 1: Vendas e Lucro por Mês (Baseado no Lucro Realizado em Caixa)
    const dadosMensais = useMemo(() => {
        const mapa = new Map<string, { label: string; receita: number; custo: number; lucro: number; lucroPendente: number; qtd: number; ordem: number }>();

        vendasFiltradas.forEach((v) => {
            const d = new Date(v.dataVenda + "T00:00:00");
            if (isNaN(d.getTime())) return;
            const ano = d.getFullYear();
            const mes = d.getMonth();
            const chave = `${ano}-${String(mes + 1).padStart(2, "0")}`;
            const label = `${MESES_CURTOS[mes]}/${String(ano).slice(-2)}`;
            const fin = calcularFinanceiroVenda(v);
            const atual = mapa.get(chave) || { label, receita: 0, custo: 0, lucro: 0, lucroPendente: 0, qtd: 0, ordem: ano * 100 + mes };
            atual.receita += fin.valorRecebido;
            atual.custo += fin.custoTotal;
            atual.lucro += fin.lucroRealizado;
            atual.lucroPendente += fin.lucroPendente;
            atual.qtd += 1;
            mapa.set(chave, atual);
        });

        return Array.from(mapa.values()).sort((a, b) => a.ordem - b.ordem);
    }, [vendasFiltradas]);

    const maxValorMensal = useMemo(() => {
        if (dadosMensais.length === 0) return 1;
        return Math.max(...dadosMensais.map((d) => Math.max(d.receita, d.custo)), 1);
    }, [dadosMensais]);

    // Gráfico 2: Como os Clientes Pagaram
    const vendasPorPagamento = useMemo(() => {
        const agrupado: Record<string, { valor: number; qtd: number }> = {};
        vendasFiltradas.forEach((v) => {
            if (!agrupado[v.formaPagamento]) {
                agrupado[v.formaPagamento] = { valor: 0, qtd: 0 };
            }
            agrupado[v.formaPagamento].valor += v.valorVenda;
            agrupado[v.formaPagamento].qtd += 1;
        });

        return Object.entries(agrupado)
            .map(([forma, info]) => ({
                forma,
                label: FORMA_PAGAMENTO_LABELS[forma]?.label || forma,
                color: FORMA_PAGAMENTO_LABELS[forma]?.color || "text-zinc-700",
                bar: FORMA_PAGAMENTO_LABELS[forma]?.bar || "bg-zinc-500",
                stroke: FORMA_PAGAMENTO_LABELS[forma]?.stroke || "#71717a",
                valor: info.valor,
                qtd: info.qtd,
                percentual: faturamentoTotal > 0 ? (info.valor / faturamentoTotal) * 100 : 0,
            }))
            .sort((a, b) => b.valor - a.valor);
    }, [vendasFiltradas, faturamentoTotal]);

    // Gráfico 3: Carros por Tipo no Estoque Ativo (exclui vendidos e devolvidos)
    const estoquePorCategoria = useMemo(() => {
        const agrupado: Record<string, { qtd: number; capital: number }> = {};
        veiculos
            .filter((v) => v.status !== "VENDIDO" && v.status !== "DEVOLVIDO")
            .forEach((v) => {
                const cat = v.categoria || "Outros";
                if (!agrupado[cat]) {
                    agrupado[cat] = { qtd: 0, capital: 0 };
                }
                agrupado[cat].qtd += 1;
                agrupado[cat].capital += v.custoTotal || v.valorAquisicao;
            });

        const totalCapitalGeral = Object.values(agrupado).reduce((a, b) => a + b.capital, 0);

        return Object.entries(agrupado)
            .map(([categoria, info]) => ({
                categoria,
                ...info,
                percentualCapital: totalCapitalGeral > 0 ? (info.capital / totalCapitalGeral) * 100 : 0,
            }))
            .sort((a, b) => b.capital - a.capital);
    }, [veiculos]);

    // Gráfico 4: Onde Foi Gasto na Oficina (filtrado pelo período selecionado)
    const todasDespesas = useMemo(() => {
        const todas = veiculos.flatMap((v) => v.despesas || []);
        return todas.filter((d) => {
            if (periodo === "TODOS") return true;
            const dataD = new Date(d.dataDespesa + "T00:00:00");
            if (isNaN(dataD.getTime())) return true;
            const hoje = new Date();

            if (periodo === "MES_ATUAL") {
                return dataD.getMonth() === hoje.getMonth() && dataD.getFullYear() === hoje.getFullYear();
            }
            if (periodo === "ANO_ATUAL") {
                return dataD.getFullYear() === hoje.getFullYear();
            }
            if (periodo === "PERSONALIZADO") {
                if (dataInicioCustom && dataD < new Date(dataInicioCustom + "T00:00:00")) return false;
                if (dataFimCustom && dataD > new Date(dataFimCustom + "T23:59:59")) return false;
                return true;
            }
            return true;
        });
    }, [veiculos, periodo, dataInicioCustom, dataFimCustom]);

    const totalGeralDespesas = useMemo(() => todasDespesas.reduce((acc, d) => acc + d.valor, 0), [todasDespesas]);

    const despesasPorCategoria = useMemo(() => {
        const agrupado: Record<string, { valor: number; qtd: number }> = {};
        todasDespesas.forEach((d) => {
            if (!agrupado[d.tipoDespesa]) {
                agrupado[d.tipoDespesa] = { valor: 0, qtd: 0 };
            }
            agrupado[d.tipoDespesa].valor += d.valor;
            agrupado[d.tipoDespesa].qtd += 1;
        });

        return Object.entries(agrupado)
            .map(([categoria, info]) => ({
                categoria,
                nomeAmigavel: CATEGORIA_DESPESA_NOMES[categoria] || categoria,
                valor: info.valor,
                qtd: info.qtd,
                percentual: totalGeralDespesas > 0 ? (info.valor / totalGeralDespesas) * 100 : 0,
                barColor: CATEGORIA_DESPESA_COLORS[categoria] || "bg-amber-500",
            }))
            .sort((a, b) => b.valor - a.valor);
    }, [todasDespesas, totalGeralDespesas]);

    // Configuração do gráfico redondo (Donut)
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return (
        <div className="space-y-5">
            {/* Cabeçalho Simples */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06]">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                    Relatórios
                </h2>
            </div>

            {/* Filtro de Período */}
            <div className="space-y-2.5">
                <div className="flex items-center gap-1 bg-[#e5e5ea] p-1 rounded-2xl w-fit overflow-x-auto scrollbar-none">
                    <button
                        onClick={() => setPeriodo("TODOS")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${periodo === "TODOS" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-950"
                            }`}
                    >
                        Tudo
                    </button>
                    <button
                        onClick={() => setPeriodo("MES_ATUAL")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${periodo === "MES_ATUAL" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-950"
                            }`}
                    >
                        Este Mês
                    </button>
                    <button
                        onClick={() => setPeriodo("ANO_ATUAL")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${periodo === "ANO_ATUAL" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-950"
                            }`}
                    >
                        Este Ano ({anoAtual})
                    </button>
                    <button
                        onClick={() => setPeriodo("PERSONALIZADO")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${periodo === "PERSONALIZADO" ? "bg-white text-emerald-700 shadow-xs" : "text-zinc-600 hover:text-zinc-950"
                            }`}
                    >
                        <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Escolher Datas</span>
                    </button>
                </div>

                {periodo === "PERSONALIZADO" && (
                    <div className="bg-white border border-black/[0.06] rounded-2xl p-3 flex flex-wrap items-center gap-3 animate-in fade-in shadow-xs w-fit">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-500 font-medium">De:</span>
                            <input
                                type="date"
                                value={dataInicioCustom}
                                onChange={(e) => setDataInicioCustom(e.target.value)}
                                className="bg-[#f2f2f7] border border-black/[0.08] focus:border-emerald-500 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none shadow-xs"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-500 font-medium">Até:</span>
                            <input
                                type="date"
                                value={dataFimCustom}
                                onChange={(e) => setDataFimCustom(e.target.value)}
                                className="bg-[#f2f2f7] border border-black/[0.08] focus:border-emerald-500 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none shadow-xs"
                            />
                        </div>
                        {(dataInicioCustom || dataFimCustom) && (
                            <button
                                onClick={() => {
                                    setDataInicioCustom("");
                                    setDataFimCustom("");
                                }}
                                className="text-xs text-zinc-500 hover:text-zinc-900 underline"
                            >
                                Limpar datas
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* 1. Resumo das Vendas */}
            <div className="bg-white border border-black/[0.06] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 flex items-center gap-2 pb-2 border-b border-black/[0.06]">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Resumo das Vendas
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-center">
                    <div className="bg-[#f2f2f7]/60 p-3.5 rounded-2xl border border-black/[0.04]">
                        <span className="text-xs text-zinc-500 block mb-1 font-medium">Total Vendido</span>
                        <strong className="text-lg font-bold text-zinc-900 block">{formatCurrency(faturamentoTotal)}</strong>
                        <span className="text-[11px] text-zinc-500 block">
                            {saldoTotalAReceber > 0 ? (
                                <>
                                    <span className="text-emerald-700 font-semibold">{formatCurrency(faturamentoRecebido)}</span> em caixa
                                    <span className="text-amber-700 font-semibold"> • {formatCurrency(saldoTotalAReceber)}</span> a prazo
                                </>
                            ) : (
                                `${vendasFiltradas.length} venda(s) (100% recebido)`
                            )}
                        </span>
                    </div>

                    <div className="bg-[#f2f2f7]/60 p-3.5 rounded-2xl border border-black/[0.04]">
                        <span className="text-xs text-zinc-500 block mb-1 font-medium">Valor Pago na Compra</span>
                        <strong className="text-lg font-bold text-zinc-700 block">{formatCurrency(custoAquisicaoVendido)}</strong>
                        <span className="text-[11px] text-zinc-500">Quanto custou comprar</span>
                    </div>

                    <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/50">
                        <span className="text-xs text-amber-700 block mb-1 font-medium">Gastos com Oficina</span>
                        <strong className="text-lg font-bold text-amber-700 block">{formatCurrency(despesasVendido)}</strong>
                        <span className="text-[11px] text-zinc-500">Consertos dos vendidos</span>
                    </div>

                    <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/50">
                        <span className="text-xs text-emerald-800 block mb-1 font-medium">Lucro Realizado (em Caixa)</span>
                        <strong className={`text-lg font-bold block ${lucroLiquidoRealizado >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                            {lucroLiquidoRealizado >= 0 ? "+" : ""}{formatCurrency(lucroLiquidoRealizado)}
                        </strong>
                        <span className="text-[11px] text-zinc-600 block">
                            {lucroPendente > 0 ? (
                                <>
                                    <strong className="text-amber-800">+{formatCurrency(lucroPendente)}</strong> a prazo pendente
                                </>
                            ) : (
                                "100% recebido em caixa"
                            )}
                        </span>
                    </div>
                </div>

                {/* Barra Visual Simples: Para onde foi o dinheiro das vendas */}
                {faturamentoTotal > 0 && (
                    <div className="pt-2 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 flex-wrap gap-2">
                            <span className="font-medium">Divisão do valor vendido:</span>
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 inline-block" />
                                    Compra ({((custoAquisicaoVendido / faturamentoTotal) * 100).toFixed(0)}%)
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                                    Oficina ({((despesasVendido / faturamentoTotal) * 100).toFixed(0)}%)
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                    Lucro Realizado ({Math.max(0, (lucroLiquidoRealizado / faturamentoTotal) * 100).toFixed(0)}%)
                                </span>
                                {saldoTotalAReceber > 0 && (
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                                        A Receber a Prazo ({Math.max(0, (saldoTotalAReceber / faturamentoTotal) * 100).toFixed(0)}%)
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="w-full h-3 rounded-full bg-zinc-100 overflow-hidden flex border border-black/[0.04]">
                            <div
                                style={{ width: `${Math.min(100, Math.max(0, (custoAquisicaoVendido / faturamentoTotal) * 100))}%` }}
                                className="bg-zinc-500 h-full transition-all"
                            />
                            <div
                                style={{ width: `${Math.min(100, Math.max(0, (despesasVendido / faturamentoTotal) * 100))}%` }}
                                className="bg-amber-500 h-full transition-all"
                            />
                            <div
                                style={{ width: `${Math.min(100, Math.max(0, (lucroLiquidoRealizado / faturamentoTotal) * 100))}%` }}
                                className="bg-emerald-500 h-full transition-all"
                            />
                            {saldoTotalAReceber > 0 && (
                                <div
                                    style={{ width: `${Math.min(100, Math.max(0, (saldoTotalAReceber / faturamentoTotal) * 100))}%` }}
                                    className="bg-amber-400 h-full transition-all"
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Quatro Indicadores Rápidos */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between text-zinc-500 mb-1.5">
                        <span className="text-xs font-medium">Média por Venda</span>
                        <Wallet className="w-4 h-4 text-blue-600" />
                    </div>
                    <strong className="text-lg sm:text-xl font-bold text-zinc-950 block">
                        {formatCurrency(ticketMedioVenda)}
                    </strong>
                    <span className="text-[11px] text-zinc-400">Preço médio de cada venda</span>
                </div>

                <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between text-zinc-500 mb-1.5">
                        <span className="text-xs font-medium">Lucro Médio por Carro</span>
                        <Award className="w-4 h-4 text-emerald-600" />
                    </div>
                    <strong className={`text-lg sm:text-xl font-bold block ${lucroMedioPorVenda >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {lucroMedioPorVenda >= 0 ? "+" : ""}{formatCurrency(lucroMedioPorVenda)}
                    </strong>
                    <span className="text-[11px] text-zinc-400">Ganho médio em cada venda</span>
                </div>

                <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between text-zinc-500 mb-1.5">
                        <span className="text-xs font-medium">Tempo no Pátio</span>
                        <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <strong className="text-lg sm:text-xl font-bold text-zinc-950 block">
                        {mediaDiasPatio} {mediaDiasPatio === 1 ? "dia" : "dias"}
                    </strong>
                    <span className="text-[11px] text-zinc-400">Média dos carros em estoque</span>
                </div>

                <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between text-zinc-500 mb-1.5">
                        <span className="text-xs font-medium">Lucro Esperado do Pátio</span>
                        <Activity className="w-4 h-4 text-emerald-600" />
                    </div>
                    <strong className={`text-lg sm:text-xl font-bold block ${lucroPotencialPatio >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                        {lucroPotencialPatio >= 0 ? "+" : ""}{formatCurrency(lucroPotencialPatio)}
                    </strong>
                    <span className="text-[11px] text-zinc-400">Se vender todo o estoque atual</span>
                </div>
            </div>

            {/* 3. Gráficos Visuais: Vendas por Mês + Formas de Pagamento */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Gráfico de Barras: Vendas e Lucro por Mês */}
                <div className="lg:col-span-2 bg-white border border-black/[0.06] rounded-3xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/[0.05]">
                        <h4 className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-emerald-600" />
                            Vendas e Lucro por Mês
                        </h4>

                        <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-600">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" /> Total Vendido
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-xs bg-zinc-300 inline-block" /> Gasto Total
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> Lucro
                            </span>
                        </div>
                    </div>

                    {dadosMensais.length === 0 ? (
                        <div className="py-12 text-center text-zinc-400 text-xs">
                            Nenhuma venda registrada neste período.
                        </div>
                    ) : (
                        <div className="pt-4 pb-1">
                            <div className="h-52 flex items-end gap-3 sm:gap-5 overflow-x-auto pb-2 px-1 border-b border-zinc-100">
                                {dadosMensais.map((item) => {
                                    const altReceita = Math.max(6, Math.round((item.receita / maxValorMensal) * 165));
                                    const altCusto = Math.max(6, Math.round((item.custo / maxValorMensal) * 165));
                                    const altLucro = Math.max(6, Math.round((Math.max(0, item.lucro) / maxValorMensal) * 165));

                                    return (
                                        <div key={item.label} className="flex-1 min-w-[68px] flex flex-col items-center gap-2 group">
                                            <div className={`text-[10px] font-semibold whitespace-nowrap ${item.lucro >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                                {item.lucro >= 0 ? "+" : ""}{formatCurrency(item.lucro)}
                                            </div>

                                            <div className="w-full flex items-end justify-center gap-1.5 h-[165px]">
                                                <div
                                                    style={{ height: `${altReceita}px` }}
                                                    title={`Vendido (${item.label}): ${formatCurrency(item.receita)}`}
                                                    className="w-3.5 sm:w-4 rounded-t-md bg-blue-500 transition-all"
                                                />
                                                <div
                                                    style={{ height: `${altCusto}px` }}
                                                    title={`Gasto (${item.label}): ${formatCurrency(item.custo)}`}
                                                    className="w-3.5 sm:w-4 rounded-t-md bg-zinc-300 transition-all"
                                                />
                                                <div
                                                    style={{ height: `${altLucro}px` }}
                                                    title={`Lucro (${item.label}): ${formatCurrency(item.lucro)}`}
                                                    className="w-3.5 sm:w-4 rounded-t-md bg-emerald-500 transition-all"
                                                />
                                            </div>

                                            <div className="text-center">
                                                <span className="text-[11px] font-bold text-zinc-800 block">{item.label}</span>
                                                <span className="text-[10px] text-zinc-400">{item.qtd} venda(s)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Gráfico Redondo: Como os Clientes Pagaram */}
                <div className="bg-white border border-black/[0.06] rounded-3xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
                    <div className="pb-2 border-b border-black/[0.05]">
                        <h4 className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-blue-600" />
                            Formas de Pagamento
                        </h4>
                    </div>

                    {vendasPorPagamento.length === 0 ? (
                        <div className="py-12 text-center text-zinc-400 text-xs">
                            Nenhuma venda registrada neste período.
                        </div>
                    ) : (
                        <div className="space-y-4 my-auto">
                            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r={radius}
                                        fill="transparent"
                                        stroke="#f4f4f5"
                                        strokeWidth="16"
                                    />
                                    {vendasPorPagamento.map((item) => {
                                        const strokeDasharray = `${(item.percentual / 100) * circumference} ${circumference}`;
                                        const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                                        accumulatedPercent += item.percentual;

                                        return (
                                            <circle
                                                key={item.forma}
                                                cx="64"
                                                cy="64"
                                                r={radius}
                                                fill="transparent"
                                                stroke={item.stroke}
                                                strokeWidth="16"
                                                strokeDasharray={strokeDasharray}
                                                strokeDashoffset={strokeDashoffset}
                                                className="transition-all duration-300"
                                            >
                                                <title>{`${item.label}: ${formatCurrency(item.valor)} (${item.percentual.toFixed(0)}%)`}</title>
                                            </circle>
                                        );
                                    })}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                                    <span className="text-[10px] text-zinc-400 font-medium">Vendas</span>
                                    <strong className="text-sm font-bold text-zinc-900">{vendasFiltradas.length}</strong>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs">
                                {vendasPorPagamento.map((item) => (
                                    <div key={item.forma} className="flex items-center justify-between p-2 rounded-xl bg-[#f2f2f7]/60">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.bar}`} />
                                            <span className="font-medium text-zinc-800 truncate">{item.label}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <strong className="text-zinc-900 font-semibold">{formatCurrency(item.valor)}</strong>
                                            <span className="text-[10px] text-zinc-500 ml-1">({item.percentual.toFixed(0)}%)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Resumo do Pátio e Gastos de Oficina */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Situação do Pátio */}
                <div className="bg-white border border-black/[0.06] rounded-3xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-black/[0.05]">
                        <h4 className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-emerald-600" />
                            Situação do Estoque
                        </h4>
                        <span className="text-xs text-zinc-500 font-medium">{veiculos.length} no total</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60">
                            <strong className="text-sm font-bold text-emerald-700 block">{veiculosDisponiveis.length}</strong>
                            <span className="text-[10px] text-emerald-800 font-medium">À Venda</span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/60">
                            <strong className="text-sm font-bold text-amber-700 block">{veiculosEmPreparacao.length}</strong>
                            <span className="text-[10px] text-amber-800 font-medium">Na Oficina</span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-blue-50/70 border border-blue-200/60">
                            <strong className="text-sm font-bold text-blue-700 block">{veiculosReservados.length}</strong>
                            <span className="text-[10px] text-blue-800 font-medium">Reservados</span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-zinc-100 border border-zinc-200/80">
                            <strong className="text-sm font-bold text-zinc-700 block">{veiculosVendidos.length}</strong>
                            <span className="text-[10px] text-zinc-600 font-medium">Vendidos</span>
                        </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
                        <span className="text-xs font-semibold text-zinc-600 block">
                            Valor Investido por Tipo de Veículo
                        </span>

                        {estoquePorCategoria.length === 0 ? (
                            <p className="text-zinc-400 text-xs py-4 text-center">Nenhum veículo cadastrado no estoque.</p>
                        ) : (
                            estoquePorCategoria.map((cat) => (
                                <div key={cat.categoria} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium text-zinc-800">
                                            {cat.categoria} <span className="text-zinc-400 text-[11px]">({cat.qtd})</span>
                                        </span>
                                        <span className="font-semibold text-zinc-900">
                                            {formatCurrency(cat.capital)}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                                        <div
                                            style={{ width: `${Math.max(4, cat.percentualCapital)}%` }}
                                            className="h-full bg-emerald-500 rounded-full transition-all"
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="pt-2 border-t border-black/[0.05] flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Dinheiro Investido nos Disponíveis:</span>
                        <strong className="text-zinc-950 font-bold">{formatCurrency(capitalEstoque)}</strong>
                    </div>
                </div>

                {/* Gastos de Oficina */}
                <div className="bg-white border border-black/[0.06] rounded-3xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-2 border-b border-black/[0.05]">
                            <h4 className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-amber-600" />
                                Gasto na Oficina
                            </h4>
                            <span className="text-xs font-bold text-amber-700">{formatCurrency(totalGeralDespesas)}</span>
                        </div>

                        <div className="space-y-3 mt-4">
                            {despesasPorCategoria.length === 0 ? (
                                <p className="text-zinc-400 text-xs py-8 text-center">Nenhum gasto de oficina lançado ainda.</p>
                            ) : (
                                despesasPorCategoria.map((item) => (
                                    <div key={item.categoria} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-zinc-700 font-medium">
                                                {item.nomeAmigavel}
                                            </span>
                                            <span className="text-zinc-900 font-semibold">
                                                {formatCurrency(item.valor)}{" "}
                                                <span className="text-[10px] text-zinc-500">({item.percentual.toFixed(0)}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                                            <div
                                                style={{ width: `${Math.max(4, item.percentual)}%` }}
                                                className={`h-full rounded-full transition-all ${item.barColor}`}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-black/[0.05] flex items-center justify-between text-xs text-zinc-500">
                        <span>Total de serviços lançados:</span>
                        <strong className="text-zinc-800">{todasDespesas.length}</strong>
                    </div>
                </div>
            </div>

            {/* 5. Lista Simples de Carros Vendidos */}
            <div className="bg-white border border-black/[0.06] rounded-3xl overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/70">
                    <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-semibold text-sm text-zinc-900">
                            Carros Vendidos ({vendasFiltradas.length})
                        </h4>
                    </div>
                </div>

                {vendasFiltradas.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 text-xs">
                        Nenhuma venda registrada neste período.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-zinc-100 text-[11px] text-zinc-500 bg-zinc-50/40">
                                    <th className="py-3 px-4 font-semibold">Data</th>
                                    <th className="py-3 px-4 font-semibold">Veículo</th>
                                    <th className="py-3 px-4 font-semibold">Comprador</th>
                                    <th className="py-3 px-4 font-semibold">Pagamento</th>
                                    <th className="py-3 px-4 font-semibold text-right">Custo Total</th>
                                    <th className="py-3 px-4 font-semibold text-right">Vendido Por</th>
                                    <th className="py-3 px-4 font-semibold text-right">Recebido em Caixa</th>
                                    <th className="py-3 px-4 font-semibold text-right">A Receber</th>
                                    <th className="py-3 px-4 font-semibold text-right">Lucro Realizado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {vendasFiltradas.map((v) => {
                                    const vRef = v.veiculo || veiculos.find((x) => x.id === v.veiculoId);
                                    const pgtoLabel = FORMA_PAGAMENTO_LABELS[v.formaPagamento]?.label || v.formaPagamento;
                                    const fin = calcularFinanceiroVenda(v);

                                    return (
                                        <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors">
                                            <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">{formatDate(v.dataVenda)}</td>
                                            <td className="py-3 px-4 font-semibold text-zinc-900">
                                                {vRef ? `${vRef.marca} ${vRef.modelo}` : "Veículo"}
                                                {vRef?.placa && (
                                                    <span className="ml-1.5 text-[10px] font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">
                                                        {vRef.placa}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-zinc-700">{v.cliente?.nome || "-"}</td>
                                            <td className="py-3 px-4">
                                                <span className="text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md font-medium">
                                                    {pgtoLabel}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right text-zinc-600 font-medium">
                                                {formatCurrency(v.custoTotal)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-zinc-950 font-bold">
                                                {formatCurrency(v.valorVenda)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-emerald-700 font-semibold">
                                                {formatCurrency(fin.valorRecebido)}
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium">
                                                {fin.saldoPendente > 0 ? (
                                                    <span className="text-amber-800 font-bold">{formatCurrency(fin.saldoPendente)}</span>
                                                ) : (
                                                    <span className="text-zinc-400">R$ 0,00</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className={`font-bold ${fin.lucroRealizado >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                                    {fin.lucroRealizado >= 0 ? "+" : ""}{formatCurrency(fin.lucroRealizado)}
                                                </div>
                                                {fin.lucroPendente > 0 && (
                                                    <div className="text-[10px] text-amber-800 font-semibold">
                                                        +{formatCurrency(fin.lucroPendente)} a prazo
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
