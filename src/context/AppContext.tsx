"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  Veiculo, 
  Cliente, 
  ModeloDocumento, 
  Venda, 
  DocumentoGerado, 
  DespesaVeiculo,
  ParcelaReceber,
  AbatimentoReceber
} from "@/types";
import { initialModelosDocumentos } from "@/lib/initialData";
import { getLocalISODate } from "@/lib/utils";

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function roundCurrency(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function safeLoadCollection<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
    localStorage.setItem(`${key}_corrupted_backup`, raw);
    return fallback;
  } catch (err) {
    console.error(`Erro ao ler coleção ${key} do localStorage. Backup salvo em ${key}_corrupted_backup:`, err);
    try {
      localStorage.setItem(`${key}_corrupted_backup`, raw);
    } catch {
      // ignora erro secundário de quota
    }
    return fallback;
  }
}

let quotaAlertShown = false;
function safeSaveCollection(key: string, data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    quotaAlertShown = false;
  } catch (err) {
    console.error(`Falha ao salvar coleção ${key} no localStorage:`, err);
    if (!quotaAlertShown) {
      quotaAlertShown = true;
      alert(
        "Atenção: O limite de armazenamento do navegador foi atingido (ex.: excesso de fotos pesadas). Exporte um Backup JSON imediatamente e remova fotos desnecessárias."
      );
    }
  }
}

async function postSync(action: string, entity?: string, data?: unknown, id?: string, parentId?: string) {
  try {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, entity, data, id, parentId }),
    });
  } catch (err) {
    console.warn("Sincronização com PostgreSQL pendente:", err);
  }
}

interface AppContextType {
  veiculos: Veiculo[];
  clientes: Cliente[];
  modelos: ModeloDocumento[];
  vendas: Venda[];
  documentosGerados: DocumentoGerado[];

  // Veículos
  addVeiculo: (veiculo: Omit<Veiculo, "id" | "createdAt" | "updatedAt" | "custoTotal">) => Veiculo;
  updateVeiculo: (id: string, data: Partial<Veiculo>) => void;
  deleteVeiculo: (id: string) => void;
  addDespesa: (veiculoId: string, despesa: Omit<DespesaVeiculo, "id" | "veiculoId" | "createdAt">) => void;
  updateDespesa: (veiculoId: string, despesaId: string, data: Partial<DespesaVeiculo>) => void;
  deleteDespesa: (veiculoId: string, despesaId: string) => void;

