"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Venda, ParcelaReceber, AbatimentoReceber } from "@/types";
import {
  formatCurrency,
  formatDate,
  getLocalISODate,
  formatCurrencyInput,
  parseCurrencyInput,
  formatPhone,
} from "@/lib/utils";
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Plus,
  Trash2,
  Save,
  X,
  User,
  Car,
  Coins,
  FileText,
  Clock,
  RotateCcw,
} from "lucide-react";
import { calcularFinanceiroVenda } from "@/lib/financial";

export function calcularResumoCadernoVenda(venda: Venda) {
  const fin = calcularFinanceiroVenda(venda);
  return {
    temCaderno: fin.temCaderno,
    dividaInicial: fin.dividaInicial,
    totalAbatido: fin.totalAbatido,
    saldoRestante: fin.saldoPendente,
    quitado: fin.quitado,
    parcelasVencidas: fin.parcelasVencidas,
    proximaParcela: fin.proximaParcela,
    valorRecebido: fin.valorRecebido,
    lucroRealizado: fin.lucroRealizado,
    lucroPendente: fin.lucroPendente,
    lucroProjetado: fin.lucroProjetado,
  };
}

function addMonthsToISODate(isoDate: string, monthsToAdd: number): string {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3) return isoDate;
  const d = new Date(parts[0], parts[1] - 1 + monthsToAdd, parts[2], 12, 0, 0);
  return getLocalISODate(d);
}

interface CadernoViewProps {
  clienteFiltroInicialId?: string | null;
  onClearClienteFiltro?: () => void;
}

