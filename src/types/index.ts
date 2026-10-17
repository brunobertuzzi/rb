export type StatusVeiculo = "DISPONIVEL" | "PREPARACAO" | "RESERVADO" | "VENDIDO" | "DEVOLVIDO";
export type TipoPessoa = "FISICA" | "JURIDICA";
export type FormaPagamento = "A_VISTA" | "PIX" | "TRANSFERENCIA" | "FINANCIAMENTO" | "TROCA_E_SALDO" | "PARCELADO";

export interface DespesaVeiculo {
  id: string;
  veiculoId: string;
  descricao: string;
  tipoDespesa: string; // OFICINA, PINTURA, PNEUS, LAVAGEM, TRANSPORTE, DOCUMENTACAO, OUTROS
  valor: number;
  dataDespesa: string;
  fornecedorNome?: string;
  notaFiscal?: string;
  createdAt: string;
}

export interface FotoVeiculo {
  id: string;
  veiculoId: string;
  url: string;
  isCapa: boolean;
  ordem: number;
}

export interface Veiculo {
  id: string;
  categoria: string;
  marca: string;
  modelo: string;
  versao?: string;
  anoFabricacao: number;
  anoModelo: number;
  cor: string;
  dataEntrada: string;
  valorAquisicao: number;
  precoAnunciado: number;
  valorFipe?: number;
  codigoFipe?: string;
  mesReferenciaFipe?: string;
  status: StatusVeiculo;
  observacoes?: string;

  // Veículos Rodoviários
  placa?: string;
  renavam?: string;
  chassi?: string;
  quilometragem?: number;
  combustivel?: string;
  cambio?: string;

  // Relações e agregados
  fotoCapa?: string;
  fotos?: FotoVeiculo[];
  despesas?: DespesaVeiculo[];
  custoTotal?: number; // Calculado: valorAquisicao + soma(despesas)
  createdAt: string;
  updatedAt: string;
}

export interface Cliente {
  id: string;
  tipoPessoa: TipoPessoa;
  nome: string;
  cpfCnpj: string;
  telefone: string;
  cidade: string;
  estadoUf: string;
  estadoCivil?: string;
  profissao?: string;
  endereco?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParcelaReceber {
  id: string;
  numero: number;
  valor: number;
  dataVencimento: string;
  pago: boolean;
  dataPagamento?: string;
  observacao?: string;
}

export interface AbatimentoReceber {
  id: string;
  valor: number;
  data: string;
  observacao?: string;
  parcelaId?: string;
}

export interface Venda {
  id: string;
  veiculoId: string;
  veiculo?: Veiculo;
  clienteId: string;
  cliente?: Cliente;
  dataVenda: string;
  valorVenda: number;
  custoTotal: number;
  margemLucro: number;
  formaPagamento: FormaPagamento;
  valorEntrada: number;
  valorFinanciado: number;
  bancoFinanciador?: string;
  valorTroca?: number;
  veiculoTrocaId?: string;
  veiculoTroca?: Veiculo;
  saldoDevedorInicial?: number;
  parcelas?: ParcelaReceber[];
  abatimentos?: AbatimentoReceber[];
  anotacoesCaderno?: string;
  observacoes?: string;
  createdAt: string;
}

export interface ModeloDocumento {
  id: string;
  titulo: string;
  conteudo: string;
  isPadrao: boolean;
  updatedAt: string;
}

export interface DocumentoGerado {
  id: string;
  modeloId: string;
  clienteId: string;
  veiculoId: string;
  outorgadoId?: string;
  vendaId?: string;
  titulo: string;
  conteudoFinal: string;
  pdfUrl?: string;
  createdAt: string;
}
