import { Venda, ParcelaReceber } from "@/types";
import { getLocalISODate } from "./utils";

export interface ResumoFinanceiroVenda {
  temCaderno: boolean;
  dividaInicial: number;
  totalAbatido: number;
  saldoPendente: number;
  quitado: boolean;
  parcelasVencidas: ParcelaReceber[];
  proximaParcela?: ParcelaReceber;

  valorTotal: number;
  custoTotal: number;
  valorRecebido: number;

  lucroProjetado: number;
  lucroRealizado: number;
  lucroPendente: number;
  margemProjetadaPercent: number;
  margemRealizadaPercent: number;
}

export interface TotaisFinanceiros {
  totalVendas: number;
  faturamentoContratado: number;
  faturamentoRecebido: number;
  saldoTotalAReceber: number;
  custoTotal: number;
  lucroRealizado: number;
  lucroPendente: number;
  lucroProjetado: number;
  margemRealizadaPercent: number;
  margemProjetadaPercent: number;
}

/**
 * Calcula a posição financeira exata de uma venda.
 * Regra: Se a venda foi a prazo e o dinheiro ainda não entrou (saldo a receber pendente),
 * esse valor não é considerado como lucro realizado. O dinheiro recebido cobre
 * primeiramente os custos do veículo; apenas o valor recebido além do custo total
 * é contabilizado como lucro efetivo/realizado em caixa.
 */
export function calcularFinanceiroVenda(venda: Venda): ResumoFinanceiroVenda {
  const valorTotal = Number(venda.valorVenda) || 0;
  const custoTotal = Number(venda.custoTotal) || 0;
  const lucroProjetado = Math.round((valorTotal - custoTotal) * 100) / 100;

  const temCaderno = Boolean(
    venda.formaPagamento === "PARCELADO" ||
      (venda.saldoDevedorInicial !== undefined && Number(venda.saldoDevedorInicial) > 0) ||
      (venda.parcelas && venda.parcelas.length > 0) ||
      (venda.abatimentos && venda.abatimentos.length > 0)
  );

  let dividaInicial = 0;
  let totalAbatido = 0;
  let saldoPendente = 0;
  let quitado = true;
  let parcelasVencidas: ParcelaReceber[] = [];
  let proximaParcela: ParcelaReceber | undefined = undefined;

  if (temCaderno) {
    dividaInicial =
      venda.saldoDevedorInicial !== undefined && Number(venda.saldoDevedorInicial) > 0
        ? Number(venda.saldoDevedorInicial)
        : Math.max(
            0,
            valorTotal - Number(venda.valorEntrada || 0) - Number(venda.valorTroca || 0)
          );

    totalAbatido = (venda.abatimentos || []).reduce(
      (acc, a) => acc + Number(a.valor || 0),
      0
    );

    saldoPendente = Math.max(0, Math.round((dividaInicial - totalAbatido) * 100) / 100);
    quitado = saldoPendente <= 0.01;

    const hoje = getLocalISODate();
    const parcelas = venda.parcelas || [];
    const parcelasEmAberto = quitado ? [] : parcelas.filter((p) => !p.pago);
    parcelasVencidas = parcelasEmAberto.filter((p) => p.dataVencimento < hoje);
    proximaParcela = [...parcelasEmAberto].sort((a, b) =>
      a.dataVencimento.localeCompare(b.dataVencimento)
    )[0];
  }

  // Dinheiro que efetivamente entrou no caixa (valor total da venda menos o saldo pendente a receber)
  const valorRecebido = temCaderno
    ? Math.max(0, Math.round((valorTotal - saldoPendente) * 100) / 100)
    : valorTotal;

  // Cálculo do Lucro Realizado (Regime de Caixa com amortização do custo do veículo)
  let lucroRealizado = 0;
  let lucroPendente = 0;

  if (lucroProjetado <= 0) {
    // Venda com prejuízo ou margem zero: prejuízo é assumido integralmente
    lucroRealizado = lucroProjetado;
    lucroPendente = 0;
  } else {
    // Venda com lucro:
    // O valor recebido cobre primeiramente o custo do bem vendido.
    // Somente o que exceder o custo total é lucro realizado em caixa.
    if (valorRecebido <= custoTotal) {
      lucroRealizado = 0;
      lucroPendente = lucroProjetado;
    } else {
      lucroRealizado = Math.min(
        lucroProjetado,
        Math.round((valorRecebido - custoTotal) * 100) / 100
      );
      lucroPendente = Math.max(
        0,
        Math.round((lucroProjetado - lucroRealizado) * 100) / 100
      );
    }
  }

  const margemProjetadaPercent = valorTotal > 0 ? (lucroProjetado / valorTotal) * 100 : 0;
  const margemRealizadaPercent = valorTotal > 0 ? (lucroRealizado / valorTotal) * 100 : 0;

  return {
    temCaderno,
    dividaInicial,
    totalAbatido,
    saldoPendente,
    quitado,
    parcelasVencidas,
    proximaParcela,

    valorTotal,
    custoTotal,
    valorRecebido,

    lucroProjetado,
    lucroRealizado,
    lucroPendente,
    margemProjetadaPercent,
    margemRealizadaPercent,
  };
}

/**
 * Agrega e consolida os totais de uma lista de vendas.
 */
export function calcularTotaisFinanceiros(vendas: Venda[]): TotaisFinanceiros {
  let faturamentoContratado = 0;
  let faturamentoRecebido = 0;
  let saldoTotalAReceber = 0;
  let custoTotal = 0;
  let lucroRealizado = 0;
  let lucroPendente = 0;
  let lucroProjetado = 0;

  vendas.forEach((v) => {
    const res = calcularFinanceiroVenda(v);
    faturamentoContratado += res.valorTotal;
    faturamentoRecebido += res.valorRecebido;
    saldoTotalAReceber += res.saldoPendente;
    custoTotal += res.custoTotal;
    lucroRealizado += res.lucroRealizado;
    lucroPendente += res.lucroPendente;
    lucroProjetado += res.lucroProjetado;
  });

  const margemRealizadaPercent =
    faturamentoRecebido > 0 ? (lucroRealizado / faturamentoRecebido) * 100 : 0;
  const margemProjetadaPercent =
    faturamentoContratado > 0 ? (lucroProjetado / faturamentoContratado) * 100 : 0;

  return {
    totalVendas: vendas.length,
    faturamentoContratado: Math.round(faturamentoContratado * 100) / 100,
    faturamentoRecebido: Math.round(faturamentoRecebido * 100) / 100,
    saldoTotalAReceber: Math.round(saldoTotalAReceber * 100) / 100,
    custoTotal: Math.round(custoTotal * 100) / 100,
    lucroRealizado: Math.round(lucroRealizado * 100) / 100,
    lucroPendente: Math.round(lucroPendente * 100) / 100,
    lucroProjetado: Math.round(lucroProjetado * 100) / 100,
    margemRealizadaPercent,
    margemProjetadaPercent,
  };
}