export function CadernoView({ clienteFiltroInicialId, onClearClienteFiltro }: CadernoViewProps) {
  const { vendas, clientes, veiculos, updateVenda } = useApp();

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"ABERTOS" | "VENCIDOS" | "QUITADOS" | "TODOS">("ABERTOS");
  const [vendaSelecionadaId, setVendaSelecionadaId] = useState<string | null>(null);

  // Modal para vincular uma venda existente ao Caderno
  const [modalVincularAberto, setModalVincularAberto] = useState(false);
  const [vendaParaVincularId, setVendaParaVincularId] = useState("");
  const [saldoInicialVincular, setSaldoInicialVincular] = useState(0);
  const [qtdParcelasVincular, setQtdParcelasVincular] = useState<number | "">(6);
  const [vencimentoVincular, setVencimentoVincular] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return getLocalISODate(d);
  });

  // Estado do Modal de Detalhes do Caderno (Híbrido: Parcelas + Abatimentos + Anotações)
  const [abaDetalhe, setAbaDetalhe] = useState<"PARCELAS" | "ABATIMENTOS" | "ANOTACOES">("PARCELAS");
  const [valorAbatimento, setValorAbatimento] = useState<number>(0);
  const [dataAbatimento, setDataAbatimento] = useState<string>(getLocalISODate());
  const [obsAbatimento, setObsAbatimento] = useState<string>("");
  const [anotacaoTexto, setAnotacaoTexto] = useState<string>("");
  const [anotacaoSalvaFeedback, setAnotacaoSalvaFeedback] = useState(false);

  // Gerador rápido de parcelas dentro do detalhe
  const [novaQtdParcelas, setNovaQtdParcelas] = useState<number | "">(6);
  const [novoPrimeiroVenc, setNovoPrimeiroVenc] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return getLocalISODate(d);
  });

  // Se veio redirecionado da tela de Clientes, filtra pelo cliente ou abre direto o caderno dele
  useEffect(() => {
    if (clienteFiltroInicialId) {
      const cl = clientes.find((c) => c.id === clienteFiltroInicialId);
      if (cl) {
        setBusca(cl.nome);
        setFiltroStatus("TODOS");
      }
      const vendasDoCliente = vendas.filter(
        (v) => v.clienteId === clienteFiltroInicialId && calcularResumoCadernoVenda(v).temCaderno
      );
      if (vendasDoCliente.length === 1) {
        setVendaSelecionadaId(vendasDoCliente[0].id);
      }
    }
  }, [clienteFiltroInicialId, clientes, vendas]);

  const registrosCaderno = useMemo(() => {
    return vendas
      .map((venda) => {
        const cliente = clientes.find((c) => c.id === venda.clienteId) || venda.cliente;
        const veiculo = veiculos.find((v) => v.id === venda.veiculoId) || venda.veiculo;
        const resumo = calcularResumoCadernoVenda(venda);
        return {
          venda,
          cliente,
          veiculo,
          resumo,
        };
      })
      .filter((item) => item.resumo.temCaderno);
  }, [vendas, clientes, veiculos]);

  const registrosFiltrados = useMemo(() => {
    return registrosCaderno.filter(({ venda, cliente, veiculo, resumo }) => {
      if (filtroStatus === "ABERTOS" && resumo.quitado) return false;
      if (filtroStatus === "VENCIDOS" && (resumo.quitado || resumo.parcelasVencidas.length === 0)) return false;
      if (filtroStatus === "QUITADOS" && !resumo.quitado) return false;

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const nomeCliente = (cliente?.nome || "").toLowerCase();
        const cpfCliente = (cliente?.cpfCnpj || "").toLowerCase();
        const descVeiculo = `${veiculo?.marca || ""} ${veiculo?.modelo || ""} ${veiculo?.placa || ""}`.toLowerCase();
        const anotacao = (venda.anotacoesCaderno || "").toLowerCase();
        return (
          nomeCliente.includes(termo) ||
          cpfCliente.includes(termo) ||
          descVeiculo.includes(termo) ||
          anotacao.includes(termo)
        );
      }
      return true;
    });
  }, [registrosCaderno, filtroStatus, busca]);

  // KPIs Gerais do Caderno
  const kpis = useMemo(() => {
    let totalAReceber = 0;
    let totalRecebido = 0;
    let totalVencido = 0;
    const clientesDevendoSet = new Set<string>();

    registrosCaderno.forEach(({ venda, resumo }) => {
      totalAReceber += resumo.saldoRestante;
      totalRecebido += resumo.totalAbatido;
      if (!resumo.quitado) {
        clientesDevendoSet.add(venda.clienteId);
        resumo.parcelasVencidas.forEach((p) => {
          totalVencido += p.valor;
        });
      }
    });

    return {
      totalAReceber,
      totalRecebido,
      totalVencido: Math.min(totalVencido, totalAReceber),
      clientesDevendo: clientesDevendoSet.size,
    };
  }, [registrosCaderno]);

  const itemSelecionado = useMemo(
    () => registrosCaderno.find((r) => r.venda.id === vendaSelecionadaId) || null,
    [registrosCaderno, vendaSelecionadaId]
  );

  useEffect(() => {
    if (itemSelecionado) {
      setAnotacaoTexto(itemSelecionado.venda.anotacoesCaderno || "");
      setDataAbatimento(getLocalISODate());
      setValorAbatimento(0);
      setObsAbatimento("");
    }
  }, [itemSelecionado?.venda.id]);

  // Dar baixa ou estornar uma parcela prevista
  const handleToggleParcelaPaga = (parcela: ParcelaReceber) => {
    if (!itemSelecionado) return;
    const { venda } = itemSelecionado;
    const hoje = getLocalISODate();

    if (!parcela.pago) {
      // Marca como paga e adiciona um abatimento vinculado à parcela
      const novasParcelas = (venda.parcelas || []).map((p) =>
        p.id === parcela.id ? { ...p, pago: true, dataPagamento: hoje } : p
      );
      const novoAbatimento: AbatimentoReceber = {
        id: `abat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        valor: parcela.valor,
        data: hoje,
        observacao: `Baixa da Parcela ${parcela.numero}/${(venda.parcelas || []).length}`,
        parcelaId: parcela.id,
      };
      updateVenda(venda.id, {
        parcelas: novasParcelas,
        abatimentos: [novoAbatimento, ...(venda.abatimentos || [])],
      });
    } else {
      // Estorna a baixa da parcela e remove o abatimento vinculado
      const novasParcelas = (venda.parcelas || []).map((p) =>
        p.id === parcela.id ? { ...p, pago: false, dataPagamento: undefined } : p
      );
      const novosAbatimentos = (venda.abatimentos || []).filter((a) => a.parcelaId !== parcela.id);
      updateVenda(venda.id, {
        parcelas: novasParcelas,
        abatimentos: novosAbatimentos,
      });
    }
  };

  // Lançar um abatimento parcial ou avulso livre
  const handleAdicionarAbatimento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSelecionado || valorAbatimento <= 0) return;
    const { venda } = itemSelecionado;

    const novoAbatimento: AbatimentoReceber = {
      id: `abat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      valor: valorAbatimento,
      data: dataAbatimento || getLocalISODate(),
      observacao: obsAbatimento.trim() || "Abatimento avulso",
    };

    const novosAbatimentos = [novoAbatimento, ...(venda.abatimentos || [])];
    const totalPagoDepois = novosAbatimentos.reduce((acc, a) => acc + Number(a.valor || 0), 0);
    const dividaInicial = itemSelecionado.resumo.dividaInicial;

    // Se quitou 100% da dívida com esse abatimento, marca todas as parcelas como pagas
    let novasParcelas = venda.parcelas;
    if (totalPagoDepois >= dividaInicial - 0.01 && novasParcelas && novasParcelas.length > 0) {
      novasParcelas = novasParcelas.map((p) =>
        p.pago ? p : { ...p, pago: true, dataPagamento: dataAbatimento || getLocalISODate() }
      );
    }

    updateVenda(venda.id, {
      abatimentos: novosAbatimentos,
      parcelas: novasParcelas,
    });

    setValorAbatimento(0);
    setObsAbatimento("");
  };

  const handleExcluirAbatimento = (abatimento: AbatimentoReceber) => {
    if (!itemSelecionado) return;
    const { venda } = itemSelecionado;
    const novosAbatimentos = (venda.abatimentos || []).filter((a) => a.id !== abatimento.id);
    let novasParcelas = venda.parcelas;
    if (abatimento.parcelaId && novasParcelas) {
      novasParcelas = novasParcelas.map((p) =>
        p.id === abatimento.parcelaId ? { ...p, pago: false, dataPagamento: undefined } : p
      );
    }
    updateVenda(venda.id, {
      abatimentos: novosAbatimentos,
      parcelas: novasParcelas,
    });
  };

  const handleSalvarAnotacao = () => {
    if (!itemSelecionado) return;
    updateVenda(itemSelecionado.venda.id, {
      anotacoesCaderno: anotacaoTexto,
    });
    setAnotacaoSalvaFeedback(true);
    setTimeout(() => setAnotacaoSalvaFeedback(false), 2500);
  };

  const handleRegerarParcelas = () => {
    if (!itemSelecionado) return;
    const { venda, resumo } = itemSelecionado;
    const saldoParaParcelar = resumo.saldoRestante > 0 ? resumo.saldoRestante : resumo.dividaInicial;
    if (saldoParaParcelar <= 0) return;

    const qtd = Math.max(1, Math.min(120, Math.floor(Number(novaQtdParcelas) || 1)));
    const totalCentavos = Math.round(saldoParaParcelar * 100);
    const baseCentavos = Math.floor(totalCentavos / qtd);
    const restoCentavos = totalCentavos - baseCentavos * qtd;

    const novasParcelas: ParcelaReceber[] = Array.from({ length: qtd }, (_, idx) => {
      const centavos = idx === qtd - 1 ? baseCentavos + restoCentavos : baseCentavos;
      return {
        id: `parc-${Date.now()}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
        numero: idx + 1,
        valor: centavos / 100,
        dataVencimento: addMonthsToISODate(novoPrimeiroVenc || getLocalISODate(), idx),
        pago: false,
      };
    });

    updateVenda(venda.id, {
      parcelas: novasParcelas,
    });
  };

  const vendasSemCaderno = useMemo(
    () => vendas.filter((v) => !calcularResumoCadernoVenda(v).temCaderno),
    [vendas]
  );

  const handleVincularVendaExistente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendaParaVincularId || saldoInicialVincular <= 0) return;

    const qtd = Math.max(1, Math.min(120, Math.floor(Number(qtdParcelasVincular) || 1)));
    const totalCentavos = Math.round(saldoInicialVincular * 100);
    const baseCentavos = Math.floor(totalCentavos / qtd);
    const restoCentavos = totalCentavos - baseCentavos * qtd;

    const parcelas: ParcelaReceber[] = Array.from({ length: qtd }, (_, idx) => {
      const centavos = idx === qtd - 1 ? baseCentavos + restoCentavos : baseCentavos;
      return {
        id: `parc-${Date.now()}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
        numero: idx + 1,
        valor: centavos / 100,
        dataVencimento: addMonthsToISODate(vencimentoVincular || getLocalISODate(), idx),
        pago: false,
      };
    });

    updateVenda(vendaParaVincularId, {
      saldoDevedorInicial: saldoInicialVincular,
      parcelas,
      abatimentos: [],
    });

    setModalVincularAberto(false);
    setVendaSelecionadaId(vendaParaVincularId);
  };

  const hojeISO = getLocalISODate();

  return (
    <div className="space-y-5">
      {/* Header Apple iOS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
              A Receber
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Controle de vendas parceladas, promissórias, abatimentos parciais e saldo devedor de cada cliente.
          </p>
        </div>

        {vendasSemCaderno.length > 0 && (
          <button
            onClick={() => {
              const primeira = vendasSemCaderno[0];
              setVendaParaVincularId(primeira.id);
              setSaldoInicialVincular(primeira.valorVenda);
              setModalVincularAberto(true);
            }}
            className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Incluir Venda em A Receber</span>
          </button>
        )}
      </div>

      {/* KPIs de Contas a Receber */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
            Total a Receber (Em Aberto)
          </span>
          <strong className="text-lg sm:text-xl font-extrabold text-amber-600 mt-1 block">
            {formatCurrency(kpis.totalAReceber)}
          </strong>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">
            Saldo devedor total na praça
          </span>
        </div>

        <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
            Clientes com Saldo Devedor
          </span>
          <strong className="text-lg sm:text-xl font-extrabold text-zinc-900 mt-1 block">
            {kpis.clientesDevendo} cliente(s)
          </strong>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">
            Com parcelas ou saldo em aberto
          </span>
        </div>

        <div className="bg-white border border-rose-200/70 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
            Parcelas Vencidas / Atrasadas
          </span>
          <strong className="text-lg sm:text-xl font-extrabold text-rose-600 mt-1 block">
            {formatCurrency(kpis.totalVencido)}
          </strong>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">
            Vencimento anterior a hoje
          </span>
        </div>

        <div className="bg-white border border-emerald-200/70 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Total Já Recebido
          </span>
          <strong className="text-lg sm:text-xl font-extrabold text-emerald-600 mt-1 block">
            {formatCurrency(kpis.totalRecebido)}
          </strong>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">
            Soma de baixas e abatimentos
          </span>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white border border-black/[0.06] rounded-2xl p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar cliente, CPF/CNPJ, veículo ou anotação..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              if (onClearClienteFiltro) onClearClienteFiltro();
            }}
            className="w-full bg-zinc-100/80 focus:bg-white border border-transparent focus:border-emerald-500/50 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl overflow-x-auto">
          {(
            [
              { id: "ABERTOS", label: "Em Aberto" },
              { id: "VENCIDOS", label: "Com Atraso" },
              { id: "QUITADOS", label: "Quitados" },
              { id: "TODOS", label: "Todos" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltroStatus(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filtroStatus === f.id
                  ? "bg-white text-zinc-950 font-semibold shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Fichas do Caderno */}
      {registrosFiltrados.length === 0 ? (
        <div className="bg-white border border-black/[0.06] rounded-2xl p-10 text-center space-y-2 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Nenhum registro encontrado neste filtro
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Ao registrar uma venda com a forma de pagamento <strong>Parcelado / A Prazo (A Receber)</strong>, a ficha de cobrança do cliente aparecerá automaticamente aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {registrosFiltrados.map(({ venda, cliente, veiculo, resumo }) => {
            const percentualPago =
              resumo.dividaInicial > 0
                ? Math.min(100, Math.round((resumo.totalAbatido / resumo.dividaInicial) * 100))
                : 100;
            const temAtraso = !resumo.quitado && resumo.parcelasVencidas.length > 0;

            return (
              <div
                key={venda.id}
                className={`bg-white border rounded-2xl p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between gap-4 ${
                  temAtraso
                    ? "border-rose-200/90"
                    : resumo.quitado
                    ? "border-emerald-200/70"
                    : "border-black/[0.06]"
                }`}
              >
                <div className="space-y-3">
                  {/* Topo do Card: Cliente + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                          resumo.quitado
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : temAtraso
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-zinc-950 truncate">
                          {cliente?.nome || "Cliente não identificado"}
                        </h4>
                        <span className="text-[11px] text-zinc-500 block">
                          {cliente?.telefone ? formatPhone(cliente.telefone) : cliente?.cpfCnpj || ""}
                        </span>
                      </div>
                    </div>

                    {resumo.quitado ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        Quitado
                      </span>
                    ) : temAtraso ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {resumo.parcelasVencidas.length} Vencida(s)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        Deve {formatCurrency(resumo.saldoRestante)}
                      </span>
                    )}
                  </div>

                  {/* Veículo da Venda */}
                  <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Car className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="font-semibold text-zinc-800 truncate">
                        {veiculo ? `${veiculo.marca} ${veiculo.modelo}` : "Veículo da Venda"}
                        {veiculo?.placa ? ` (${veiculo.placa})` : ""}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 shrink-0">
                      Venda em {formatDate(venda.dataVenda)}
                    </span>
                  </div>

                  {/* Valores e Barra de Progresso */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-3 gap-2 text-center bg-[#f2f2f7]/60 p-2.5 rounded-xl border border-black/[0.04]">
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                          Total Parcelado
                        </span>
                        <strong className="text-xs font-bold text-zinc-800">
                          {formatCurrency(resumo.dividaInicial)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 uppercase font-semibold block">
                          Já Pago / Abatido
                        </span>
                        <strong className="text-xs font-bold text-emerald-600">
                          {formatCurrency(resumo.totalAbatido)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 uppercase font-semibold block">
                          Falta Pagar
                        </span>
                        <strong className="text-xs font-extrabold text-amber-600">
                          {formatCurrency(resumo.saldoRestante)}
                        </strong>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          resumo.quitado ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${percentualPago}%` }}
                      />
                    </div>
                  </div>

                  {/* Próximo vencimento e Anotação Rápida */}
                  {!resumo.quitado && resumo.proximaParcela && (
                    <div className="flex items-center justify-between text-[11px] text-zinc-600 px-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        Próxima parcela ({resumo.proximaParcela.numero}/{(venda.parcelas || []).length}):{" "}
                        <strong className={resumo.proximaParcela.dataVencimento < hojeISO ? "text-rose-600" : "text-zinc-900"}>
                          {formatDate(resumo.proximaParcela.dataVencimento)}
                        </strong>
                      </span>
                      <strong className="text-zinc-900">{formatCurrency(resumo.proximaParcela.valor)}</strong>
                    </div>
                  )}

                  {venda.anotacoesCaderno && (
                    <p className="text-[11px] text-amber-900 bg-amber-50/70 border border-amber-200/60 rounded-xl px-3 py-1.5 line-clamp-2">
                      <strong>Nota:</strong> {venda.anotacoesCaderno}
                    </p>
                  )}
                </div>

                {/* Botão de Abrir o Caderno */}
                <button
                  type="button"
                  onClick={() => {
                    setVendaSelecionadaId(venda.id);
                    setAbaDetalhe("PARCELAS");
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-all shadow-xs active:scale-[0.99]"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Gerenciar Cobrança / Dar Baixa ou Abater Valor</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Híbrido de Conta a Receber do Cliente (Parcelas + Abatimentos + Anotações) */}
      {itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-md overflow-y-auto">
          <div className="bg-white border border-black/[0.08] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/80 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-zinc-950 truncate">
                    Conta a Receber — {itemSelecionado.cliente?.nome || "Cliente"}
                  </h3>
                  <p className="text-xs text-zinc-500 truncate">
                    {itemSelecionado.veiculo
                      ? `${itemSelecionado.veiculo.marca} ${itemSelecionado.veiculo.modelo}`
                      : "Veículo"}{" "}
                    • Venda em {formatDate(itemSelecionado.venda.dataVenda)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setVendaSelecionadaId(null)}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumo Financeiro da Dívida */}
            <div className="p-4 bg-zinc-50/60 border-b border-black/[0.06] grid grid-cols-3 gap-2.5 text-center shrink-0">
              <div className="bg-white p-3 rounded-2xl border border-black/[0.05] shadow-2xs">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Dívida Inicial</span>
                <strong className="text-xs sm:text-sm font-bold text-zinc-800 mt-0.5 block">
                  {formatCurrency(itemSelecionado.resumo.dividaInicial)}
                </strong>
              </div>
              <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/60 shadow-2xs">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Total Abatido</span>
                <strong className="text-xs sm:text-sm font-bold text-emerald-600 mt-0.5 block">
                  {formatCurrency(itemSelecionado.resumo.totalAbatido)}
                </strong>
              </div>
              <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/70 shadow-2xs">
                <span className="text-[10px] text-amber-800 uppercase font-semibold block">Saldo Devedor Atual</span>
                <strong className="text-xs sm:text-sm font-extrabold text-amber-600 mt-0.5 block">
                  {formatCurrency(itemSelecionado.resumo.saldoRestante)}
                </strong>
              </div>
            </div>

            {/* Abas Internas do Caderno */}
            <div className="px-5 pt-3 bg-white border-b border-black/[0.06] flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAbaDetalhe("PARCELAS")}
                className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  abaDetalhe === "PARCELAS"
                    ? "border-amber-500 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Parcelas Previstas ({(itemSelecionado.venda.parcelas || []).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAbaDetalhe("ABATIMENTOS")}
                className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  abaDetalhe === "ABATIMENTOS"
                    ? "border-emerald-500 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>Abatimentos Avulsos ({(itemSelecionado.venda.abatimentos || []).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAbaDetalhe("ANOTACOES")}
                className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  abaDetalhe === "ANOTACOES"
                    ? "border-blue-500 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Folha de Anotações</span>
              </button>
            </div>

            {/* Corpo Rolável */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-[#f2f2f7]/50">
              {abaDetalhe === "PARCELAS" && (
                <div className="space-y-3">
                  {(itemSelecionado.venda.parcelas || []).length === 0 ? (
                    <div className="bg-white border border-black/[0.06] rounded-2xl p-5 text-center space-y-3">
                      <p className="text-xs text-zinc-600">
                        Nenhuma parcela com vencimento foi gerada ainda para este saldo.
                      </p>
                      <div className="flex flex-wrap items-end justify-center gap-2.5">
                        <div>
                          <label className="text-[11px] text-zinc-500 block mb-1">Qtd. Parcelas</label>
                          <input
                            type="number"
                            min={1}
                            max={120}
                            value={novaQtdParcelas}
                            onChange={(e) => setNovaQtdParcelas(e.target.value === "" ? "" : Math.max(1, Math.min(120, Number(e.target.value))))}
                            className="w-24 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-center font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-zinc-500 block mb-1">1º Vencimento</label>
                          <input
                            type="date"
                            value={novoPrimeiroVenc}
                            onChange={(e) => setNovoPrimeiroVenc(e.target.value)}
                            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleRegerarParcelas}
                          className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                        >
                          Gerar Parcelas
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {(itemSelecionado.venda.parcelas || []).map((parcela) => {
                          const vencida = !parcela.pago && parcela.dataVencimento < hojeISO && !itemSelecionado.resumo.quitado;
                          const paga = parcela.pago || itemSelecionado.resumo.quitado;

                          return (
                            <div
                              key={parcela.id}
                              className={`bg-white border rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs shadow-2xs ${
                                paga
                                  ? "border-emerald-200/70 bg-emerald-50/20"
                                  : vencida
                                  ? "border-rose-200 bg-rose-50/20"
                                  : "border-black/[0.06]"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                    paga
                                      ? "bg-emerald-100 text-emerald-700"
                                      : vencida
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-zinc-100 text-zinc-700"
                                  }`}
                                >
                                  {parcela.numero}ª
                                </span>
                                <div>
                                  <strong className="text-zinc-900 font-bold block">
                                    {formatCurrency(parcela.valor)}
                                  </strong>
                                  <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Vencimento: {formatDate(parcela.dataVencimento)}
                                    {paga && parcela.dataPagamento && (
                                      <span className="text-emerald-700 font-medium">
                                        {" "}• Pago em {formatDate(parcela.dataPagamento)}
                                      </span>
                                    )}
                                    {vencida && (
                                      <span className="text-rose-600 font-semibold"> • Vencida</span>
                                    )}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleParcelaPaga(parcela)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all shrink-0 ${
                                  parcela.pago
                                    ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs"
                                }`}
                              >
                                {parcela.pago ? (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Estornar</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Dar Baixa</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {abaDetalhe === "ABATIMENTOS" && (
                <div className="space-y-4">
                  {/* Formulário para Abatimento Livre / Parcial */}
                  <form
                    onSubmit={handleAdicionarAbatimento}
                    className="bg-white border border-black/[0.06] rounded-2xl p-4 space-y-3 shadow-2xs"
                  >
                    <span className="text-xs font-bold text-zinc-800 block">
                      Lançar Pagamento Parcial / Abatimento Livre
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[11px] text-zinc-500 font-medium block mb-1">
                          Valor Pago (R$) *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0,00"
                          value={formatCurrencyInput(valorAbatimento)}
                          onChange={(e) => setValorAbatimento(parseCurrencyInput(e.target.value))}
                          required
                          className="w-full bg-[#f2f2f7] border border-black/[0.06] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-zinc-500 font-medium block mb-1">
                          Data do Pagamento
                        </label>
                        <input
                          type="date"
                          value={dataAbatimento}
                          onChange={(e) => setDataAbatimento(e.target.value)}
                          className="w-full bg-[#f2f2f7] border border-black/[0.06] focus:bg-white focus:border-emerald-500 rounded-xl px-2.5 py-2 text-xs text-zinc-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-zinc-500 font-medium block mb-1">
                          Observação (PIX, Cheque...)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: PIX por conta"
                          value={obsAbatimento}
                          onChange={(e) => setObsAbatimento(e.target.value)}
                          className="w-full bg-[#f2f2f7] border border-black/[0.06] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-xs active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Registrar Abatimento</span>
                      </button>
                    </div>
                  </form>

                  {/* Histórico de Abatimentos */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Histórico de Pagamentos Recebidos
                    </span>
                    {(itemSelecionado.venda.abatimentos || []).length === 0 ? (
                      <div className="bg-white border border-black/[0.05] rounded-2xl p-6 text-center text-xs text-zinc-400">
                        Nenhum pagamento ou abatimento registrado ainda.
                      </div>
                    ) : (
                      (itemSelecionado.venda.abatimentos || []).map((abat) => (
                        <div
                          key={abat.id}
                          className="bg-white border border-black/[0.05] rounded-2xl p-3.5 flex items-center justify-between text-xs shadow-2xs"
                        >
                          <div>
                            <strong className="text-zinc-900 font-semibold block">
                              {abat.observacao || "Pagamento recebido"}
                            </strong>
                            <span className="text-[11px] text-zinc-500">
                              Recebido em {formatDate(abat.data)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <strong className="text-emerald-600 font-bold text-sm">
                              +{formatCurrency(abat.valor)}
                            </strong>
                            <button
                              type="button"
                              onClick={() => handleExcluirAbatimento(abat)}
                              title="Excluir abatimento"
                              className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {abaDetalhe === "ANOTACOES" && (
                <div className="bg-white border border-black/[0.06] rounded-2xl p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800 block">
                      Folha Livre de Anotações do Cliente
                    </label>
                    {anotacaoSalvaFeedback && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Anotação salva!
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={6}
                    value={anotacaoTexto}
                    onChange={(e) => setAnotacaoTexto(e.target.value)}
                    placeholder="Anote aqui combinados com o cliente, números de cheques, datas de pagamento, garantias ou observações de cobrança..."
                    className="w-full bg-amber-50/40 border border-amber-200/80 focus:bg-white focus:border-amber-500 rounded-xl p-3 text-xs text-zinc-900 leading-relaxed focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSalvarAnotacao}
                      className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-xs active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Anotação</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para incluir uma venda já realizada em A Receber */}
      {modalVincularAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-md">
          <div className="bg-white border border-black/[0.08] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/80">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-sm text-zinc-950">Incluir Venda em A Receber</h3>
              </div>
              <button
                onClick={() => setModalVincularAberto(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleVincularVendaExistente} className="p-5 space-y-3.5">
              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1">Selecione a Venda *</label>
                <select
                  value={vendaParaVincularId}
                  onChange={(e) => {
                    setVendaParaVincularId(e.target.value);
                    const v = vendas.find((item) => item.id === e.target.value);
                    if (v) setSaldoInicialVincular(v.valorVenda);
                  }}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium"
                >
                  {vendasSemCaderno.map((v) => {
                    const cl = clientes.find((c) => c.id === v.clienteId) || v.cliente;
                    const veic = veiculos.find((vl) => vl.id === v.veiculoId) || v.veiculo;
                    return (
                      <option key={v.id} value={v.id}>
                        {cl?.nome || "Cliente"} — {veic ? `${veic.marca} ${veic.modelo}` : "Veículo"} (
                        {formatCurrency(v.valorVenda)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1">
                  Saldo Devedor a Receber (R$) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyInput(saldoInicialVincular)}
                  onChange={(e) => setSaldoInicialVincular(parseCurrencyInput(e.target.value))}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-amber-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">Qtd. Parcelas</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={qtdParcelasVincular}
                    onChange={(e) => setQtdParcelasVincular(e.target.value === "" ? "" : Math.max(1, Math.min(120, Number(e.target.value))))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">1º Vencimento</label>
                  <input
                    type="date"
                    value={vencimentoVincular}
                    onChange={(e) => setVencimentoVincular(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalVincularAberto(false)}
                  className="text-xs font-medium text-zinc-600 px-3 py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs"
                >
                  Salvar em A Receber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
