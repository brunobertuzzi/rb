"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Veiculo } from "@/types";
import { formatCurrency, formatUsage, formatDate, STATUS_LABELS } from "@/lib/utils";
import { 
  X, 
  Car, 
  BadgeDollarSign, 
  FileText, 
  Wrench, 
  Edit3, 
  Trash2,
  ShieldCheck, 
  Calendar, 
  Tag, 
  Coins, 
  CheckCircle2, 
  AlertTriangle,
  History,
  FileCheck2,
  Clock
} from "lucide-react";

interface VeiculoDetalhesModalProps {
  veiculo: Veiculo | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenVenda: (veiculo: Veiculo) => void;
  onOpenDocumentos: (veiculo: Veiculo) => void;
  onOpenDespesas: (veiculo: Veiculo) => void;
  onEditar: (veiculo: Veiculo) => void;
}

export function VeiculoDetalhesModal({
  veiculo: veiculoProp,
  isOpen,
  onClose,
  onOpenVenda,
  onOpenDocumentos,
  onOpenDespesas,
  onEditar,
}: VeiculoDetalhesModalProps) {
  const { veiculos, deleteVeiculo, updateVeiculo } = useApp();
  const { user } = useAuth();
  const veiculo = veiculos.find((v) => v.id === veiculoProp?.id) || veiculoProp;
  const [fotoAtiva, setFotoAtiva] = useState<string>("");
  const [abaInterna, setAbaInterna] = useState<"FICHA" | "TIMELINE">("FICHA");

  if (!isOpen || !veiculo) return null;

  const todasFotos = Array.from(
    new Set(
      [
        veiculo.fotoCapa,
        ...(veiculo.fotos?.map((f) => f.url) || []),
      ].filter(Boolean) as string[]
    )
  );

  const fotoExibida = fotoAtiva || veiculo.fotoCapa || todasFotos[0] || "";

  const statusStyle = STATUS_LABELS[veiculo.status] || STATUS_LABELS.DISPONIVEL;
  const custo = veiculo.custoTotal || veiculo.valorAquisicao;
  const margem = veiculo.precoAnunciado - custo;
  const margemPercentual = veiculo.precoAnunciado > 0 ? (margem / veiculo.precoAnunciado) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-md overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header Apple iOS */}
        <div className="px-5 py-3.5 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 tracking-tight">
                  {veiculo.marca} {veiculo.modelo}
                </h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-normal">
                {veiculo.versao || veiculo.categoria} • {veiculo.anoFabricacao}/{veiculo.anoModelo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor Segmentado iOS */}
            <div className="flex items-center gap-1 bg-[#e5e5ea] p-1 rounded-xl text-xs">
              <button
                onClick={() => setAbaInterna("FICHA")}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  abaInterna === "FICHA" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Ficha Técnica
              </button>
              <button
                onClick={() => setAbaInterna("TIMELINE")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-all ${
                  abaInterna === "TIMELINE" ? "bg-white text-emerald-700 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <History className="w-3 h-3" />
                <span>Histórico ({veiculo.despesas?.length || 0})</span>
              </button>
            </div>

            {user?.role !== "VENDEDOR" && (
              <button
                onClick={() => {
                  if (confirm(`Tem certeza que deseja excluir ${veiculo.marca} ${veiculo.modelo} do estoque?`)) {
                    deleteVeiculo(veiculo.id);
                    onClose();
                  }
                }}
                title="Excluir do Estoque"
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 flex items-center justify-center transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {veiculo.status === "PREPARACAO" && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-800">
                <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Este veículo está <strong>Em Preparação / Oficina</strong>. Quando estiver pronto para o pátio, libere-o para venda.
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateVeiculo(veiculo.id, { status: "DISPONIVEL" })}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-xl transition-all shadow-xs shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Liberar para Venda</span>
              </button>
            </div>
          )}

          {abaInterna === "FICHA" ? (
            <>
              {/* Foto Principal & Miniaturas */}
              <div className="space-y-2">
                <div className="relative h-60 sm:h-72 w-full bg-zinc-100 rounded-2xl overflow-hidden border border-black/[0.06] flex items-center justify-center">
                  {fotoExibida ? (
                    <img
                      src={fotoExibida}
                      alt={`${veiculo.marca} ${veiculo.modelo}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-300 gap-2 p-6">
                      <Car className="w-12 h-12 stroke-[1.5]" />
                      <span className="text-xs font-medium text-zinc-400">Sem foto cadastrada</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {veiculo.valorFipe && veiculo.valorFipe > 0 ? (
                      <div className="bg-blue-600/90 text-white px-3 py-1.5 rounded-2xl backdrop-blur-md border border-white/20 font-semibold text-xs shadow-sm">
                        FIPE: {formatCurrency(veiculo.valorFipe)}
                      </div>
                    ) : null}
                    <div className="bg-white/90 text-zinc-900 px-3.5 py-1.5 rounded-2xl backdrop-blur-md border border-black/[0.08] font-bold text-base shadow-sm">
                      {formatCurrency(veiculo.precoAnunciado)}
                    </div>
                  </div>
                </div>

                {todasFotos.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {todasFotos.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setFotoAtiva(url)}
                        className={`relative rounded-xl overflow-hidden w-16 h-12 shrink-0 border transition-all ${
                          fotoExibida === url ? "border-emerald-600 ring-2 ring-emerald-500/20" : "border-black/[0.08] opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumo Financeiro iOS Cards */}
              {user?.role !== "VENDEDOR" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="bg-[#f2f2f7]/70 p-3 rounded-2xl border border-black/[0.04]">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Compra</span>
                    <strong className="text-xs sm:text-sm font-semibold text-zinc-800 mt-0.5 block">
                      {formatCurrency(veiculo.valorAquisicao)}
                    </strong>
                  </div>
                  <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/50">
                    <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider block">Gastos / Oficina</span>
                    <strong className="text-xs sm:text-sm font-semibold text-amber-700 mt-0.5 block">
                      +{formatCurrency((veiculo.despesas || []).reduce((a, b) => a + b.valor, 0))}
                    </strong>
                  </div>
                  <div className="bg-[#f2f2f7]/70 p-3 rounded-2xl border border-black/[0.04]">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Custo Total</span>
                    <strong className="text-xs sm:text-sm font-semibold text-zinc-900 mt-0.5 block">
                      {formatCurrency(custo)}
                    </strong>
                  </div>
                  <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/50">
                    <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider block">Margem Estimada</span>
                    <strong className={`text-xs sm:text-sm font-semibold mt-0.5 block ${margem >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {margem >= 0 ? "+" : ""}{formatCurrency(margem)} ({margemPercentual.toFixed(1)}%)
                    </strong>
                  </div>
                </div>
              )}

              {/* Ficha Técnica Completa */}
              <div className="bg-[#f2f2f7]/50 p-4.5 rounded-2xl border border-black/[0.05] space-y-3">
                <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider block">
                  Especificações Técnicas
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-zinc-500 block font-medium">Categoria</span>
                    <span className="text-zinc-800 font-semibold">{veiculo.categoria}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block font-medium">Cor</span>
                    <span className="text-zinc-800 font-semibold">{veiculo.cor}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block font-medium">Ano Fab / Modelo</span>
                    <span className="text-zinc-800 font-semibold">{veiculo.anoFabricacao} / {veiculo.anoModelo}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block font-medium">Placa</span>
                    <span className="text-zinc-800 font-mono font-semibold">{veiculo.placa || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block font-medium">Quilometragem (KM)</span>
                    <span className="text-zinc-800 font-semibold">{formatUsage(veiculo)}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block font-medium">Chassi</span>
                    <span className="text-zinc-800 font-mono text-[11px] truncate block">{veiculo.chassi || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block font-medium">Combustível</span>
                    <span className="text-zinc-800 font-semibold">{veiculo.combustivel || "Diesel"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block font-medium">Câmbio</span>
                    <span className="text-zinc-800 font-semibold">{veiculo.cambio || "Automático"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block font-medium">RENAVAM</span>
                    <span className="text-zinc-800 font-semibold">{veiculo.renavam || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Data de Cadastro no Estoque */}
              <div className="bg-[#f2f2f7]/50 p-4 rounded-2xl border border-black/[0.05] flex items-center justify-between text-xs">
                <span className="text-[11px] text-zinc-500 font-medium">Data de Cadastro no Estoque</span>
                <span className="text-zinc-800 font-semibold">{formatDate(veiculo.dataEntrada)}</span>
              </div>
            </>
          ) : (
            /* Timeline & Histórico */
            <div className="space-y-4">
              <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider block">
                Linha do Tempo e Histórico Operacional
              </span>

              <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                {/* 1. Entrada */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                  <div className="bg-white p-3.5 rounded-2xl border border-black/[0.06] shadow-xs space-y-1">
                    <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Entrada no Pátio</span>
                    <strong className="text-xs text-zinc-900 block">Item cadastrado no estoque da RB Agronegócios</strong>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-1">
                      <span>Data: {formatDate(veiculo.dataEntrada)}</span>
                      {user?.role !== "VENDEDOR" && (
                        <>
                          <span>•</span>
                          <span>Valor de Compra: <strong className="text-zinc-800">{formatCurrency(veiculo.valorAquisicao)}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Manutenções / Gastos */}
                {(veiculo.despesas || []).map((d) => (
                  <div key={d.id} className="relative">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-xs" />
                    <div className="bg-white p-3.5 rounded-2xl border border-black/[0.06] shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">
                          Manutenção / Gasto
                        </span>
                        <strong className="text-xs font-bold text-amber-600">+{formatCurrency(d.valor)}</strong>
                      </div>
                      <strong className="text-xs text-zinc-800 block">{d.descricao}</strong>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-0.5">
                        <span>{formatDate(d.dataDespesa)}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 3. Situação Atual */}
                <div className="relative">
                  <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                    veiculo.status === "VENDIDO" ? "bg-blue-500" : "bg-emerald-500"
                  }`} />
                  <div className="bg-white p-3.5 rounded-2xl border border-black/[0.06] shadow-xs space-y-1">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Situação Atual</span>
                    <strong className="text-xs text-zinc-900 block">
                      Status: {statusStyle.label} ({formatCurrency(veiculo.precoAnunciado)})
                    </strong>
                    {user?.role !== "VENDEDOR" && (
                      <p className="text-[11px] text-zinc-500">
                        Custo total consolidado até o momento: <strong className="text-zinc-800">{formatCurrency(custo)}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações Rápidas Apple iOS */}
        <div className={`p-3.5 bg-zinc-50/70 border-t border-black/[0.06] shrink-0 grid grid-cols-2 ${user?.role === "VENDEDOR" ? "sm:grid-cols-3" : "sm:grid-cols-4"} gap-2`}>
          <button
            onClick={() => {
              onClose();
              onOpenVenda(veiculo);
            }}
            disabled={veiculo.status === "VENDIDO"}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-3 rounded-2xl transition-all shadow-xs active:scale-95"
          >
            <BadgeDollarSign className="w-4 h-4" />
            <span>{veiculo.status === "VENDIDO" ? "Vendido" : "Vender"}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenDocumentos(veiculo);
            }}
            className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 font-semibold text-xs py-2.5 px-3 rounded-2xl transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>Procuração</span>
          </button>

          {user?.role !== "VENDEDOR" && (
            <button
              onClick={() => {
                onClose();
                onOpenDespesas(veiculo);
              }}
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-black/[0.08] font-semibold text-xs py-2.5 px-3 rounded-2xl transition-all active:scale-95 shadow-xs"
            >
              <Wrench className="w-4 h-4 text-zinc-500" />
              <span>Gastos</span>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onEditar(veiculo);
            }}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-black/[0.08] font-semibold text-xs py-2.5 px-3 rounded-2xl transition-all active:scale-95 shadow-xs"
          >
            <Edit3 className="w-4 h-4 text-zinc-500" />
            <span>Editar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
