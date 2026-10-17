import { Veiculo, Cliente, ModeloDocumento } from "@/types";

export const initialVeiculos: Veiculo[] = [];

export const initialClientes: Cliente[] = [];

export const initialModelosDocumentos: ModeloDocumento[] = [
  {
    id: "mod-procuracao-detran",
    titulo: "Procuração Particular - Plenos Poderes (DETRAN / CRVA)",
    isPadrao: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    conteudo: `PROCURAÇÃO

Por este instrumento particular eu, {{cliente_nome}}, CPF {{cliente_cpf_cnpj}}, brasileiro(a), {{cliente_estado_civil}}, {{cliente_profissao}}, residente e domiciliado(a) na {{cliente_endereco}}, no município de {{cliente_cidade}}/{{cliente_uf}}, nomeio e constituo meu PROCURADOR o(a) Sr(a). {{outorgado_nome}}, CPF {{outorgado_cpf_cnpj}}, brasileiro(a), {{outorgado_estado_civil}}, {{outorgado_profissao}}, residente e domiciliado(a) na {{outorgado_endereco}}, no município de {{outorgado_cidade}}/{{outorgado_uf}}, para o fim especial de receber o preço da venda, dar recibos ou quitações, assinar requerimentos e termos de transferência para si ou para terceiros, alterar características e representá-lo para realizar laudo de INMETRO, retirar veículo de depósito, endosso de documentação, alienar fiduciariamente, assinar declaração de endereço, firmar contrato de reserva de domínio para si ou para terceiros, tirar segunda via do CRV e CRLV, solicitar DCPPO e alterar o endereço de entrega, usar o veículo em apreço em qualquer lugar do território nacional ou estrangeiro. Assinar a ATPV-E como comprador. Transferir para seu próprio nome. Solicitar o ATPV-E. Realizar vistoria. Praticar, enfim, os mais amplos e ilimitados poderes para o fiel cumprimento do presente mandato, podendo ainda substabelecer, com ou sem reserva de poderes do veículo: {{veiculo_marca}}/{{veiculo_modelo}}, RENAVAM: {{veiculo_renavam}}, PLACA: {{veiculo_placa}}, ANO/MODELO: {{veiculo_ano}}, COR: {{veiculo_cor}}, CHASSI: {{veiculo_chassi}}, podendo assinar inclusive o BCVA (boletim de cadastro de veículo automotor), junto ao CRVA. 


{{cidade_data_extenso}};




_______________________________`,
  },
];
