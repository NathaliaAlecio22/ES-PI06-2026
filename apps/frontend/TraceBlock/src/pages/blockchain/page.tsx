import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import BlockchainStats from "../../components/blockchain/BlockchainStats";
import BlockSequence from "../../components/blockchain/Blocksequence";
import TransactionsTable from "../../components/blockchain/TransactionsTable";
import TransactionDetailsDrawer from "../../components/blockchain/TransactionDetailsDrawer";

import { transactions as initialTransactions } from "../../components/blockchain/blockchain.data";

import type { Transaction } from "../../components/blockchain/blockchain.types";

export default function BlockchainPage() {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredTransactions = useMemo(() => {
    return initialTransactions.filter((transaction) => {
      const normalizedSearch = search.toLowerCase().trim();

      const matchesSearch =
        !normalizedSearch ||
        transaction.hash.toLowerCase().includes(normalizedSearch) ||
        transaction.block.toLowerCase().includes(normalizedSearch) ||
        transaction.item.toLowerCase().includes(normalizedSearch) ||
        transaction.party.toLowerCase().includes(normalizedSearch);

      const matchesEvent =
        !eventFilter || transaction.event === eventFilter;

      const matchesStatus =
        !statusFilter || transaction.status === statusFilter;

      return matchesSearch && matchesEvent && matchesStatus;
    });
  }, [search, eventFilter, statusFilter]);

  function handleVerifyIntegrity() {
    window.alert(
      "A verificação real da integridade Blockchain estará disponível após a integração com o backend."
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

        <button
          type="button"
          onClick={handleVerifyIntegrity}
          className="inline-flex h-[37px] items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[11px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <ShieldCheck size={16} />
          Verificar integridade
        </button>
      </div>

      {/* Indicadores */}
      <BlockchainStats />

      {/* Sequência de blocos */}
      <BlockSequence />

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
  );
}