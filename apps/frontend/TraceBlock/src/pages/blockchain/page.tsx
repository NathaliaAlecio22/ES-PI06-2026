
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import BlockchainStats from "../../components/blockchain/BlockchainStats";
import BlockSequence from "../../components/blockchain/Blocksequence";
import TransactionsTable from "../../components/blockchain/TransactionsTable";
import TransactionDetailsDrawer from "../../components/blockchain/TransactionDetailsDrawer";

import type {
  BlockchainHistoryResponse,
  Transaction,
} from "../../components/blockchain/blockchain.types";

import { getBlockchainHistory } from "../../services/blockchain";

export default function BlockchainPage() {
  const [history, setHistory] =
    useState<BlockchainHistoryResponse | null>(null);

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // O loading inicial começa true, evitando setState no início do effect.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Atualização manual ou automática do histórico
  const loadHistory = useCallback(async () => {
    setRefreshing(true);

    try {
      const data = await getBlockchainHistory();

      setHistory(data);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar o histórico Blockchain."
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Carregamento inicial
  useEffect(() => {
    let active = true;

    async function fetchInitialHistory() {
      try {
        const data = await getBlockchainHistory();

        if (active) {
          setHistory(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar o histórico Blockchain."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchInitialHistory();

    return () => {
      active = false;
    };
  }, []);

  // Atualização automática periódica sem consultar o RPC continuamente.
  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadHistory();
    }, 60000);

    return () => window.clearInterval(interval);
  }, [loadHistory]);

  // Filtragem das transações
  const filteredTransactions = useMemo(() => {
    const transactions = history?.transactions ?? [];
    const normalizedSearch = search.toLowerCase().trim();

    return transactions.filter((transaction) => {
      const matchesSearch =
        !normalizedSearch ||
        transaction.hash.toLowerCase().includes(normalizedSearch) ||
        String(transaction.block ?? "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        transaction.item.toLowerCase().includes(normalizedSearch) ||
        transaction.party.toLowerCase().includes(normalizedSearch);

      const matchesEvent =
        !eventFilter || transaction.event === eventFilter;

      const matchesStatus =
        !statusFilter || transaction.status === statusFilter;

      return matchesSearch && matchesEvent && matchesStatus;
    });
  }, [history, search, eventFilter, statusFilter]);

  // Verificação de integridade
  function handleVerifyIntegrity() {
    window.alert(
      "A verificação de integridade precisa ser conectada ao serviço de validação Blockchain."
    );
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="mb-[22px] flex min-h-[59px] flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1730]">
            Histórico Blockchain
          </h1>

          <p className="mt-1.5 text-[12px] text-slate-500">
            Consulte e verifique os eventos registrados na rede.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loading || refreshing}
            className="inline-flex h-[37px] items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[11px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            Atualizar
          </button>

          <button
            type="button"
            onClick={handleVerifyIntegrity}
            className="inline-flex h-[37px] items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[11px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ShieldCheck size={16} />
            Verificar integridade
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">
              Erro ao carregar o histórico
            </p>

            <p className="mt-1 text-xs text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadHistory()}
              disabled={refreshing}
              className="mt-2 text-xs font-semibold text-red-700 underline disabled:opacity-50"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Carregamento inicial */}
      {loading && !history ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
          <RefreshCw
            size={24}
            className="animate-spin text-blue-600"
          />

          <p className="text-sm text-slate-500">
            Carregando dados da Blockchain...
          </p>
        </div>
      ) : history ? (
        <>
          {/* Indicadores */}
          <BlockchainStats stats={history.stats} />

          {/* Sequência de blocos */}
          <BlockSequence blocks={history.blocks} />

          {/* Histórico de transações */}
          <TransactionsTable
            transactions={filteredTransactions}
            search={search}
            setSearch={setSearch}
            eventFilter={eventFilter}
            setEventFilter={setEventFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onSelect={setSelectedTransaction}
          />

          {/* Detalhes da transação */}
          {selectedTransaction && (
            <TransactionDetailsDrawer
              transaction={selectedTransaction}
              onClose={() => setSelectedTransaction(null)}
            />
          )}
        </>
      ) : !error ? (
        <div className="flex min-h-[300px] items-center justify-center text-sm text-slate-400">
          Nenhum dado Blockchain disponível.
        </div>
      ) : null}
    </>
  );
}
