"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Veiculo, StatusVeiculo } from "@/types";
import { formatCurrency, formatUsage, STATUS_LABELS } from "@/lib/utils";
import { 
  Search, 
  Plus, 
  BadgeDollarSign, 
  Edit3, 
  Trash2,
  Eye,
  Calendar,
  Gauge,
  Car
} from "lucide-react";

interface EstoqueViewProps {
  onOpenNovoVeiculo: () => void;
  onEditarVeiculo: (veiculo: Veiculo) => void;
  onOpenVenda: (veiculo: Veiculo) => void;
  onOpenDocumentos?: (veiculo: Veiculo) => void;
  onOpenDespesas?: (veiculo: Veiculo) => void;
  onVerDetalhes: (veiculo: Veiculo) => void;
}

export function EstoqueView({
  onOpenNovoVeiculo,
  onEditarVeiculo,
  onOpenVenda,
  onVerDetalhes,
}: EstoqueViewProps) {
  const { veiculos, deleteVeiculo } = useApp();
  const { user } = useAuth();

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("TODAS");
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | StatusVeiculo>("DISPONIVEL");

  const categoriasDisponiveis = useMemo(() => {
    const cats = new Set<string>();
    veiculos.forEach((v) => {
      if (v.categoria) cats.add(v.categoria);
    });
    return Array.from(cats);
  }, [veiculos]);

  const veiculosFiltrados = veiculos.filter((v) => {
    const termo = busca.toLowerCase();
    const matchBusca =
      (v.marca || "").toLowerCase().includes(termo) ||
      (v.modelo || "").toLowerCase().includes(termo) ||
      (v.versao && v.versao.toLowerCase().includes(termo)) ||
      (v.placa && v.placa.toLowerCase().includes(termo)) ||
      (v.chassi && v.chassi.toLowerCase().includes(termo));

    const matchCategoria = filtroCategoria === "TODAS" || v.categoria === filtroCategoria;
    const matchStatus = filtroStatus === "TODOS" || v.status === filtroStatus;

    return matchBusca && matchCategoria && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Top Header Limpo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
              Estoque
            </h2>
            <span className="text-xs text-zinc-500 font-medium">
              ({veiculosFiltrados.length} {veiculosFiltrados.length === 1 ? "item" : "itens"})
            </span>
          </div>
        </div>

        <button
          onClick={onOpenNovoVeiculo}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Veículo</span>
        </button>
      </div>

      {/* Barra de Filtros Direta Apple iOS */}
      <div className="bg-white border border-black/[0.06] rounded-2xl p-2.5 flex flex-col md:flex-row items-center justify-between gap-2.5 shadow-xs">
        {/* Campo de Busca */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por modelo, placa ou chassi..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-zinc-100/80 focus:bg-white border border-transparent focus:border-emerald-500/50 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Abas de Categoria Segmentadas iOS */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-zinc-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFiltroCategoria("TODAS")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filtroCategoria === "TODAS"
                  ? "bg-white text-zinc-950 shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Todos ({veiculos.length})
            </button>
            {categoriasDisponiveis.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFiltroCategoria(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  filtroCategoria === cat
                    ? "bg-white text-emerald-700 shadow-xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Filtro por Status */}
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as any)}
            className="bg-zinc-100 border border-transparent focus:bg-white focus:border-emerald-500/50 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 font-medium focus:outline-none shrink-0"
          >
            <option value="TODOS">Todos Status</option>
            <option value="DISPONIVEL">Disponíveis</option>
            <option value="PREPARACAO">Oficina / Preparação</option>
            <option value="RESERVADO">Reservados</option>
            <option value="VENDIDO">Vendidos</option>
          </select>
        </div>
      </div>

      {/* Grid de Veículos Limpo Apple iOS */}
      {veiculosFiltrados.length === 0 ? (
        <div className="bg-white border border-black/[0.06] rounded-2xl p-12 text-center space-y-2 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900">Nenhum veículo encontrado</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Ajuste a busca ou filtros para ver mais resultados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {veiculosFiltrados.map((veiculo) => {
            const statusStyle = STATUS_LABELS[veiculo.status] || STATUS_LABELS.DISPONIVEL;

            return (
              <div
                key={veiculo.id}
                className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all flex flex-col justify-between group shadow-xs"
              >
                {/* Imagem com Preço & Status */}
                <div 
                  onClick={() => onVerDetalhes(veiculo)}
                  className="relative h-48 w-full bg-zinc-100 overflow-hidden cursor-pointer flex items-center justify-center"
                >
                  {veiculo.fotoCapa ? (
                    <img
                      src={veiculo.fotoCapa}
                      alt={`${veiculo.marca} ${veiculo.modelo}`}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-300 gap-1.5 p-4">
                      <Car className="w-10 h-10 stroke-[1.5]" />
                      <span className="text-[10px] font-medium text-zinc-400">Sem foto</span>
                    </div>
                  )}
                  
                  {/* Status Badge estilo Apple */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border backdrop-blur-md shadow-2xs ${statusStyle.bg} ${statusStyle.color}`}>
                      {statusStyle.label}
                    </span>
                    {veiculo.categoria && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/90 text-zinc-700 backdrop-blur-md border border-black/[0.06] shadow-2xs">
                        {veiculo.categoria}
                      </span>
                    )}
                  </div>

                  {/* Preço de Anúncio e Referência FIPE */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                    {veiculo.valorFipe && veiculo.valorFipe > 0 ? (
                      <div className="bg-blue-600/90 text-white px-2 py-1 rounded-lg backdrop-blur-md text-[10px] font-semibold shadow-sm">
                        FIPE {formatCurrency(veiculo.valorFipe)}
                      </div>
                    ) : null}
                    <div className="bg-white/95 text-zinc-950 px-2.5 py-1 rounded-lg backdrop-blur-md border border-black/[0.06] font-bold text-sm shadow-sm">
                      {formatCurrency(veiculo.precoAnunciado)}
                    </div>
                  </div>
                </div>

                {/* Informações Essenciais do Veículo */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        onClick={() => onVerDetalhes(veiculo)}
                        className="cursor-pointer"
                      >
                        <h4 className="font-semibold text-base text-zinc-950 group-hover:text-emerald-600 transition-colors">
                          {veiculo.marca} {veiculo.modelo}
                        </h4>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">
                          {veiculo.versao || veiculo.categoria}
                        </p>
                      </div>

                      {/* Botões discretos de edição rápida */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditarVeiculo(veiculo)}
                          title="Editar cadastro"
                          className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {user?.role !== "VENDEDOR" && (
                          <button
                            onClick={() => {
                              if (confirm(`Remover ${veiculo.marca} ${veiculo.modelo} do estoque?`)) {
                                deleteVeiculo(veiculo.id);
                              }
                            }}
                            title="Excluir"
                            className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Especificações diretas e limpas */}
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
                      {veiculo.placa && (
                        <>
                          <span className="text-zinc-300">•</span>
                          <span className="font-mono text-zinc-600 text-[11px] bg-zinc-100 px-1.5 py-0.2 rounded">
                            {veiculo.placa}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Ações Diretas: Ver Detalhes e Vender */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-2">
                    <button
                      onClick={() => onVerDetalhes(veiculo)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 text-xs font-medium transition-all active:scale-[0.98]"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Ver Detalhes</span>
                    </button>

                    {veiculo.status !== "VENDIDO" ? (
                      <button
                        onClick={() => onOpenVenda(veiculo)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all active:scale-95 shadow-xs"
                      >
                        <BadgeDollarSign className="w-3.5 h-3.5" />
                        <span>Vender</span>
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400 italic px-2">Vendido</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