  // Clientes
  addCliente: (cliente: Omit<Cliente, "id" | "createdAt" | "updatedAt">) => Cliente;
  updateCliente: (id: string, data: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;

  // Vendas
  registrarVenda: (vendaData: {
    veiculoId: string;
    clienteId: string;
    valorVenda: number;
    formaPagamento: Venda["formaPagamento"];
    valorEntrada?: number;
    valorFinanciado?: number;
    bancoFinanciador?: string;
    veiculoTroca?: {
      marca: string;
      modelo: string;
      anoFabricacao: number;
      anoModelo: number;
      placa?: string;
      valorAvaliacao: number;
    };
    saldoDevedorInicial?: number;
    parcelas?: ParcelaReceber[];
    abatimentos?: AbatimentoReceber[];
    anotacoesCaderno?: string;
    observacoes?: string;
  }) => Venda;
  updateVenda: (id: string, data: Partial<Venda>) => void;
  deleteVenda: (id: string) => void;

  // Modelos de Documentos
  addModelo: (modelo: Omit<ModeloDocumento, "id" | "updatedAt">) => ModeloDocumento;
  updateModelo: (id: string, data: Partial<ModeloDocumento>) => void;
  deleteModelo: (id: string) => void;

  // Documentos Gerados
  salvarDocumentoGerado: (doc: Omit<DocumentoGerado, "id" | "createdAt">) => DocumentoGerado;
  deleteDocumentoGerado: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modelos, setModelos] = useState<ModeloDocumento[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [documentosGerados, setDocumentosGerados] = useState<DocumentoGerado[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Inicializa dados do localStorage com isolamento de falhas por chave e seed de modelos padrão
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SEED_KEY = "rb_prod_clean_v8";
      const alreadySeeded = localStorage.getItem(SEED_KEY);

      if (!alreadySeeded) {
        safeSaveCollection(SEED_KEY, true);
        safeSaveCollection("rb_veiculos", []);
        safeSaveCollection("rb_clientes", []);
        safeSaveCollection("rb_modelos", initialModelosDocumentos);
        safeSaveCollection("rb_vendas", []);
        safeSaveCollection("rb_documentos_gerados", []);

        setVeiculos([]);
        setClientes([]);
        setModelos(initialModelosDocumentos);
        setVendas([]);
        setDocumentosGerados([]);
        setLoaded(true);
        return;
      }

      const parsedVeiculos = safeLoadCollection<Veiculo>("rb_veiculos", []);
      const parsedClientes = safeLoadCollection<Cliente>("rb_clientes", []);
      const parsedModelosRaw = safeLoadCollection<ModeloDocumento>("rb_modelos", []);
      const parsedVendas = safeLoadCollection<Venda>("rb_vendas", []);
      const parsedDocs = safeLoadCollection<DocumentoGerado>("rb_documentos_gerados", []);

      const MODELOS_SEED_KEY = "rb_modelos_padrao_v3";
      const modelosPadraoAtualizados = localStorage.getItem(MODELOS_SEED_KEY);
      let parsedModelos = parsedModelosRaw.length > 0 ? parsedModelosRaw : initialModelosDocumentos;

      if (!modelosPadraoAtualizados) {
        localStorage.setItem(MODELOS_SEED_KEY, "true");
        const idsAntigosPadrao = new Set([
          "mod-procuracao-detran",
          "mod-contrato-compra-venda",
          "mod-termo-entrega",
        ]);
        const customizados = parsedModelos.filter((m) => !idsAntigosPadrao.has(m.id));
        parsedModelos = [...initialModelosDocumentos, ...customizados];
        safeSaveCollection("rb_modelos", parsedModelos);
      }

      setVeiculos(parsedVeiculos);
      setClientes(parsedClientes);
      setModelos(parsedModelos);
      setVendas(parsedVendas);
      setDocumentosGerados(parsedDocs);
      setLoaded(true);

      // Sincronização inteligente com PostgreSQL se DATABASE_URL estiver configurada
      fetch("/api/sync")
        .then((res) => res.json())
        .then((result) => {
          if (result?.connected && result?.data) {
            const d = result.data;
            if (
              (d.veiculos && d.veiculos.length > 0) ||
              (d.clientes && d.clientes.length > 0) ||
              (d.vendas && d.vendas.length > 0)
            ) {
              setVeiculos(d.veiculos);
              setClientes(d.clientes);
              if (d.modelos && d.modelos.length > 0) setModelos(d.modelos);
              setVendas(d.vendas);
              setDocumentosGerados(d.documentosGerados || []);
            } else if (parsedVeiculos.length > 0 || parsedClientes.length > 0) {
              postSync("seed_migration", undefined, {
                veiculos: parsedVeiculos,
                clientes: parsedClientes,
                modelos: parsedModelos,
                vendas: parsedVendas,
                documentosGerados: parsedDocs,
              });
            }
          }
        })
        .catch(() => {
          // Fallback offline / localStorage
        });
    }
  }, []);

  // Persiste no localStorage de forma isolada e segura contra QuotaExceededError
  useEffect(() => {
    if (loaded && typeof window !== "undefined") {
      safeSaveCollection("rb_veiculos", veiculos);
      safeSaveCollection("rb_clientes", clientes);
      safeSaveCollection("rb_modelos", modelos);
      safeSaveCollection("rb_vendas", vendas);
      safeSaveCollection("rb_documentos_gerados", documentosGerados);
    }
  }, [veiculos, clientes, modelos, vendas, documentosGerados, loaded]);

  // Sincroniza vendas associadas quando o custo ou dados de um veículo vendido mudam
  const syncVendasDoVeiculo = (veiculoAtualizado: Veiculo) => {
    const novoCustoTotal = roundCurrency(
      veiculoAtualizado.custoTotal ?? veiculoAtualizado.valorAquisicao
    );
    setVendas((prev) =>
      prev.map((vd) => {
        if (vd.veiculoId === veiculoAtualizado.id) {
          return {
            ...vd,
            veiculo: veiculoAtualizado,
            custoTotal: novoCustoTotal,
            margemLucro: roundCurrency(vd.valorVenda - novoCustoTotal),
          };
        }
        return vd;
      })
    );
  };

  const addVeiculo = (data: Omit<Veiculo, "id" | "createdAt" | "updatedAt" | "custoTotal">): Veiculo => {
    const totalDespesas = roundCurrency(
      (data.despesas || []).reduce((acc, d) => acc + Number(d.valor || 0), 0)
    );
    const valorAquisicao = roundCurrency(Number(data.valorAquisicao || 0));
    const novoVeiculo: Veiculo = {
      ...data,
      valorAquisicao,
      precoAnunciado: roundCurrency(Number(data.precoAnunciado || 0)),
      id: generateId("v"),
      custoTotal: roundCurrency(valorAquisicao + totalDespesas),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setVeiculos((prev) => [novoVeiculo, ...prev]);
    postSync("save_veiculo", "veiculo", novoVeiculo);
    return novoVeiculo;
  };

  const updateVeiculo = (id: string, data: Partial<Veiculo>) => {
    let veiculoSincronizado: Veiculo | null = null;
    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const updated: Veiculo = {
            ...v,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          const totalDespesas = roundCurrency(
            (updated.despesas || []).reduce((acc, d) => acc + Number(d.valor || 0), 0)
          );
          updated.valorAquisicao = roundCurrency(Number(updated.valorAquisicao || 0));
          updated.precoAnunciado = roundCurrency(Number(updated.precoAnunciado || 0));
          updated.custoTotal = roundCurrency(updated.valorAquisicao + totalDespesas);
          veiculoSincronizado = updated;
          return updated;
        }
        return v;
      })
    );
    if (veiculoSincronizado) {
      syncVendasDoVeiculo(veiculoSincronizado);
      postSync("save_veiculo", "veiculo", veiculoSincronizado);
    }
  };

  const deleteVeiculo = (id: string) => {
    if (vendas.some((vd) => vd.veiculoId === id)) {
      alert(
        "Não é possível excluir um veículo que possui venda registrada. Caso deseje removê-lo, cancele primeiro a venda correspondente na aba Vendas."
      );
      return;
    }
    setVeiculos((prev) => prev.filter((v) => v.id !== id));
    postSync("delete_veiculo", "veiculo", undefined, id);
  };

  const addDespesa = (veiculoId: string, despesaData: Omit<DespesaVeiculo, "id" | "veiculoId" | "createdAt">) => {
    const novaDespesa: DespesaVeiculo = {
      ...despesaData,
      valor: roundCurrency(Number(despesaData.valor || 0)),
      id: generateId("d"),
      veiculoId,
      createdAt: new Date().toISOString(),
    };

    let veiculoSincronizado: Veiculo | null = null;
    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId) {
          const despesasAtuais = v.despesas || [];
          const novasDespesas = [...despesasAtuais, novaDespesa];
          const totalDespesas = roundCurrency(
            novasDespesas.reduce((acc, d) => acc + Number(d.valor || 0), 0)
          );
          const custoTotal = roundCurrency(Number(v.valorAquisicao) + totalDespesas);
          const updated: Veiculo = {
            ...v,
            despesas: novasDespesas,
            custoTotal,
            updatedAt: new Date().toISOString(),
          };
          veiculoSincronizado = updated;
          return updated;
        }
        return v;
      })
    );
    if (veiculoSincronizado) {
      syncVendasDoVeiculo(veiculoSincronizado);
      postSync("save_despesa", "despesa", novaDespesa, undefined, veiculoId);
    }
  };

  const deleteDespesa = (veiculoId: string, despesaId: string) => {
    let veiculoSincronizado: Veiculo | null = null;
    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId) {
          const despesasFiltradas = (v.despesas || []).filter((d) => d.id !== despesaId);
          const totalDespesas = roundCurrency(
            despesasFiltradas.reduce((acc, d) => acc + Number(d.valor || 0), 0)
          );
          const custoTotal = roundCurrency(Number(v.valorAquisicao) + totalDespesas);
          const updated: Veiculo = {
            ...v,
            despesas: despesasFiltradas,
            custoTotal,
            updatedAt: new Date().toISOString(),
          };
          veiculoSincronizado = updated;
          return updated;
        }
        return v;
      })
    );
    if (veiculoSincronizado) {
      syncVendasDoVeiculo(veiculoSincronizado);
      postSync("delete_despesa", "despesa", undefined, despesaId);
    }
  };

  const updateDespesa = (veiculoId: string, despesaId: string, data: Partial<DespesaVeiculo>) => {
    let veiculoSincronizado: Veiculo | null = null;
    let despesaAtualizada: DespesaVeiculo | null = null;
    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId) {
          const despesasAtualizadas = (v.despesas || []).map((d) => {
            if (d.id === despesaId) {
              despesaAtualizada = { ...d, ...data, valor: data.valor !== undefined ? roundCurrency(Number(data.valor)) : d.valor };
              return despesaAtualizada;
            }
            return d;
          });
          const totalDespesas = roundCurrency(
            despesasAtualizadas.reduce((acc, d) => acc + Number(d.valor || 0), 0)
          );
          const custoTotal = roundCurrency(Number(v.valorAquisicao) + totalDespesas);
          const updated: Veiculo = {
            ...v,
            despesas: despesasAtualizadas,
            custoTotal,
            updatedAt: new Date().toISOString(),
          };
          veiculoSincronizado = updated;
          return updated;
        }
        return v;
      })
    );
    if (veiculoSincronizado) {
      syncVendasDoVeiculo(veiculoSincronizado);
      if (despesaAtualizada) {
        postSync("save_despesa", "despesa", despesaAtualizada, undefined, veiculoId);
      }
    }
  };

  const addCliente = (data: Omit<Cliente, "id" | "createdAt" | "updatedAt">): Cliente => {
    const novoCliente: Cliente = {
      ...data,
      id: generateId("c"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setClientes((prev) => [novoCliente, ...prev]);
    postSync("save_cliente", "cliente", novoCliente);
    return novoCliente;
  };

  const updateCliente = (id: string, data: Partial<Cliente>) => {
    let clienteAtualizado: Cliente | null = null;
    setClientes((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          clienteAtualizado = { ...c, ...data, updatedAt: new Date().toISOString() };
          return clienteAtualizado;
        }
        return c;
      })
    );
    if (clienteAtualizado) {
      const snap = clienteAtualizado;
      setVendas((prev) =>
        prev.map((vd) => (vd.clienteId === id ? { ...vd, cliente: snap } : vd))
      );
      postSync("save_cliente", "cliente", clienteAtualizado);
    }
  };

  const deleteCliente = (id: string) => {
    if (vendas.some((vd) => vd.clienteId === id) || documentosGerados.some((doc) => doc.clienteId === id)) {
      alert(
        "Não é possível excluir este cliente pois ele possui vendas ou documentos jurídicos vinculados no histórico."
      );
      return;
    }
    setClientes((prev) => prev.filter((c) => c.id !== id));
    postSync("delete_cliente", "cliente", undefined, id);
  };

  const registrarVenda = (vendaData: {
    veiculoId: string;
    clienteId: string;
    valorVenda: number;
    formaPagamento: Venda["formaPagamento"];
    valorEntrada?: number;
    valorFinanciado?: number;
    bancoFinanciador?: string;
    veiculoTroca?: {
      marca: string;
      modelo: string;
      anoFabricacao: number;
      anoModelo: number;
      placa?: string;
      valorAvaliacao: number;
    };
    saldoDevedorInicial?: number;
    parcelas?: ParcelaReceber[];
    abatimentos?: AbatimentoReceber[];
    anotacoesCaderno?: string;
    observacoes?: string;
  }): Venda => {
    const veiculoVendido = veiculos.find((v) => v.id === vendaData.veiculoId);
    if (!veiculoVendido) {
      throw new Error("Veículo selecionado não foi encontrado no estoque.");
    }
    if (veiculoVendido.status === "VENDIDO") {
      throw new Error("Este veículo já consta como vendido.");
    }

    const cliente = clientes.find((c) => c.id === vendaData.clienteId);
    const totalDespesas = roundCurrency(
      (veiculoVendido.despesas || []).reduce((acc, d) => acc + Number(d.valor || 0), 0)
    );
    const custoTotal = roundCurrency(veiculoVendido.custoTotal ?? (veiculoVendido.valorAquisicao + totalDespesas));
    const valorVenda = roundCurrency(Number(vendaData.valorVenda));
    const margemLucro = roundCurrency(valorVenda - custoTotal);

    // Se houve veículo na troca, cadastra-o automaticamente no estoque
    let veiculoTrocaCriado: Veiculo | undefined = undefined;
    const valorTroca = vendaData.veiculoTroca?.valorAvaliacao
      ? roundCurrency(vendaData.veiculoTroca.valorAvaliacao)
      : undefined;

    if (vendaData.veiculoTroca && valorTroca && valorTroca > 0) {
      const { veiculoTroca } = vendaData;
      veiculoTrocaCriado = addVeiculo({
        categoria: "Picape",
        marca: veiculoTroca.marca,
        modelo: veiculoTroca.modelo,
        anoFabricacao: veiculoTroca.anoFabricacao,
        anoModelo: veiculoTroca.anoModelo,
        cor: "Não especificada",
        dataEntrada: getLocalISODate(),
        valorAquisicao: valorTroca,
        precoAnunciado: roundCurrency(valorTroca * 1.15), // Sugere margem inicial de 15%
        status: "PREPARACAO",
        placa: veiculoTroca.placa,
        observacoes: `Veículo recebido na troca pela venda do item ${veiculoVendido.marca} ${veiculoVendido.modelo}.`,
      });
    }

    const veiculoVendidoSnapshot: Veiculo = {
      ...veiculoVendido,
      status: "VENDIDO",
      custoTotal,
      updatedAt: new Date().toISOString(),
    };

    const novaVenda: Venda = {
      id: generateId("vd"),
      veiculoId: vendaData.veiculoId,
      veiculo: veiculoVendidoSnapshot,
      clienteId: vendaData.clienteId,
      cliente,
      dataVenda: getLocalISODate(),
      valorVenda,
      custoTotal,
      margemLucro,
      formaPagamento: vendaData.formaPagamento,
      valorEntrada: roundCurrency(Number(vendaData.valorEntrada || 0)),
      valorFinanciado: roundCurrency(Number(vendaData.valorFinanciado || 0)),
      bancoFinanciador: vendaData.bancoFinanciador,
      valorTroca,
      veiculoTrocaId: veiculoTrocaCriado?.id,
      veiculoTroca: veiculoTrocaCriado,
      saldoDevedorInicial: vendaData.saldoDevedorInicial !== undefined
        ? roundCurrency(Number(vendaData.saldoDevedorInicial))
        : undefined,
      parcelas: vendaData.parcelas,
      abatimentos: vendaData.abatimentos || [],
      anotacoesCaderno: vendaData.anotacoesCaderno,
      observacoes: vendaData.observacoes,
      createdAt: new Date().toISOString(),
    };

    // Atualiza status do veículo vendido
    updateVeiculo(vendaData.veiculoId, { status: "VENDIDO" });

    setVendas((prev) => [novaVenda, ...prev]);
    postSync("save_venda", "venda", novaVenda);
    return novaVenda;
  };

  const updateVenda = (id: string, data: Partial<Venda>) => {
    let vendaAtualizada: Venda | null = null;
    setVendas((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const updated = { ...v, ...data };
          if (data.valorVenda !== undefined) {
            updated.valorVenda = roundCurrency(Number(data.valorVenda));
            updated.margemLucro = roundCurrency(updated.valorVenda - updated.custoTotal);
          }
          if (data.valorEntrada !== undefined) {
            updated.valorEntrada = roundCurrency(Number(data.valorEntrada));
          }
          if (data.valorFinanciado !== undefined) {
            updated.valorFinanciado = roundCurrency(Number(data.valorFinanciado));
          }
          vendaAtualizada = updated;
          return updated;
        }
        return v;
      })
    );
    if (vendaAtualizada) {
      postSync("save_venda", "venda", vendaAtualizada);
    }
  };

  const deleteVenda = (id: string) => {
    const venda = vendas.find((v) => v.id === id);
    if (venda) {
      updateVeiculo(venda.veiculoId, { status: "DISPONIVEL" });
      if (venda.veiculoTrocaId) {
        const trocaJaVendida = vendas.some(
          (other) => other.id !== id && other.veiculoId === venda.veiculoTrocaId
        );
        if (!trocaJaVendida) {
          setVeiculos((prev) => prev.filter((v) => v.id !== venda.veiculoTrocaId));
        }
      }
    }
    setVendas((prev) => prev.filter((v) => v.id !== id));
    postSync("delete_venda", "venda", undefined, id);
  };

  const addModelo = (data: Omit<ModeloDocumento, "id" | "updatedAt">): ModeloDocumento => {
    const novoModelo: ModeloDocumento = {
      ...data,
      id: generateId("m"),
      updatedAt: new Date().toISOString(),
    };
    setModelos((prev) => [...prev, novoModelo]);
    postSync("save_modelo", "modelo", novoModelo);
    return novoModelo;
  };

  const updateModelo = (id: string, data: Partial<ModeloDocumento>) => {
    let modeloAtualizado: ModeloDocumento | null = null;
    setModelos((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          modeloAtualizado = { ...m, ...data, updatedAt: new Date().toISOString() };
          return modeloAtualizado;
        }
        return m;
      })
    );
    if (modeloAtualizado) {
      postSync("save_modelo", "modelo", modeloAtualizado);
    }
  };

  const deleteModelo = (id: string) => {
    setModelos((prev) => prev.filter((m) => m.id !== id));
    postSync("delete_modelo", "modelo", undefined, id);
  };

  const salvarDocumentoGerado = (data: Omit<DocumentoGerado, "id" | "createdAt">): DocumentoGerado => {
    const novoDoc: DocumentoGerado = {
      ...data,
      id: generateId("doc"),
      createdAt: new Date().toISOString(),
    };
    setDocumentosGerados((prev) => [novoDoc, ...prev]);
    postSync("save_documento", "documento", novoDoc);
    return novoDoc;
  };

  const deleteDocumentoGerado = (id: string) => {
    setDocumentosGerados((prev) => prev.filter((d) => d.id !== id));
    postSync("delete_documento", "documento", undefined, id);
  };

  return (
    <AppContext.Provider
      value={{
        veiculos,
        clientes,
        modelos,
        vendas,
        documentosGerados,
        addVeiculo,
        updateVeiculo,
        deleteVeiculo,
        addDespesa,
        updateDespesa,
        deleteDespesa,
        addCliente,
        updateCliente,
        deleteCliente,
        registrarVenda,
        updateVenda,
        deleteVenda,
        addModelo,
        updateModelo,
        deleteModelo,
        salvarDocumentoGerado,
        deleteDocumentoGerado,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp deve ser utilizado dentro de um AppProvider");
  }
  return context;
}
