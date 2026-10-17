"use client";

import React, { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatUsage, STATUS_LABELS } from "@/lib/utils";
import { 
  Car, 
  Coins, 
  TrendingUp, 
  BadgeDollarSign, 
  Plus, 
  ArrowUpRight, 
  Eye,
  Calendar,
  Gauge
} from "lucide-react";
import { Veiculo } from "@/types";
import { calcularTotaisFinanceiros } from "@/lib/financial";

interface DashboardViewProps {
  onOpenNovoVeiculo: () => void;
  onOpenVenda: (veiculo?: Veiculo) => void;
  onOpenDocumentos?: (veiculo?: Veiculo) => void;
  onOpenDespesas?: (veiculo: Veiculo) => void;
  onNavigateToEstoque: () => void;
  onVerDetalhes?: (veiculo: Veiculo) => void;
}

export function DashboardView({
  onOpenNovoVeiculo,
  onOpenVenda,
  onNavigateToEstoque,
  onVerDetalhes,
}: DashboardViewProps) {
  const { veiculos, vendas } = useApp();
  const { user } = useAuth();

  const disponiveis = useMemo(() => veiculos.filter((v) => v.status === "DISPONIVEL"), [veiculos]);

  const totalCapitalInvestido = useMemo(
    () => disponiveis.reduce((acc, v) => acc + (v.custoTotal || v.valorAquisicao), 0),
    [disponiveis]
  );
  const totalValorAnunciado = useMemo(
    () => disponiveis.reduce((acc, v) => acc + v.precoAnunciado, 0),
    [disponiveis]
  );
  const lucroEstimadoEstoque = totalValorAnunciado - totalCapitalInvestido;
  const margemPercentual = totalValorAnunciado > 0 ? (lucroEstimadoEstoque / totalValorAnunciado) * 100 : 0;

  const vendasMesAtual = useMemo(() => {
    const hoje = new Date();
    return vendas.filter((vd) => {
      const d = new Date(vd.dataVenda + "T00:00:00");
      return !isNaN(d.getTime()) && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    });
  }, [vendas]);

  const totaisMesAtual = useMemo(
    () => calcularTotaisFinanceiros(vendasMesAtual),
    [vendasMesAtual]
  );

  return (
    <div className="space-y-6">
      {/* Header Limpo Apple iOS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
            Visão Geral
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Resumo operacional e financeiro do pátio.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onOpenVenda()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
          >
            <BadgeDollarSign className="w-4 h-4" />
            <span>Registrar Venda</span>
          </button>
          <button
            onClick={onOpenNovoVeiculo}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-white hover:bg-zinc-50 text-zinc-800 font-medium text-xs px-3.5 py-2 rounded-xl transition-all border border-zinc-200/90 shadow-2xs active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Novo Item</span>
          </button>
        </div>
      </div>

      {/* Indicadores Principais (KPIs) Apple iOS */}
      <div className={`grid grid-cols-1 ${user?.role === "VENDEDOR" ? "sm:grid-cols-3" : "sm:grid-cols-4"} gap-3.5`}>
        {/* Total no Pátio */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Itens no Pátio</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-2xl font-bold text-zinc-950 tracking-tight">{disponiveis.length}</h3>
            <span className="text-xs text-zinc-500">disponíveis</span>
          </div>
        </div>

        {/* Vendas Realizadas no Mês */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Vendas no Mês</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <BadgeDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                {formatCurrency(totaisMesAtual.faturamentoRecebido)}
              </h3>
              <span className="text-xs text-zinc-500">em caixa</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {totaisMesAtual.saldoTotalAReceber > 0 ? (
                <span>
                  <strong className="text-amber-700 font-semibold">+{formatCurrency(totaisMesAtual.saldoTotalAReceber)} a prazo</strong> ({vendasMesAtual.length} vendas)
                </span>
              ) : (
                <span>{vendasMesAtual.length} venda(s) realizada(s)</span>
              )}
            </div>
          </div>
        </div>

        {user?.role === "VENDEDOR" ? (
          /* Para Vendedor: Exibir Valor Total Anunciado em vez de Custo/Margem */
          <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium">Estoque Anunciado</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-2xl font-bold text-zinc-950 tracking-tight">{formatCurrency(totalValorAnunciado)}</h3>
              <span className="text-xs text-zinc-500">em oferta</span>
            </div>
          </div>
        ) : (
          <>
            {/* Capital Investido */}
            <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-xs hover:shadow-sm transition-all">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Capital Investido</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">{formatCurrency(totalCapitalInvestido)}</h3>
            </div>

            {/* Lucro / Margem Estimada */}
            <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-xs hover:shadow-sm transition-all">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Margem Projetada</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className={`text-xl sm:text-2xl font-bold tracking-tight ${lucroEstimadoEstoque >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {lucroEstimadoEstoque >= 0 ? "+" : ""}{formatCurrency(lucroEstimadoEstoque)}
                </h3>
                <span className={`text-xs font-semibold ${margemPercentual >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  ({margemPercentual >= 0 ? "+" : ""}{margemPercentual.toFixed(0)}%)
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Destaques do Estoque Limpos Apple iOS */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-950">
              Veículos no Pátio
            </h3>
            <span className="text-xs text-zinc-500 font-medium">({disponiveis.length})</span>
          </div>

          <button
            onClick={onNavigateToEstoque}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Ver todos</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {disponiveis.length === 0 ? (
          <div className="bg-white border border-black/[0.06] rounded-3xl p-10 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-zinc-900">Estoque Vazio</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Nenhum veículo cadastrado no momento. Cadastre seu primeiro veículo para ver as métricas e o giro do pátio.
              </p>
            </div>
            <button
              onClick={onOpenNovoVeiculo}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Veículo</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {disponiveis.slice(0, 6).map((veiculo) => {
              const statusStyle = STATUS_LABELS[veiculo.status] || STATUS_LABELS.DISPONIVEL;

              return (
                <div
                  key={veiculo.id}
                  className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all flex flex-col justify-between group shadow-xs"
                >
                  {/* Imagem com Preço & Status */}
                  <div 
                    onClick={() => onVerDetalhes && onVerDetalhes(veiculo)}
                    className="relative h-44 w-full bg-zinc-100 overflow-hidden cursor-pointer flex items-center justify-center"
                  >
                    {veiculo.fotoCapa ? (
                      <img
                        src={veiculo.fotoCapa}
                        alt={`${veiculo.marca} ${veiculo.modelo}`}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-300 gap-1 p-4">
                        <Car className="w-8 h-8 stroke-[1.5]" />
                        <span className="text-[10px] font-medium text-zinc-400">Sem foto</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border backdrop-blur-md shadow-2xs ${statusStyle.bg} ${statusStyle.color}`}>
                        {statusStyle.label}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 bg-white/95 text-zinc-950 px-2.5 py-1 rounded-lg backdrop-blur-md border border-black/[0.06] font-bold text-sm shadow-sm">
                      {formatCurrency(veiculo.precoAnunciado)}
                    </div>
                  </div>

                  {/* Conteúdo do Card */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div 
                        onClick={() => onVerDetalhes && onVerDetalhes(veiculo)}
                        className="cursor-pointer"
                      >
                        <h4 className="font-semibold text-base text-zinc-950 group-hover:text-emerald-600 transition-colors">
                          {veiculo.marca} {veiculo.modelo}
                        </h4>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">
                          {veiculo.versao || veiculo.categoria}
                        </p>
                      </div>

                      {/* Especificações diretas */}
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-100">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-zinc-700 font-medium">{veiculo.anoFabricacao}/{veiculo.anoModelo}</span>
                        </div>
                        <span className="text-zinc-300">•</span>
                        <div className="flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-zinc-700 font-medium">{formatUsage(veiculo)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ações Rápidas Limpas */}
                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-2">
                      <button
                        onClick={() => onVerDetalhes && onVerDetalhes(veiculo)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 text-xs font-medium transition-all active:scale-[0.98]"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Ver Detalhes</span>
                      </button>

                      <button
                        onClick={() => onOpenVenda(veiculo)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all active:scale-95 shadow-xs"
                      >
                        <BadgeDollarSign className="w-3.5 h-3.5" />
                        <span>Vender</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
