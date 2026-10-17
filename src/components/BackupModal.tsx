"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { 
  X, 
  Download, 
  Upload, 
  Database, 
  Check, 
  AlertTriangle 
} from "lucide-react";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupModal({ isOpen, onClose }: BackupModalProps) {
  const { veiculos, clientes, modelos, vendas, documentosGerados } = useApp();
  const { user } = useAuth();
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  if (!isOpen || user?.role !== "ADMIN") return null;

  // Exporta todos os dados em arquivo JSON
  const handleExportarBackup = () => {
    setMensagemErro("");
    const backupData = {
      versao: "1.0",
      dataExportacao: new Date().toISOString(),
      empresa: "RB Veículos",
      dados: {
        veiculos,
        clientes,
        modelos,
        vendas,
        documentosGerados,
      },
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-rb-veiculos-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setMensagemSucesso("Backup baixado com sucesso!");
    setTimeout(() => setMensagemSucesso(""), 4000);
  };

  // Restaura dados a partir de arquivo JSON com validação rigorosa de schema
  const handleImportarBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMensagemErro("");
    setMensagemSucesso("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (
          !json ||
          typeof json !== "object" ||
          !json.dados ||
          typeof json.dados !== "object" ||
          !Array.isArray(json.dados.veiculos) ||
          !Array.isArray(json.dados.clientes) ||
          !Array.isArray(json.dados.vendas)
        ) {
          setMensagemErro("Estrutura de backup inválida: coleções obrigatórias (veículos, clientes, vendas) ausentes ou corrompidas.");
          return;
        }

        const colecoes = [
          ["rb_veiculos", json.dados.veiculos],
          ["rb_clientes", json.dados.clientes],
          ["rb_modelos", Array.isArray(json.dados.modelos) ? json.dados.modelos : []],
          ["rb_vendas", json.dados.vendas],
          ["rb_documentos_gerados", Array.isArray(json.dados.documentosGerados) ? json.dados.documentosGerados : []],
        ] as const;

        for (const [key, val] of colecoes) {
          localStorage.setItem(key, JSON.stringify(val));
        }

        setMensagemSucesso("Backup validado e restaurado! Recarregando página...");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        if (err instanceof DOMException && err.name === "QuotaExceededError") {
          setMensagemErro("Limite de armazenamento do navegador excedido ao restaurar o backup.");
        } else {
          setMensagemErro("Arquivo JSON inválido ou corrompido.");
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-md overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-zinc-900 tracking-tight">
                Cópia de Segurança & Backup
              </h3>
              <p className="text-xs text-zinc-500 font-normal">
                Exportação e restauração segura de dados locais.
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

        <div className="p-6 space-y-4">
          <p className="text-xs text-zinc-600 leading-relaxed">
            Seus dados estão protegidos e salvos no navegador. Você pode baixar uma cópia de segurança a qualquer momento para levar para outro computador ou celular.
          </p>

          {mensagemErro && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{mensagemErro}</span>
            </div>
          )}

          {mensagemSucesso && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          {/* Botões de Ação iOS */}
          <div className="space-y-2.5 pt-1">
            {/* Exportar */}
            <button
              onClick={handleExportarBackup}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#f2f2f7]/60 hover:bg-[#f2f2f7] border border-black/[0.06] text-zinc-900 transition-all active:scale-95 group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-semibold text-zinc-900">Baixar Cópia Completa (JSON)</span>
                  <span className="block text-[11px] text-zinc-500">
                    {veiculos.length} veículos • {clientes.length} clientes • {vendas.length} vendas
                  </span>
                </div>
              </div>
              <span className="text-xs text-emerald-700 font-semibold">&darr; Baixar</span>
            </button>

            {/* Importar */}
            <label className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#f2f2f7]/60 hover:bg-[#f2f2f7] border border-black/[0.06] text-zinc-900 transition-all active:scale-95 cursor-pointer group shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-semibold text-zinc-900">Restaurar de um Arquivo</span>
                  <span className="block text-[11px] text-zinc-500">
                    Importa arquivo .json de backup anterior
                  </span>
                </div>
              </div>
              <span className="text-xs text-blue-700 font-semibold">&uarr; Carregar</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportarBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
