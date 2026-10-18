"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Veiculo, StatusVeiculo } from "@/types";
import { getLocalISODate, formatCurrencyInput, parseCurrencyInput, formatCurrency } from "@/lib/utils";
import { 
  X, 
  Car, 
  Save, 
  Camera, 
  Trash2,
  FileUp,
  FileText,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";

interface FipeOption {
  code: string;
  name: string;
}

interface VeiculoFormModalProps {
  veiculoParaEditar?: Veiculo | null;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIAS_RODOVIARIO = [
  "Picape",
  "SUV",
  "Carro de Passeio",
  "Utilitário / Van",
  "Caminhão",
];

async function compressImageToDataUrl(file: File, maxDimension = 900, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo de imagem."));
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) {
        reject(new Error("Imagem vazia."));
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function VeiculoFormModal({ veiculoParaEditar, isOpen, onClose }: VeiculoFormModalProps) {
  const { veiculos, addVeiculo, updateVeiculo, clientes, addCliente } = useApp();
  const { user } = useAuth();

  const [categoria, setCategoria] = useState<string>("");
  const [marca, setMarca] = useState<string>("");
  const [modelo, setModelo] = useState<string>("");
  const [versao, setVersao] = useState<string>("");
  const [anoFabricacao, setAnoFabricacao] = useState<number | "">("");
  const [anoModelo, setAnoModelo] = useState<number | "">("");
  const [cor, setCor] = useState<string>("");
  const [valorAquisicao, setValorAquisicao] = useState<number>(0);
  const [precoAnunciado, setPrecoAnunciado] = useState<number>(0);
  const [valorFipe, setValorFipe] = useState<number>(0);
  const [codigoFipe, setCodigoFipe] = useState<string>("");
  const [mesReferenciaFipe, setMesReferenciaFipe] = useState<string>("");
  const [status, setStatus] = useState<StatusVeiculo>("DISPONIVEL");
  const [fotoCapa, setFotoCapa] = useState<string>("");
  const [fotosAdicionais, setFotosAdicionais] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState<string>("");

  // Estado para Consulta Tabela FIPE
  const [isLoadingFipe, setIsLoadingFipe] = useState<boolean>(false);
  const [fipeBrands, setFipeBrands] = useState<FipeOption[]>([]);
  const [fipeModels, setFipeModels] = useState<FipeOption[]>([]);
  const [fipeYears, setFipeYears] = useState<FipeOption[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedYearId, setSelectedYearId] = useState<string>("");

  // Estado para Importação de CRLV-e Digital
  const [isUploadingCRLV, setIsUploadingCRLV] = useState<boolean>(false);
  const [crlvSuccessMessage, setCrlvSuccessMessage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Especificações automotivas
  const [placa, setPlaca] = useState<string>("");
  const [renavam, setRenavam] = useState<string>("");
  const [chassi, setChassi] = useState<string>("");
  const [quilometragem, setQuilometragem] = useState<number | "">("");
  const [combustivel, setCombustivel] = useState<string>("");
  const [cambio, setCambio] = useState<string>("");

  useEffect(() => {
    setCrlvSuccessMessage(null);
    setSelectedBrandId("");
    setSelectedModelId("");
    setSelectedYearId("");
    setFipeModels([]);
    setFipeYears([]);
    if (veiculoParaEditar) {
      setCategoria(veiculoParaEditar.categoria || "");
      setMarca(veiculoParaEditar.marca);
      setModelo(veiculoParaEditar.modelo);
      setVersao(veiculoParaEditar.versao || "");
      setAnoFabricacao(veiculoParaEditar.anoFabricacao || "");
      setAnoModelo(veiculoParaEditar.anoModelo || "");
      setCor(veiculoParaEditar.cor || "");
      setValorAquisicao(veiculoParaEditar.valorAquisicao);
      setPrecoAnunciado(veiculoParaEditar.precoAnunciado);
      setValorFipe(veiculoParaEditar.valorFipe || 0);
      setCodigoFipe(veiculoParaEditar.codigoFipe || "");
      setMesReferenciaFipe(veiculoParaEditar.mesReferenciaFipe || "");
      setStatus(veiculoParaEditar.status);
      setFotoCapa(veiculoParaEditar.fotoCapa || "");
      setFotosAdicionais(veiculoParaEditar.fotos?.map((f) => f.url) || []);
      setObservacoes(veiculoParaEditar.observacoes || "");

      setPlaca(veiculoParaEditar.placa || "");
      setRenavam(veiculoParaEditar.renavam || "");
      setChassi(veiculoParaEditar.chassi || "");
      setQuilometragem(veiculoParaEditar.quilometragem ?? "");
      setCombustivel(veiculoParaEditar.combustivel || "");
      setCambio(veiculoParaEditar.cambio || "");
    } else {
      setCategoria("");
      setMarca("");
      setModelo("");
      setVersao("");
      setAnoFabricacao("");
      setAnoModelo("");
      setCor("");
      setValorAquisicao(0);
      setPrecoAnunciado(0);
      setValorFipe(0);
      setCodigoFipe("");
      setMesReferenciaFipe("");
      // Vendedor cadastra inicialmente em PREPARACAO para revisão de custo pela gerência
      setStatus(user?.role === "VENDEDOR" ? "PREPARACAO" : "DISPONIVEL");
      setFotoCapa("");
      setFotosAdicionais([]);
      setObservacoes("");

      setPlaca("");
      setRenavam("");
      setChassi("");
      setQuilometragem("");
      setCombustivel("");
      setCambio("");
    }
  }, [veiculoParaEditar, isOpen, user?.role]);

  useEffect(() => {
    if (!isOpen) return;
    const vType = categoria === "Caminhão" ? "trucks" : "cars";
    fetch(`/api/fipe?action=brands&type=${vType}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.sucesso && json.brands) {
          setFipeBrands(json.brands);
        }
      })
      .catch(() => {});
  }, [isOpen, categoria]);

  if (!isOpen) return null;

  const getFipeVehicleType = (cat = categoria) => (cat === "Caminhão" ? "trucks" : "cars");

  const buscarFipeInteligente = async (
    marcaParam = marca,
    modeloParam = modelo,
    versaoParam = versao,
    anoParam = String(anoModelo || anoFabricacao || ""),
    combustivelParam = combustivel,
    categoriaParam = categoria
  ) => {
    try {
      setIsLoadingFipe(true);
      const vType = getFipeVehicleType(categoriaParam);
      const params = new URLSearchParams({
        action: "smart-search",
        type: vType,
        marca: marcaParam,
        modelo: modeloParam,
        versao: versaoParam,
        ano: anoParam,
        combustivel: combustivelParam,
      });

      const res = await fetch(`/api/fipe?${params.toString()}`);
      const json = await res.json();
      if (!json.sucesso) {
        throw new Error(json.erro || "Erro ao consultar a Tabela FIPE.");
      }

      setFipeBrands(json.brands || []);
      setFipeModels(json.models || []);
      setFipeYears(json.years || []);
      setSelectedBrandId(json.matchedBrand?.code || "");
      setSelectedModelId(json.matchedModel?.code || "");
      setSelectedYearId(json.matchedYear?.code || "");

      if (json.fipeInfo) {
        setValorFipe(json.fipeInfo.priceNumeric || 0);
        setCodigoFipe(json.fipeInfo.codeFipe || "");
        setMesReferenciaFipe(json.fipeInfo.referenceMonth || "");
      }
    } catch {
      // Se falhar, mantém painel aberto para seleção manual
    } finally {
      setIsLoadingFipe(false);
    }
  };

  const handleSelectFipeBrand = async (brandId: string) => {
    setSelectedBrandId(brandId);
    setSelectedModelId("");
    setSelectedYearId("");
    setFipeModels([]);
    setFipeYears([]);
    if (!brandId) return;

    const brandObj = fipeBrands.find((b) => b.code === brandId);
    if (brandObj && !marca) {
      setMarca(brandObj.name);
    }

    try {
      setIsLoadingFipe(true);
      const vType = getFipeVehicleType();
      const res = await fetch(`/api/fipe?action=models&type=${vType}&brandId=${brandId}`);
      const json = await res.json();
      if (json.sucesso) {
        setFipeModels(json.models || []);
      }
    } finally {
      setIsLoadingFipe(false);
    }
  };

  const handleSelectFipeModel = async (modelId: string) => {
    setSelectedModelId(modelId);
    setSelectedYearId("");
    setFipeYears([]);
    if (!modelId || !selectedBrandId) return;

    const modelObj = fipeModels.find((m) => m.code === modelId);
    if (modelObj && !modelo) {
      const partes = modelObj.name.split(" ");
      setModelo(partes[0] || modelObj.name);
      if (partes.length > 1 && !versao) {
        setVersao(partes.slice(1).join(" "));
      }
    }

    try {
      setIsLoadingFipe(true);
      const vType = getFipeVehicleType();
      const res = await fetch(
        `/api/fipe?action=years&type=${vType}&brandId=${selectedBrandId}&modelId=${modelId}`
      );
      const json = await res.json();
      if (json.sucesso) {
        const yearsList: FipeOption[] = json.years || [];
        setFipeYears(yearsList);
        // Se já houver ano preenchido, tenta selecionar automaticamente
        const anoStr = String(anoModelo || anoFabricacao || "");
        const autoYear = anoStr
          ? yearsList.find((y) => y.code.startsWith(`${anoStr}-`) || y.name.startsWith(anoStr))
          : yearsList[0];
        if (autoYear) {
          await handleSelectFipeYear(autoYear.code, selectedBrandId, modelId);
        }
      }
    } finally {
      setIsLoadingFipe(false);
    }
  };

  const handleSelectFipeYear = async (
    yearId: string,
    brandIdOverride = selectedBrandId,
    modelIdOverride = selectedModelId
  ) => {
    setSelectedYearId(yearId);
    if (!yearId || !brandIdOverride || !modelIdOverride) return;

    try {
      setIsLoadingFipe(true);
      const vType = getFipeVehicleType();
      const res = await fetch(
        `/api/fipe?action=price&type=${vType}&brandId=${brandIdOverride}&modelId=${modelIdOverride}&yearId=${yearId}`
      );
      const json = await res.json();
      if (json.sucesso && json.fipeInfo) {
        const info = json.fipeInfo;
        setValorFipe(info.priceNumeric || 0);
        setCodigoFipe(info.codeFipe || "");
        setMesReferenciaFipe(info.referenceMonth || "");
        if (!anoModelo && info.modelYear && info.modelYear < 30000) {
          setAnoModelo(info.modelYear);
          if (!anoFabricacao) setAnoFabricacao(info.modelYear);
        }
        if (!combustivel && info.fuel) {
          if (info.fuel.toLowerCase().includes("diesel")) setCombustivel("Diesel");
          else if (info.fuel.toLowerCase().includes("flex")) setCombustivel("Flex");
          else if (info.fuel.toLowerCase().includes("gasolina")) setCombustivel("Gasolina");
        }
      }
    } finally {
      setIsLoadingFipe(false);
    }
  };

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const compressedList = await Promise.all(
        files.map((file) => compressImageToDataUrl(file))
      );
      const validImages = compressedList.filter(Boolean);
      if (validImages.length > 0) {
        setFotoCapa((prevCapa) => prevCapa || validImages[0]);
        setFotosAdicionais((prev) => [...prev, ...validImages]);
      }
    } catch {
      alert("Não foi possível processar uma ou mais imagens selecionadas.");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoverFoto = (indexToRemove: number) => {
    setFotosAdicionais((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (fotoCapa === prev[indexToRemove]) {
        setFotoCapa(updated[0] || "");
      }
      return updated;
    });
  };

  const handleCRLVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCRLV(true);
      setCrlvSuccessMessage(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-crlv", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!json.sucesso || !json.dados) {
        throw new Error(json.erro || "Falha ao processar o CRLV-e");
      }

      const d = json.dados;
      if (d.placa) setPlaca(d.placa);
      if (d.renavam) setRenavam(d.renavam);
      if (d.chassi) setChassi(d.chassi);
      if (d.anoFabricacao) setAnoFabricacao(d.anoFabricacao);
      if (d.anoModelo) setAnoModelo(d.anoModelo);
      if (d.marca) setMarca(d.marca);
      if (d.modelo) setModelo(d.modelo);
      if (d.versao) setVersao(d.versao);
      if (d.cor) setCor(d.cor);
      if (d.combustivel) setCombustivel(d.combustivel);
      if (d.categoria) setCategoria(d.categoria);

      let extraObs = "";
      if (d.motor) extraObs += `Motor: ${d.motor}. `;
      if (d.proprietarioNome) extraObs += `Proprietário no CRLV: ${d.proprietarioNome} (${d.proprietarioCpf || ""}) - ${d.cidadeUf || ""}.`;
      if (extraObs) {
        setObservacoes((prev) => (prev ? `${prev}\n${extraObs}` : extraObs));
      }

      // Cadastro automático do proprietário como Cliente
      let clienteMsg = "";
      if (d.proprietarioNome) {
        const cpfLimpo = (d.proprietarioCpf || "").replace(/\D/g, "");
        const jaExiste = clientes.some((c) => {
          const cCpf = (c.cpfCnpj || "").replace(/\D/g, "");
          if (cpfLimpo && cCpf && cpfLimpo === cCpf) return true;
          return (c.nome || "").trim().toUpperCase() === d.proprietarioNome.trim().toUpperCase();
        });

        if (!jaExiste) {
          const isJuridica = cpfLimpo.length > 11;
          addCliente({
            tipoPessoa: isJuridica ? "JURIDICA" : "FISICA",
            nome: d.proprietarioNome.trim(),
            cpfCnpj: d.proprietarioCpf || "",
            telefone: "",
            cidade: d.cidade || "",
            estadoUf: d.uf || "",
            observacoes: `Cadastrado automaticamente via importação de CRLV-e (${d.marca} ${d.modelo} - Placa ${d.placa}).`,
          });
          clienteMsg = ` • Proprietário "${d.proprietarioNome}" adicionado aos Clientes!`;
        } else {
          clienteMsg = ` • Proprietário "${d.proprietarioNome}" já cadastrado em Clientes.`;
        }
      }

      setCrlvSuccessMessage(`Documento importado com sucesso: ${d.marca} ${d.modelo} (${d.placa})${clienteMsg}`);

      // Consulta automaticamente o preço de referência na Tabela FIPE após ler o CRLV-e
      if (d.marca || d.modelo) {
        buscarFipeInteligente(
          d.marca || "",
          d.modelo || "",
          d.versao || "",
          String(d.anoModelo || d.anoFabricacao || ""),
          d.combustivel || "",
          d.categoria || ""
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao importar CRLV";
      alert(`Não foi possível ler o CRLV: ${msg}`);
    } finally {
      setIsUploadingCRLV(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const placaFormatada = placa ? placa.trim().toUpperCase() : undefined;
    const chassiFormatado = chassi ? chassi.trim().toUpperCase() : undefined;

    // Validação de unicidade de Placa / Chassi no estoque ativo
    const outrosVeiculos = veiculos.filter((v) => v.id !== veiculoParaEditar?.id);
    if (placaFormatada) {
      const placaDuplicada = outrosVeiculos.find(
        (v) => v.placa && v.placa.replace(/[^A-Z0-9]/gi, "").toUpperCase() === placaFormatada.replace(/[^A-Z0-9]/gi, "")
      );
      if (placaDuplicada) {
        alert(`Já existe um veículo cadastrado com a placa ${placaFormatada} (${placaDuplicada.marca} ${placaDuplicada.modelo}).`);
        return;
      }
    }
    if (chassiFormatado) {
      const chassiDuplicado = outrosVeiculos.find(
        (v) => v.chassi && v.chassi.trim().toUpperCase() === chassiFormatado
      );
      if (chassiDuplicado) {
        alert(`Já existe um veículo cadastrado com o chassi ${chassiFormatado} (${chassiDuplicado.marca} ${chassiDuplicado.modelo}).`);
        return;
      }
    }

    // Se for vendedor editando ou criando, preserva custo de aquisição ou mantém em PREPARACAO se custo for 0
    const custoAquisicaoFinal =
      user?.role === "VENDEDOR"
        ? veiculoParaEditar
          ? veiculoParaEditar.valorAquisicao
          : 0
        : valorAquisicao;

    const statusFinal: StatusVeiculo =
      user?.role === "VENDEDOR" && !veiculoParaEditar && custoAquisicaoFinal === 0
        ? "PREPARACAO"
        : status;

    const dados: Omit<Veiculo, "id" | "createdAt" | "updatedAt" | "custoTotal"> = {
      categoria: categoria || "Carro de Passeio",
      marca,
      modelo,
      versao,
      anoFabricacao: Number(anoFabricacao) || new Date().getFullYear(),
      anoModelo: Number(anoModelo) || Number(anoFabricacao) || new Date().getFullYear(),
      cor,
      dataEntrada: veiculoParaEditar ? veiculoParaEditar.dataEntrada : getLocalISODate(),
      valorAquisicao: custoAquisicaoFinal,
      precoAnunciado,
      valorFipe: valorFipe > 0 ? valorFipe : undefined,
      codigoFipe: codigoFipe || undefined,
      mesReferenciaFipe: mesReferenciaFipe || undefined,
      status: statusFinal,
      fotoCapa: fotoCapa || "",
      fotos: fotosAdicionais.map((url, i) => ({
        id: `f-${Date.now()}-${i}`,
        veiculoId: veiculoParaEditar?.id || "",
        url,
        isCapa: url === fotoCapa,
        ordem: i,
      })),
      observacoes,

      // Especificações Rodoviárias
      placa: placaFormatada,
      renavam: renavam ? renavam.trim() : undefined,
      chassi: chassiFormatado,
      quilometragem: Number(quilometragem) || 0,
      combustivel: combustivel || undefined,
      cambio: cambio || undefined,
    };

    if (veiculoParaEditar) {
      updateVeiculo(veiculoParaEditar.id, dados);
    } else {
      addVeiculo(dados);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/40 backdrop-blur-md overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
        {/* Header Apple iOS */}
        <div className="px-5 py-3.5 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              <Car className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-zinc-900 tracking-tight">
                {veiculoParaEditar ? "Editar Cadastro do Veículo" : "Novo Veículo no Estoque"}
              </h3>
              <p className="text-xs text-zinc-500 font-normal">
                Informe os dados do veículo para controle de pátio.
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

        {/* Formulário com Scroll e touch-friendly */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Importação via CRLV-e Digital (PDF) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
                {isUploadingCRLV ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                  Importar via CRLV-e Digital (PDF)
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Preenche placa, renavam, chassi, ano, modelo, cor e combustível automaticamente.
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleCRLVUpload}
                className="hidden"
                id="crlv-upload-input"
              />
              <button
                type="button"
                disabled={isUploadingCRLV}
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {isUploadingCRLV ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Lendo CRLV-e...</span>
                  </>
                ) : (
                  <>
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Importar CRLV-e (.pdf)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {crlvSuccessMessage && (
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-800 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{crlvSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setCrlvSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold ml-2 text-sm"
              >
                ×
              </button>
            </div>
          )}

          {/* 1. Dados Principais do Veículo */}
          <div className="bg-[#f2f2f7]/50 p-4 sm:p-5 rounded-2xl border border-black/[0.05] space-y-3">
            <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider block mb-1">
              Dados Principais
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">Categoria *</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  required
                  className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] shadow-xs focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {CATEGORIAS_RODOVIARIO.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">Marca / Fabricante *</label>
                <input
                  type="text"
                  placeholder="Marca ou montadora"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  required
                  className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] shadow-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">Modelo *</label>
                <input
                  type="text"
                  placeholder="Modelo"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  required
                  className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 font-semibold min-h-[40px] shadow-xs focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-zinc-600 font-medium block mb-1">Versão / Especificação</label>
                <input
                  type="text"
                  placeholder="Versão, tração ou configuração"
                  value={versao}
                  onChange={(e) => setVersao(e.target.value)}
                  className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] shadow-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">Cor</label>
                <input
                  type="text"
                  placeholder="Cor predominante"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] shadow-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">Ano Fabricação / Modelo</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Fab"
                    value={anoFabricacao}
                    onChange={(e) => setAnoFabricacao(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-2 py-2 text-xs text-zinc-900 text-center min-h-[40px] shadow-xs focus:outline-none"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Mod"
                    value={anoModelo}
                    onChange={(e) => setAnoModelo(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-2 py-2 text-xs text-zinc-900 text-center min-h-[40px] shadow-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">Câmbio</label>
                <select
                  value={cambio}
                  onChange={(e) => setCambio(e.target.value)}
                  className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] shadow-xs focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Automático">Automático</option>
                  <option value="Manual">Manual</option>
                  <option value="CVT">CVT</option>
                  <option value="Automatizado">Automatizado</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">Combustível</label>
                <select
                  value={combustivel}
                  onChange={(e) => setCombustivel(e.target.value)}
                  className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 min-h-[40px] shadow-xs focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Flex">Flex (Álcool/Gasolina)</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Elétrico">Elétrico</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Identificação e Documentação */}
          <div className="bg-[#f2f2f7]/50 p-4 sm:p-5 rounded-2xl border border-black/[0.05] space-y-3">
            <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider block">
              Identificação & Documentação
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">
                  Placa do Veículo *
                </label>
                <input
                  type="text"
                  placeholder="ABC-1234 ou ABC1D23"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  required
                  className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 uppercase font-mono font-semibold min-h-[40px] shadow-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">
                  Quilometragem (KM) *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  min={0}
                  value={quilometragem}
                  onChange={(e) => setQuilometragem(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                  required
                  className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 font-semibold min-h-[40px] shadow-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">
                  RENAVAM (opcional)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Código RENAVAM"
                  value={renavam}
                  onChange={(e) => setRenavam(e.target.value)}
                  className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono min-h-[40px] shadow-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">
                  Chassi (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Número do Chassi"
                  value={chassi}
                  onChange={(e) => setChassi(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 uppercase font-mono min-h-[40px] shadow-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Valores Financeiros, Referência FIPE e Status */}
          <div className="bg-[#f2f2f7]/50 p-4 sm:p-5 rounded-2xl border border-black/[0.05] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider block">
                  Valores Financeiros & Referência FIPE
                </span>
                {codigoFipe && (
                  <span className="text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                    FIPE {codigoFipe} {mesReferenciaFipe ? `• ${mesReferenciaFipe}` : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Painel Interativo da Tabela FIPE (já aberto por padrão) */}
            <div className="bg-white border border-blue-200/80 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Seleção Oficial Tabela FIPE (ajuste a versão exata se necessário)</span>
                </span>
                {isLoadingFipe && (
                  <span className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Carregando opções FIPE...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">1. Marca FIPE</label>
                  <select
                    value={selectedBrandId}
                    onChange={(e) => handleSelectFipeBrand(e.target.value)}
                    className="w-full bg-zinc-50 border border-black/[0.08] focus:border-blue-500 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 font-medium"
                  >
                    <option value="">Selecione a marca...</option>
                    {fipeBrands.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">2. Modelo / Versão FIPE</label>
                  <select
                    value={selectedModelId}
                    onChange={(e) => handleSelectFipeModel(e.target.value)}
                    disabled={!selectedBrandId || fipeModels.length === 0}
                    className="w-full bg-zinc-50 border border-black/[0.08] focus:border-blue-500 disabled:opacity-50 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 font-medium"
                  >
                    <option value="">Selecione o modelo...</option>
                    {fipeModels.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">3. Ano / Combustível</label>
                  <select
                    value={selectedYearId}
                    onChange={(e) => handleSelectFipeYear(e.target.value)}
                    disabled={!selectedModelId || fipeYears.length === 0}
                    className="w-full bg-zinc-50 border border-black/[0.08] focus:border-blue-500 disabled:opacity-50 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 font-medium"
                  >
                    <option value="">Selecione o ano...</option>
                    {fipeYears.map((y) => (
                      <option key={y.code} value={y.code}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${user?.role === "VENDEDOR" ? "sm:grid-cols-3" : "sm:grid-cols-4"} gap-3`}>
              <div>
                <label className="text-xs text-blue-700 font-semibold block mb-1">Tabela FIPE (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={formatCurrencyInput(valorFipe)}
                  onChange={(e) => setValorFipe(parseCurrencyInput(e.target.value))}
                  className="w-full bg-blue-50/50 border border-blue-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-blue-800 font-bold min-h-[40px] shadow-xs focus:outline-none"
                />
              </div>

              {user?.role !== "VENDEDOR" && (
                <div>
                  <label className="text-xs text-zinc-600 font-medium block mb-1">Valor de Compra (R$) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={formatCurrencyInput(valorAquisicao)}
                    onChange={(e) => setValorAquisicao(parseCurrencyInput(e.target.value))}
                    required
                    className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-zinc-900 font-bold min-h-[40px] shadow-xs focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">Preço Anunciado (R$) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={formatCurrencyInput(precoAnunciado)}
                  onChange={(e) => setPrecoAnunciado(parseCurrencyInput(e.target.value))}
                  required
                  className="w-full bg-white border border-emerald-500/50 focus:border-emerald-600 rounded-xl px-3 py-2 text-sm text-emerald-700 font-bold min-h-[40px] shadow-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1">Status no Estoque</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusVeiculo)}
                  disabled={veiculoParaEditar?.status === "VENDIDO"}
                  className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 disabled:opacity-60 rounded-xl px-3 py-2 text-xs text-zinc-900 font-semibold min-h-[40px] shadow-xs focus:outline-none"
                >
                  <option value="DISPONIVEL">Disponível para Venda</option>
                  <option value="PREPARACAO">Em Preparação / Oficina</option>
                  <option value="RESERVADO">Reservado</option>
                  <option value="DEVOLVIDO">Devolvido</option>
                  {veiculoParaEditar?.status === "VENDIDO" && <option value="VENDIDO">Vendido</option>}
                </select>
              </div>
            </div>

            {/* Indicador comparativo automático com a Tabela FIPE */}
            {valorFipe > 0 && (valorAquisicao > 0 || precoAnunciado > 0) && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                {user?.role !== "VENDEDOR" && valorAquisicao > 0 && (
                  <span
                    className={`px-2.5 py-1 rounded-xl font-semibold border ${
                      valorAquisicao <= valorFipe
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    Compra:{" "}
                    {valorAquisicao <= valorFipe
                      ? `${(((valorFipe - valorAquisicao) / valorFipe) * 100).toFixed(1)}% abaixo da FIPE (${formatCurrency(valorFipe - valorAquisicao)} de margem FIPE)`
                      : `${(((valorAquisicao - valorFipe) / valorFipe) * 100).toFixed(1)}% acima da FIPE`}
                  </span>
                )}

                {precoAnunciado > 0 && (
                  <span className="px-2.5 py-1 rounded-xl font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                    Anúncio:{" "}
                    {precoAnunciado === valorFipe
                      ? "Exatamente no valor da FIPE"
                      : precoAnunciado < valorFipe
                      ? `${(((valorFipe - precoAnunciado) / valorFipe) * 100).toFixed(1)}% abaixo da FIPE`
                      : `${(((precoAnunciado - valorFipe) / valorFipe) * 100).toFixed(1)}% acima da FIPE`}
                  </span>
                )}
              </div>
            )}

            {user?.role === "VENDEDOR" && !veiculoParaEditar && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/70 rounded-xl px-3 py-2">
                Nota: Cadastros realizados pelo perfil Vendas entram inicialmente como <strong>Em Preparação</strong> até que a gerência informe o custo de aquisição.
              </p>
            )}
          </div>

          {/* 4. Fotos do Veículo */}
          <div className="bg-[#f2f2f7]/50 p-4 sm:p-5 rounded-2xl border border-black/[0.05] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider block">
                Fotos do Veículo
              </span>

              {/* Botão de Câmera / Upload */}
              <label className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-xs">
                <Camera className="w-3.5 h-3.5" />
                <span>Selecionar Fotos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadFoto}
                  className="hidden"
                />
              </label>
            </div>

            {/* Grid de Fotos Carregadas */}
            {fotosAdicionais.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                {fotosAdicionais.map((url, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-xl overflow-hidden h-20 border-2 group ${
                      url === fotoCapa ? "border-emerald-500 shadow-sm" : "border-black/[0.1]"
                    }`}
                  >
                    <img
                      src={url}
                      alt="Foto do veículo"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setFotoCapa(url)}
                    />
                    {url === fotoCapa && (
                      <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-md shadow-xs">
                        CAPA
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoverFoto(idx)}
                      className="absolute bottom-1 right-1 bg-black/70 hover:bg-rose-600 text-white p-1 rounded-md transition-all opacity-80 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Observações */}
          <div>
            <label className="text-xs text-zinc-600 font-medium block mb-1">Observações Internas (opcional)</label>
            <textarea
              placeholder="Observações adicionais sobre o veículo"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="w-full bg-white border border-black/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 resize-none shadow-xs focus:outline-none"
            />
          </div>

          {/* Botões do Rodapé iOS */}
          <div className="pt-3 border-t border-black/[0.06] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 px-4 py-2.5 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-xl transition-all shadow-xs active:scale-95 min-h-[40px]"
            >
              <Save className="w-4 h-4" />
              <span>{veiculoParaEditar ? "Salvar Alterações" : "Cadastrar no Estoque"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
