import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CalendarDays,
  Hash,
  MapPin,
  Package,
  X,
} from "lucide-react";

import TransferStats from "../../components/transfers/TransferStats";
import TransferFilters from "../../components/transfers/TransfersFilters";
import TransferTable from "../../components/transfers/TransferTable";
import NewTransferModal from "../../components/transfers/TransferModal";

import { initialTransfers, transferProducts } from "../../components/transfers/transfers.data";

import type {
  NewTransferData,
  Transfer,
} from "../../components/transfers/tranfers.type";

interface Props {
  notify?: (message: string) => void;
}

function TransferDetails({
  transfer,
  onClose,
}: {
  transfer: Transfer;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[110] flex justify-end bg-slate-950/40 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Detalhes da operação
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {transfer.id}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div
            className={`rounded-xl border p-4 ${
              transfer.status === "Com ocorrência"
                ? "border-red-200 bg-red-50"
                : transfer.status === "Confirmada"
                  ? "border-green-200 bg-green-50"
                  : "border-amber-200 bg-amber-50"
            }`}
          >
            <p className="text-sm font-semibold text-slate-800">
              {transfer.status}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Situação atual da transferência.
            </p>
          </div>

          <section>
            <h3 className="mb-4 text-sm font-bold text-slate-900">
              Produto transferido
            </h3>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Package size={21} />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {transfer.product}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {transfer.lot} · {transfer.quantity}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-sm font-bold text-slate-900">
              Movimentação de custódia
            </h3>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-slate-400" />

                <div>
                  <p className="text-xs text-slate-400">
                    Responsável anterior
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {transfer.previousOwner}
                  </p>
                </div>
              </div>

              <div className="ml-1.5 h-6 border-l-2 border-dashed border-slate-200" />

              <div className="flex gap-3">
                <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-blue-600 ring-4 ring-blue-50" />

                <div>
                  <p className="text-xs text-slate-400">
                    Novo responsável
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {transfer.newOwner}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-sm font-bold text-slate-900">
              Informações da operação
            </h3>

            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <CalendarDays size={17} className="text-slate-400" />

                <div>
                  <p className="text-xs text-slate-400">
                    Data e horário
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {transfer.date} às {transfer.time}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin size={17} className="text-slate-400" />

                <div>
                  <p className="text-xs text-slate-400">Localização</p>
                  <p className="text-sm font-medium text-slate-700">
                    {transfer.location || "Não informada"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Hash size={17} className="text-slate-400" />

                <div className="min-w-0">
                  <p className="text-xs text-slate-400">
                    Hash da transação
                  </p>
                  <p className="break-all font-mono text-sm text-blue-600">
                    {transfer.hash}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {(transfer.temperature ||
            transfer.humidity ||
            transfer.notes) && (
            <section>
              <h3 className="mb-3 text-sm font-bold text-slate-900">
                Condições e observações
              </h3>

              <div className="space-y-2 rounded-xl bg-slate-50 p-4">
                {transfer.temperature && (
                  <p className="text-sm text-slate-600">
                    Temperatura:{" "}
                    <strong>{transfer.temperature}</strong>
                  </p>
                )}

                {transfer.humidity && (
                  <p className="text-sm text-slate-600">
                    Umidade: <strong>{transfer.humidity}</strong>
                  </p>
                )}

                {transfer.notes && (
                  <p className="border-t border-slate-200 pt-3 text-sm text-slate-600">
                    {transfer.notes}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function TransfersPage({ notify }: Props) {
  const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [storageStatus, setStorageStatus] = useState("Todos");

  const [showModal, setShowModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] =
    useState<Transfer | null>(null);

  const filteredTransfers = useMemo(() => {
  return transfers.filter((transfer) => {
    const searchText = search.toLowerCase();

    const matchesSearch = [
      transfer.id,
      transfer.product,
      transfer.lot,
      transfer.previousOwner,
      transfer.newOwner,
      transfer.hash,
    ].some((value) => value.toLowerCase().includes(searchText));

    const matchesStatus =
      status === "Todos" || transfer.status === status;

    const matchesStorage =
      storageStatus === "Todos" ||
      transfer.storageStatus === storageStatus;

    return matchesSearch && matchesStatus && matchesStorage;
  });
}, [transfers, search, status, storageStatus]);

  const handleCreateTransfer = (data: NewTransferData) => {
    const selectedProduct = transferProducts.find(
      (product) => product.lot === data.lot
    );

    if (!selectedProduct) return;

    const [year, month, day] = data.date.split("-");

    const newTransfer: Transfer = {
      id: `TRF-${year}-${String(transfers.length + 843).padStart(4, "0")}`,
      product: data.product,
      lot: data.lot,
      previousOwner: selectedProduct.owner,
      newOwner: data.destination,
      date: `${day}/${month}/${year}`,
      time: data.time,
      status: "Aguardando confirmação",
      storageStatus: "Em transporte",
      hash: "Pendente",
      location: data.location,
      quantity: selectedProduct.quantity,
      temperature: data.temperature || undefined,
      humidity: data.humidity || undefined,
      notes: data.notes || undefined,
    };

    setTransfers((previous) => [newTransfer, ...previous]);

    setSearch("");
    setStatus("Todos");
    setStorageStatus("Todos");

    notify?.("Transferência cadastrada com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Transferências
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Gerencie a movimentação de produtos entre os participantes da cadeia.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <ArrowLeftRight size={17} />
          Nova transferência
        </button>
      </div>

      {/* Indicadores */}
      <TransferStats transfers={transfers} />

      {/* Histórico */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Histórico de transferências
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Acompanhe as movimentações de custódia dos produtos.
            </p>
          </div>
        </div>

        <TransferFilters
            search={search}
            status={status}
            storageStatus={storageStatus}
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            onStorageStatusChange={setStorageStatus}
            onReset={() => {
                setSearch("");
                setStatus("Todos");
                setStorageStatus("Todos");
            }}
            />

        <TransferTable
          transfers={filteredTransfers}
          onView={setSelectedTransfer}
        />

        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Exibindo {filteredTransfers.length} de {transfers.length} transferências
          </span>

          <span className="text-slate-400">
            Dados demonstrativos
          </span>
        </div>
      </section>

      {/* Cadastro */}
      {showModal && (
        <NewTransferModal
          onClose={() => setShowModal(false)}
          onConfirm={handleCreateTransfer}
        />
      )}

      {/* Detalhes */}
      {selectedTransfer && (
        <TransferDetails
          transfer={selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
        />
      )}
    </div>
  );
}