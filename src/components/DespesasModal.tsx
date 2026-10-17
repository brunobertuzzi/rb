"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Veiculo, DespesaVeiculo } from "@/types";
import { formatCurrency, formatDate, getLocalISODate, formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";
import { 
  X, 
  Wrench, 
  Plus, 
  Trash2, 
  Edit3, 
  Save 
} from "lucide-react";

interface DespesasModalProps {
  veiculo: Veiculo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DespesasModal({ veiculo, isOpen, onClose }: DespesasModalProps) {
  const { veiculos, addDespesa, updateDespesa, deleteDespesa } = useApp();
  const { user } = useAuth();
  const veiculoAtual = veiculos.find((v) => v.id === veiculo?.id) || veiculo;

  const [despesaParaEditar, setDespesaParaEditar] = useState<DespesaVeiculo | null>(null);
  const [descricao, setDescricao] = useState("");
  const [tipoDespesa, setTipoDespesa] = useState("OFICINA");
  const [valor, setValor] = useState<number>(0);
  const [dataDespesa, setDataDespesa] = useState("");
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [notaFiscal, setNotaFiscal] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDataDespesa(getLocalISODate());
      setDespesaParaEditar(null);
    }
  }, [isOpen]);

  if (!isOpen || !veiculoAtual) return null;

  const totalDespesas = (veiculoAtual.despesas || []).reduce((acc, d) => acc + d.valor, 0);
  const custoTotal = Number(veiculoAtual.valorAquisicao) + totalDespesas;
  const lucroEstimado = veiculoAtual.precoAnunciado - custoTotal;

  const handleIniciarEdicao = (despesa: DespesaVeiculo) => {
    setDespesaParaEditar(despesa);
    setDescricao(despesa.descricao);
    setTipoDespesa(despesa.tipoDespesa);
    setValor(despesa.valor);
    setDataDespesa(despesa.dataDespesa);
    setFornecedorNome(despesa.fornecedorNome || "");
    setNotaFiscal(despesa.notaFiscal || "");
  };

  const handleCancelarEdicao = () => {
    setDespesaParaEditar(null);
    setDescricao("");
    setValor(0);
    setNotaFiscal("");
    setFornecedorNome("");
    setDataDespesa(getLocalISODate());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || valor <= 0) return;

    if (despesaParaEditar) {
      updateDespesa(veiculoAtual.id, despesaParaEditar.id, {
        descricao,
        tipoDespesa,
        valor,
        dataDespesa,
        fornecedorNome: fornecedorNome || undefined,
        notaFiscal: notaFiscal || undefined,
      });
      handleCancelarEdicao();
    } else {
      addDespesa(veiculoAtual.id, {
        descricao,
        tipoDespesa,
        valor,
        dataDespesa,
        fornecedorNome: fornecedorNome || undefined,
        notaFiscal: notaFiscal || undefined,
      });
      setDescricao("");
      setValor(0);
      setNotaFiscal("");
      setFornecedorNome("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-md overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header Apple iOS */}
        <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-zinc-900 tracking-tight">
                Gastos & Manutenção
              </h3>
              <p className="text-xs text-zinc-500 font-normal">
                {veiculoAtual.marca} {veiculoAtual.modelo} ({veiculoAtual.anoFabricacao}/{veiculoAtual.anoModelo})
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

        {/* Resumo Financeiro iOS Cards */}
        <div className={`p-4 bg-zinc-50/50 border-b border-black/[0.06] grid ${user?.role === "VENDEDOR" ? "grid-cols-1" : "grid-cols-3"} gap-2.5 text-center`}>
          {user?.role !== "VENDEDOR" && (
            <div className="bg-white p-3 rounded-2xl border border-black/[0.05] shadow-xs">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block tracking-wider">Compra</span>
              <strong className="text-xs sm:text-sm font-semibold text-zinc-800 mt-0.5 block">
                {formatCurrency(veiculoAtual.valorAquisicao)}
              </strong>
            </div>
          )}
          <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-200/50 shadow-xs">
            <span className="text-[10px] text-amber-600 uppercase font-semibold block tracking-wider">Total Gastos de Oficina</span>
            <strong className="text-xs sm:text-sm font-semibold text-amber-600 mt-0.5 block">
              +{formatCurrency(totalDespesas)}
            </strong>
          </div>
          {user?.role !== "VENDEDOR" && (
            <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200/50 shadow-xs">
              <span className="text-[10px] text-emerald-700 uppercase font-semibold block tracking-wider">Custo Real</span>
              <strong className="text-xs sm:text-sm font-semibold text-emerald-700 mt-0.5 block">
                {formatCurrency(custoTotal)}
              </strong>
            </div>
          )}
        </div>

        {/* Formulário de Despesa */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 border-b border-black/[0.06] bg-white space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800 tracking-tight block">
              {despesaParaEditar ? "Editar Gasto Selecionado:" : "Lançar Novo Gasto:"}
            </span>
            {despesaParaEditar && (
              <button
                type="button"
                onClick={handleCancelarEdicao}
                className="text-xs text-zinc-500 hover:text-zinc-900 font-medium"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div className="sm:col-span-5">
              <label className="text-[11px] text-zinc-500 block mb-1 font-medium">Descrição do Gasto *</label>
              <input
                type="text"
                placeholder="Descrição do serviço ou peça"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
                className="w-full bg-[#f2f2f7] border border-black/[0.06] focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none transition-all min-h-[38px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] text-zinc-500 block mb-1 font-medium">Valor (R$) *</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={formatCurrencyInput(valor)}
                onChange={(e) => setValor(parseCurrencyInput(e.target.value))}
                required
                className="w-full bg-[#f2f2f7] border border-black/[0.06] focus:bg-white focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-amber-700 font-bold focus:outline-none transition-all min-h-[38px]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[11px] text-zinc-500 block mb-1 font-medium">Data</label>
              <input
                type="date"
                value={dataDespesa}
                onChange={(e) => setDataDespesa(e.target.value)}
                className="w-full bg-[#f2f2f7] border border-black/[0.06] focus:bg-white focus:border-emerald-500 rounded-xl px-2.5 py-2 text-xs text-zinc-800 focus:outline-none transition-all min-h-[38px]"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs px-3 py-2 rounded-xl transition-all shadow-xs active:scale-95 whitespace-nowrap min-h-[38px]"
              >
                {despesaParaEditar ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{despesaParaEditar ? "Salvar" : "Lançar"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Lista de Gastos Lançados */}
        <div className="p-4 max-h-[260px] overflow-y-auto space-y-2 bg-[#f2f2f7]/50">
          {(!veiculoAtual.despesas || veiculoAtual.despesas.length === 0) ? (
            <p className="text-center text-xs text-zinc-400 py-6">
              Nenhum gasto adicional registrado para este veículo.
            </p>
          ) : (
            veiculoAtual.despesas.map((despesa) => (
              <div
                key={despesa.id}
                className="bg-white border border-black/[0.05] p-3 rounded-2xl flex items-center justify-between hover:border-black/[0.1] transition-all text-xs shadow-xs"
              >
                <div>
                  <strong className="text-zinc-900 font-semibold block">{despesa.descricao}</strong>
                  <span className="text-[11px] text-zinc-500">
                    {formatDate(despesa.dataDespesa)}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <strong className="text-amber-600 font-bold text-xs sm:text-sm">
                    {formatCurrency(despesa.valor)}
                  </strong>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleIniciarEdicao(despesa)}
                      title="Editar gasto"
                      className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir o gasto "${despesa.descricao}"?`)) {
                          deleteDespesa(veiculoAtual.id, despesa.id);
                        }
                      }}
                      title="Excluir gasto"
                      className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
