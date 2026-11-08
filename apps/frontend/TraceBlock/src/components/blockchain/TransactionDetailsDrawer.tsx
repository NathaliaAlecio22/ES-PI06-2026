import {
  X,
  Check,
  Copy,
  FileDown,
  ShieldCheck,
  Hash,
  Blocks,
  Clock3,
  UserRound,
  Package,
  FileCode2,
} from "lucide-react";

import type { Transaction } from "./blockchain.types";

interface TransactionDetailsDrawerProps {
  transaction: Transaction;
  onClose: () => void;
}

export default function TransactionDetailsDrawer({
  transaction,
  onClose,
}: TransactionDetailsDrawerProps) {
  const confirmed = transaction.status === "Confirmada";

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(transaction.hash);
      window.alert("Hash copiado!");
    } catch {
      window.alert("Não foi possível copiar o hash.");
    }
  }

  function exportReceipt() {
    const content = `
TRACEBLOCK — COMPROVANTE DE TRANSAÇÃO

Hash: ${transaction.hash}
Bloco: ${transaction.block}
Evento: ${transaction.event}
Produto / lote: ${transaction.item}
Participante: ${transaction.party}
Data: ${transaction.date}
Validação: ${transaction.status}

Este comprovante contém dados demonstrativos da interface TraceBlock.
    `.trim();

    const file = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = `comprovante-${transaction.block.replace("#", "")}.txt`;
    link.click();

    URL.revokeObjectURL(url);
  }

  const details = [
    {
      label: "Número do bloco",
      value: transaction.block,
      icon: Blocks,
    },
    {
      label: "Hash do bloco anterior",
      value: "0x3ac8...12f0",
      icon: Hash,
    },
    {
      label: "Timestamp",
      value: transaction.date,
      icon: Clock3,
    },
    {
      label: "Responsável",
      value: "0xA4F2...8D31",
      icon: UserRound,
    },
  ];

  const eventDetails = [
    {
      label: "Tipo de operação",
      value: transaction.event,
      icon: FileCode2,
    },
    {
      label: "Produto / lote",
      value: transaction.item,
      icon: Package,
    },
    {
      label: "Smart Contract",
      value: "CustodyTransfer.v2.4",
      icon: FileCode2,
    },
    {
      label: "Confirmações",
      value: confirmed ? "4 de 4 nós" : "Aguardando validação",
      icon: ShieldCheck,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[90] bg-[#081429]/40"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-drawer-title"
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col overflow-y-auto bg-white px-5 pb-6 shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 z-10 -mx-5 mb-5 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
              Blockchain
            </span>

            <h2
              id="transaction-drawer-title"
              className="mt-1 text-[15px] font-semibold text-[#0b1730]"
            >
              Detalhes da transação
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status */}
        <div
          className={`flex items-center gap-3 rounded-lg border p-3 ${
            confirmed
              ? "border-green-100 bg-green-50"
              : "border-amber-100 bg-amber-50"
          }`}
        >
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
              confirmed
                ? "bg-green-100 text-green-600"
                : "bg-amber-100 text-amber-600"
            }`}
          >
            {confirmed ? <Check size={19} /> : <Clock3 size={19} />}
          </div>

          <div className="flex flex-col gap-1">
            <strong
              className={`text-[10px] ${
                confirmed ? "text-green-800" : "text-amber-800"
              }`}
            >
              {confirmed
                ? "Transação confirmada"
                : "Transação em análise"}
            </strong>

            <span className="text-[8px] text-slate-500">
              {confirmed
                ? "Validada por 4 nós da rede"
                : "Aguardando conclusão da validação"}
            </span>
          </div>
        </div>

        {/* Identificação */}
        <section className="my-5">
          <span className="text-[8px] font-bold tracking-wider text-slate-400">
            IDENTIFICAÇÃO
          </span>

          <label className="mb-2 mt-3 block text-[9px] font-medium text-slate-500">
            Hash da transação
          </label>

          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-[9px] leading-relaxed text-slate-700">
              {transaction.hash}
            </code>

            <button
              type="button"
              onClick={copyHash}
              title="Copiar hash"
              className="shrink-0 rounded-md p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
            >
              <Copy size={15} />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {details.map((detail) => {
              const Icon = detail.icon;

              return (
                <div
                  key={detail.label}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="flex items-center gap-2 text-[9px] text-slate-500">
                    <Icon size={14} className="text-slate-400" />
                    {detail.label}
                  </span>

                  <strong className="break-all text-right font-mono text-[9px] font-medium text-slate-700">
                    {detail.value}
                  </strong>
                </div>
              );
            })}
          </div>
        </section>

        {/* Evento registrado */}
        <section className="mb-5">
          <span className="text-[8px] font-bold tracking-wider text-slate-400">
            EVENTO REGISTRADO
          </span>

          <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 px-3">
            {eventDetails.map((detail) => {
              const Icon = detail.icon;

              return (
                <div
                  key={detail.label}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="flex items-center gap-2 text-[9px] text-slate-500">
                    <Icon size={14} className="shrink-0 text-slate-400" />
                    {detail.label}
                  </span>

                  <strong className="max-w-[190px] break-words text-right text-[9px] font-semibold text-slate-700">
                    {detail.value}
                  </strong>
                </div>
              );
            })}
          </div>
        </section>

        {/* Aviso */}
        <div className="mb-5 flex gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <ShieldCheck size={17} className="shrink-0 text-blue-600" />

          <p className="text-[9px] leading-relaxed text-slate-600">
            Os dados apresentados representam o registro da operação na
            interface demonstrativa. A validação real depende da integração
            com a rede Blockchain.
          </p>
        </div>

        {/* Ações */}
        <div className="mt-auto border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={exportReceipt}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <FileDown size={16} />
            Exportar comprovante
          </button>
        </div>
      </aside>
    </div>
  );
}