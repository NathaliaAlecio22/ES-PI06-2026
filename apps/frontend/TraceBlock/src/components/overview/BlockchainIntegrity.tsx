import { useEffect, useState } from "react";
import {
  AlertCircle,
  Blocks,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import type { BlockchainHistoryResponse } from "../blockchain/blockchain.types";
import { getBlockchainHistory } from "../../services/blockchain";

export default function BlockchainIntegrity() {
  const [history, setHistory] = useState<BlockchainHistoryResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getBlockchainHistory(controller.signal)
      .then((data) => {
        setHistory(data);
        setLastUpdated(new Date());
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Não foi possível consultar a blockchain.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [reloadKey]);

  function refreshHistory() {
    setLoading(!history);
    setRefreshing(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  const connected = history?.stats.networkStatus === "Operacional" && !error;
  const latestBlock = history?.blocks[0]?.number ?? (
    history ? history.stats.totalBlocks - 1 : null
  );
  const details = [
    {
      label: "Último bloco",
      value: latestBlock == null ? "—" : `#${latestBlock.toLocaleString("pt-BR")}`,
      icon: Blocks,
    },
    {
      label: "Transações registradas",
      value: history?.stats.totalTransactions.toLocaleString("pt-BR") ?? "—",
      icon: Database,
    },
    {
      label: "Última consulta",
      value: lastUpdated?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) ?? "—",
      icon: Clock3,
    },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Integridade do Blockchain
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Estado da rede e operações registradas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
            connected
              ? "bg-emerald-50 text-emerald-700"
              : error
                ? "bg-red-50 text-red-700"
                : "bg-slate-100 text-slate-600"
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500" : error ? "bg-red-500" : "bg-slate-400"
            }`} />
            {connected ? "Rede conectada" : error ? "Consulta indisponível" : "Conectando"}
          </span>
          <button
            type="button"
            onClick={refreshHistory}
            disabled={loading || refreshing}
            aria-label="Atualizar dados da blockchain"
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className={`mt-6 flex items-center gap-4 rounded-lg border p-4 ${
        connected
          ? "border-emerald-100 bg-emerald-50/60"
          : error
            ? "border-red-100 bg-red-50"
            : "border-slate-200 bg-slate-50"
      }`}>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          connected ? "bg-emerald-100" : error ? "bg-red-100" : "bg-slate-200"
        }`}>
          {error
            ? <AlertCircle size={25} className="text-red-600" />
            : loading
              ? <RefreshCw size={25} className="animate-spin text-slate-600" />
              : <ShieldCheck size={26} className={connected ? "text-emerald-600" : "text-slate-500"} />}
        </div>

        <div className="min-w-0">
          <p className={`font-semibold ${connected ? "text-emerald-800" : error ? "text-red-800" : "text-slate-700"}`}>
            {connected ? "Conexão com a rede confirmada" : error ? "Não foi possível consultar a rede" : "Consultando a rede configurada"}
          </p>
          <p className={`mt-1 text-xs ${error ? "text-red-700" : connected ? "text-emerald-700" : "text-slate-500"}`}>
            {error ?? (connected
              ? `Último bloco recebido em ${new Date(history.stats.lastBlockTime).toLocaleString("pt-BR")}.`
              : "Os dados serão exibidos após a resposta da API.")}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {details.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <Icon size={17} className="text-slate-600" />
              </div>

              <div>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <CheckCircle2 size={15} className={connected ? "text-emerald-500" : "text-slate-400"} />
        <span>
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
          Dados consultados da API e do RPC configurado
        </span>
      </div>
    </section>
  );
}
