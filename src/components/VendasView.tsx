"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDate, formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";
import { 
  BadgeDollarSign, 
  Calendar, 
  FileText, 
  User, 
  Edit3, 
  Trash2, 
  X, 
  Save 
} from "lucide-react";
import { Veiculo, Venda, FormaPagamento } from "@/types";
import { calcularFinanceiroVenda, calcularTotaisFinanceiros } from "@/lib/financial";

interface VendasViewProps {
  onOpenNovaVenda: () => void;
  onOpenDocumentos: (veiculo: Veiculo) => void;
}

export function VendasView({ onOpenNovaVenda, onOpenDocumentos }: VendasViewProps) {
  const { vendas, veiculos, deleteVenda, updateVenda } = useApp();
  const { user } = useAuth();

  const [vendaParaEditar, setVendaParaEditar] = useState<Venda | null>(null);
  const [editValorVenda, setEditValorVenda] = useState<number>(0);
  const [editFormaPagamento, setEditFormaPagamento] = useState<FormaPagamento>("A_VISTA");
  const [editValorEntrada, setEditValorEntrada] = useState<number>(0);
  const [editValorFinanciado, setEditValorFinanciado] = useState<number>(0);
  const [editBanco, setEditBanco] = useState<string>("");
  const [editObs, setEditObs] = useState<string>("");

  const totaisFinanceiros = useMemo(() => calcularTotaisFinanceiros(vendas), [vendas]);

  const handleAbrirEditar = (venda: Venda) => {
    setVendaParaEditar(venda);
    setEditValorVenda(venda.valorVenda);
    setEditFormaPagamento(venda.formaPagamento);
    setEditValorEntrada(venda.valorEntrada || 0);
    setEditValorFinanciado(venda.valorFinanciado || 0);
    setEditBanco(venda.bancoFinanciador || "");
    setEditObs(venda.observacoes || "");
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendaParaEditar || editValorVenda <= 0) return;

    if (editFormaPagamento === "FINANCIAMENTO") {
      const soma = Number(editValorEntrada || 0) + Number(editValorFinanciado || 0);
      if (Math.abs(editValorVenda - soma) > 0.05) {
        alert(
          `A soma de Entrada (${formatCurrency(editValorEntrada)}) + Valor Financiado (${formatCurrency(editValorFinanciado)}) deve corresponder ao Valor Final de Venda (${formatCurrency(editValorVenda)}).`
        );
        return;
      }
    }

    updateVenda(vendaParaEditar.id, {
      valorVenda: Number(editValorVenda),
      formaPagamento: editFormaPagamento,
      valorEntrada: Number(editValorEntrada),
      valorFinanciado: editFormaPagamento === "FINANCIAMENTO" ? Number(editValorFinanciado) : 0,
      bancoFinanciador: editFormaPagamento === "FINANCIAMENTO" ? editBanco || undefined : undefined,
      observacoes: editObs || undefined,
    });

    setVendaParaEditar(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Clean Apple iOS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
              Vendas
            </h2>
            <span className="text-xs text-zinc-500 font-medium">
              ({vendas.length} transações)
            </span>
          </div>
        </div>

        <button
          onClick={onOpenNovaVenda}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
        >
          <BadgeDollarSign className="w-4 h-4" />
          <span>Registrar Venda</span>
        </button>
      </div>

      {/* KPI Cards Financeiros Apple iOS */}
      {user?.role !== "VENDEDOR" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white border border-black/[0.06] rounded-2xl p-4.5 shadow-xs hover:shadow-sm transition-all">
            <span className="text-xs font-medium text-zinc-500 block mb-1">
              Faturamento Recebido (em Caixa)
            </span>
            <h3 className="text-2xl font-bold text-zinc-950 tracking-tight">
              {formatCurrency(totaisFinanceiros.faturamentoRecebido)}
            </h3>
            <span className="text-xs text-zinc-500 mt-1 block">
              {totaisFinanceiros.saldoTotalAReceber > 0 ? (
                <>
                  <strong className="text-amber-700 font-semibold">
                    +{formatCurrency(totaisFinanceiros.saldoTotalAReceber)} a receber
                  </strong>{" "}
                  ({formatCurrency(totaisFinanceiros.faturamentoContratado)} total)
                </>
              ) : (
                `100% recebido em ${vendas.length} venda(s)`
              )}
            </span>
          </div>

          <div className="bg-white border border-black/[0.06] rounded-2xl p-4.5 shadow-xs hover:shadow-sm transition-all">
            <span className="text-xs font-medium text-zinc-500 block mb-1">
              Custo dos Itens Vendidos
            </span>
            <h3 className="text-2xl font-bold text-zinc-700 tracking-tight">
              {formatCurrency(totaisFinanceiros.custoTotal)}
            </h3>
            <span className="text-xs text-zinc-400 mt-1 block">Compra + preparação</span>
          </div>

          <div className="bg-white border border-black/[0.06] rounded-2xl p-4.5 shadow-xs hover:shadow-sm transition-all">
            <span className="text-xs font-medium text-emerald-700 block mb-1">
              Lucro Líquido Realizado (em Caixa)
            </span>
            <h3 className={`text-2xl font-bold tracking-tight ${totaisFinanceiros.lucroRealizado >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {totaisFinanceiros.lucroRealizado >= 0 ? "+" : ""}{formatCurrency(totaisFinanceiros.lucroRealizado)}
            </h3>
            <span className="text-xs text-zinc-500 mt-1 block">
              {totaisFinanceiros.lucroPendente > 0 ? (
                <>
                  <strong className="text-amber-700 font-semibold">
                    +{formatCurrency(totaisFinanceiros.lucroPendente)} a prazo
                  </strong>{" "}
                  ({formatCurrency(totaisFinanceiros.lucroProjetado)} projetado)
                </>
              ) : (
                <span className="text-emerald-700 font-medium">
                  Margem líquida de {totaisFinanceiros.margemRealizadaPercent.toFixed(1)}%
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Lista de Vendas Clean com Estilo Apple iOS */}
      <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
            Histórico de Transações
          </h3>
          <span className="text-xs text-zinc-500 font-medium">{vendas.length} registro(s)</span>
        </div>

        {vendas.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            Nenhuma venda registrada até o momento. Clique em &quot;Registrar Venda&quot; para fechar negócio.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {vendas.map((venda) => {
              const veiculo = venda.veiculo || veiculos.find((v) => v.id === venda.veiculoId);
              const fin = calcularFinanceiroVenda(venda);

              return (
                <div
                  key={venda.id}
                  className="p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-zinc-50/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm font-semibold text-zinc-950">
                        {veiculo ? `${veiculo.marca} ${veiculo.modelo}` : "Item Comercializado"}
                      </strong>
                      {user?.role !== "VENDEDOR" && (
                        fin.temCaderno && !fin.quitado ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md border bg-amber-50 text-amber-800 border-amber-200">
                            {fin.lucroRealizado > 0 ? `+${formatCurrency(fin.lucroRealizado)} em caixa` : "R$ 0,00 em caixa"} (+{formatCurrency(fin.lucroPendente)} a prazo)
                          </span>
                        ) : (
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                              fin.lucroRealizado >= 0
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : "text-rose-700 bg-rose-50 border-rose-200"
                            }`}
                          >
                            {fin.lucroRealizado >= 0 ? "+" : ""}{formatCurrency(fin.lucroRealizado)} de Lucro Quitado
                          </span>
                        )
                      )}
                    </div>

                    <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-zinc-800 font-medium">{venda.cliente?.nome || "Cliente"}</span>
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{formatDate(venda.dataVenda)}</span>
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span>Pagamento: <strong className="text-zinc-700 font-medium">{venda.formaPagamento}</strong></span>
                      {venda.observacoes && (
                        <>
                          <span className="text-zinc-300">•</span>
                          <span className="text-zinc-500 italic max-w-xs truncate">{venda.observacoes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 block uppercase">Valor da Venda</span>
                      <strong className="text-base font-bold text-zinc-950">{formatCurrency(venda.valorVenda)}</strong>
                      {fin.temCaderno && !fin.quitado ? (
                        <div className="text-[10px] text-zinc-500">
                          <span className="text-emerald-700 font-semibold">{formatCurrency(fin.valorRecebido)} pago</span>
                          <span className="text-amber-700 font-semibold"> • {formatCurrency(fin.saldoPendente)} a prazo</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-600 font-medium">100% recebido</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {veiculo && (
                        <button
                          onClick={() => onOpenDocumentos(veiculo)}
                          title="Gerar Documentação / Contrato"
                          className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Docs</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleAbrirEditar(venda)}
                        title="Editar Detalhes da Venda"
                        className="w-7 h-7 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {user?.role !== "VENDEDOR" && (
                        <button
                          onClick={() => {
                            if (confirm(`Cancelar esta venda de ${formatCurrency(venda.valorVenda)}? O item voltará ao status DISPONÍVEL no estoque.`)) {
                              deleteVenda(venda.id);
                            }
                          }}
                          title="Cancelar / Excluir Venda"
                          className="w-7 h-7 rounded-xl bg-zinc-100 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Edição de Venda Apple iOS */}
      {vendaParaEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-black/[0.08] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <BadgeDollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-zinc-950">Editar Registro de Venda</h3>
              </div>
              <button
                onClick={() => setVendaParaEditar(null)}
                className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-900 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="p-5 space-y-3.5 text-xs text-zinc-900">
              <div>
                <label className="text-zinc-600 font-semibold block mb-1">Valor Final de Venda (R$) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  required
                  value={formatCurrencyInput(editValorVenda)}
                  onChange={(e) => {
                    const nv = parseCurrencyInput(e.target.value);
                    setEditValorVenda(nv);
                    if (editFormaPagamento === "FINANCIAMENTO") {
                      setEditValorFinanciado(Math.max(0, nv - editValorEntrada));
                    }
                  }}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-emerald-700 font-bold min-h-[42px] focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-600 font-semibold block mb-1">Forma de Pagamento</label>
                  <select
                    value={editFormaPagamento}
                    onChange={(e) => setEditFormaPagamento(e.target.value as FormaPagamento)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 min-h-[42px] text-zinc-900"
                  >
                    <option value="A_VISTA">Dinheiro à Vista</option>
                    <option value="PIX">PIX</option>
                    <option value="PARCELADO">Parcelado / A Prazo (A Receber)</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-600 font-semibold block mb-1">Valor de Entrada (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={formatCurrencyInput(editValorEntrada)}
                    onChange={(e) => setEditValorEntrada(parseCurrencyInput(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 min-h-[42px] text-zinc-900 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-600 font-semibold block mb-1">Observações da Venda</label>
                <input
                  type="text"
                  placeholder="Observações da transação"
                  value={editObs}
                  onChange={(e) => setEditObs(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 min-h-[42px] text-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setVendaParaEditar(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
