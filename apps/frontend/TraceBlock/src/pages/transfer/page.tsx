import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeftRight,
  CalendarDays,
  Hash,
  MapPin,
  Package,
  X,
  CheckCircle2,
  AlertTriangle,
  LoaderCircle,
} from "lucide-react";

import TransferStats from "../../components/transfers/TransferStats";
import TransferFilters from "../../components/transfers/TransfersFilters";
import TransferTable from "../../components/transfers/TransferTable";
import NewTransferModal from "../../components/transfers/TransferModal";

import type {
  NewTransferData,
  Transfer,
  TransferOptions,
  TransferStatsData,
} from "../../components/transfers/tranfers.type";

import {
  buscarEstatisticasTransferencias,
  buscarOpcoesTransferencia,
  confirmarTransferencia,
  criarTransferencia,
  listarTransferencias,
  registrarOcorrenciaTransferencia,
} from "../../services/transferencias";

import { getUsuario } from "../../services/auth";

interface Props {
  notify?: (message: string) => void;
}

interface TransferDetailsProps {
  transfer: Transfer;
  onClose: () => void;
  onConfirmReceipt: (rawId: string) => Promise<void>;
  onReportIssue: (
    rawId: string,
    notes: string,
  ) => Promise<void>;
}

// ======================================================
// DETALHES DA TRANSFERÊNCIA
// ======================================================

function TransferDetails({
  transfer,
  onClose,
  onConfirmReceipt,
  onReportIssue,
}: TransferDetailsProps) {
  const [issueMode, setIssueMode] = useState(false);
  const [issueNotes, setIssueNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState("");

  const handleConfirmReceipt = async () => {
    setIsProcessing(true);
    setActionError("");

    try {
      await onConfirmReceipt(transfer.rawId);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar o recebimento.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReportIssue = async () => {
    if (issueNotes.trim().length < 3) {
      setActionError(
        "Descreva a ocorrência com pelo menos 3 caracteres.",
      );

      return;
    }

    setIsProcessing(true);
    setActionError("");

    try {
      await onReportIssue(
        transfer.rawId,
        issueNotes,
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a ocorrência.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const statusStyle =
    transfer.status === "Com ocorrência"
      ? "border-red-200 bg-red-50"
      : transfer.status === "Confirmada"
        ? "border-green-200 bg-green-50"
        : "border-amber-200 bg-amber-50";

  return (
    <div
      className="fixed inset-0 z-[110] flex justify-end bg-slate-950/40 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isProcessing
        ) {
          onClose();
        }
      }}
    >
      <aside className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl">

        {/* CABEÇALHO */}

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
            disabled={isProcessing}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 disabled:opacity-50"
            aria-label="Fechar detalhes"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTEÚDO */}

        <div className="flex-1 space-y-6 p-6">

          {/* STATUS */}

          <div
            className={`rounded-xl border p-4 ${statusStyle}`}
          >
            <p className="text-sm font-semibold text-slate-800">
              {transfer.status}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {transfer.status === "Aguardando confirmação"
                ? "O lote permanece sob custódia da origem até o destino confirmar o recebimento."
                : transfer.status === "Confirmada"
                  ? "O recebimento foi confirmado e a custódia passou para o destino."
                  : "Foi registrada uma ocorrência e o lote permanece com a origem."}
            </p>
          </div>

          {/* PRODUTO */}

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
                  {transfer.lot} ·{" "}
                  {transfer.quantity || "Quantidade não informada"}
                </p>
              </div>
            </div>
          </section>

          {/* CUSTÓDIA */}

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
                <div
                  className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                    transfer.status === "Confirmada"
                      ? "bg-green-600 ring-4 ring-green-50"
                      : "bg-blue-600 ring-4 ring-blue-50"
                  }`}
                />

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

          {/* INFORMAÇÕES DA OPERAÇÃO */}

          <section>
            <h3 className="mb-4 text-sm font-bold text-slate-900">
              Informações da operação
            </h3>

            <div className="space-y-3 rounded-xl border border-slate-200 p-4">

              <div className="flex items-center gap-3">
                <CalendarDays
                  size={17}
                  className="text-slate-400"
                />

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
                <MapPin
                  size={17}
                  className="text-slate-400"
                />

                <div>
                  <p className="text-xs text-slate-400">
                    Localização
                  </p>

                  <p className="text-sm font-medium text-slate-700">
                    {transfer.location || "Não informada"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Hash
                  size={17}
                  className="text-slate-400"
                />

                <div className="min-w-0">
                  <p className="text-xs text-slate-400">
                    Hash da transação
                  </p>

                  <p className="break-all font-mono text-sm text-blue-600">
                    {transfer.hash}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400">
                  Status de armazenamento
                </p>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  {transfer.storageStatus}
                </p>
              </div>
            </div>
          </section>

          {/* CONDIÇÕES */}

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
                    Umidade:{" "}
                    <strong>{transfer.humidity}</strong>
                  </p>
                )}

                {transfer.notes && (
                  <p className="whitespace-pre-wrap border-t border-slate-200 pt-3 text-sm text-slate-600">
                    {transfer.notes}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* AÇÕES DO DESTINATÁRIO */}

          {transfer.canRespond && (
            <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ação do destinatário
                </h3>

                <p className="mt-1 text-xs text-slate-600">
                  Confira o lote antes de aceitar. Ao confirmar, a custódia será alterada para sua organização.
                </p>
              </div>

              {issueMode ? (
                <div className="space-y-3">
                  <label
                    htmlFor="transfer-issue-notes"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Descrição da ocorrência
                  </label>

                  <textarea
                    id="transfer-issue-notes"
                    value={issueNotes}
                    onChange={(event) => {
                      setIssueNotes(event.target.value);
                      setActionError("");
                    }}
                    rows={4}
                    maxLength={2000}
                    placeholder="Descreva divergências, avarias ou condições inadequadas..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIssueMode(false);
                        setActionError("");
                      }}
                      disabled={isProcessing}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Voltar
                    </button>

                    <button
                      onClick={() => void handleReportIssue()}
                      disabled={
                        isProcessing ||
                        issueNotes.trim().length < 3
                      }
                      className="flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isProcessing
                        ? "Registrando..."
                        : "Enviar ocorrência"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => void handleConfirmReceipt()}
                    disabled={isProcessing}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}

                    Confirmar recebimento
                  </button>

                  <button
                    onClick={() => setIssueMode(true)}
                    disabled={isProcessing}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <AlertTriangle size={16} />

                    Registrar ocorrência
                  </button>
                </div>
              )}

              {actionError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {actionError}
                </p>
              )}
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

// ======================================================
// ESTADOS INICIAIS
// ======================================================

const emptyStats: TransferStatsData = {
  total: 0,
  pending: 0,
  confirmed: 0,
  withIssue: 0,
};

const emptyOptions: TransferOptions = {
  lots: [],
  participants: [],
};

// ======================================================
// PÁGINA PRINCIPAL
// ======================================================

export default function TransfersPage({ notify }: Props) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const [stats, setStats] =
    useState<TransferStatsData>(emptyStats);

  const [options, setOptions] =
    useState<TransferOptions>(emptyOptions);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [storageStatus, setStorageStatus] = useState("Todos");

  const [showModal, setShowModal] = useState(false);

  const [selectedTransfer, setSelectedTransfer] =
    useState<Transfer | null>(null);

  // ====================================================
  // ATUALIZAR DADOS
  // ====================================================

  async function refreshData() {
    const [
      loadedTransfers,
      loadedStats,
      loadedOptions,
    ] = await Promise.all([
      listarTransferencias(),
      buscarEstatisticasTransferencias(),
      buscarOpcoesTransferencia(),
    ]);

    setTransfers(loadedTransfers);
    setStats(loadedStats);
    setOptions(loadedOptions);
    setLoadError("");
  }

  // ====================================================
  // CARREGAMENTO INICIAL
  // ====================================================

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [
          loadedTransfers,
          loadedStats,
          loadedOptions,
        ] = await Promise.all([
          listarTransferencias(),
          buscarEstatisticasTransferencias(),
          buscarOpcoesTransferencia(),
        ]);

        if (!active) return;

        setTransfers(loadedTransfers);
        setStats(loadedStats);
        setOptions(loadedOptions);
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as transferências.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  // ====================================================
  // FILTROS
  // ====================================================

  const filteredTransfers = useMemo(() => {
    return transfers.filter((transfer) => {
      const searchText =
        search.toLocaleLowerCase("pt-BR");

      const matchesSearch = [
        transfer.id,
        transfer.product,
        transfer.lot,
        transfer.previousOwner,
        transfer.newOwner,
        transfer.hash,
      ].some((value) =>
        value
          .toLocaleLowerCase("pt-BR")
          .includes(searchText),
      );

      const matchesStatus =
        status === "Todos" ||
        transfer.status === status;

      const matchesStorage =
        storageStatus === "Todos" ||
        transfer.storageStatus === storageStatus;

      return matchesSearch && matchesStatus && matchesStorage;
    });
  }, [transfers, search, status, storageStatus]);

  // ====================================================
  // CRIAR TRANSFERÊNCIA
  // ====================================================

  async function handleCreateTransfer(
    data: NewTransferData,
  ) {
    const created = await criarTransferencia(data);

    setTransfers((current) => [
      created,
      ...current.filter(
        (item) => item.rawId !== created.rawId,
      ),
    ]);

    setStats((current) => ({
      ...current,
      total: current.total + 1,
      pending: current.pending + 1,
    }));

    setOptions((current) => ({
      ...current,
      lots: current.lots.filter(
        (lot) => lot.code !== data.lot,
      ),
    }));

    setSearch("");
    setStatus("Todos");
    setStorageStatus("Todos");

    notify?.(
      "Transferência registrada. Aguardando confirmação do destinatário.",
    );

    void refreshData().catch((error) => {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar os dados.",
      );
    });
  }

  // ====================================================
  // CONFIRMAR RECEBIMENTO
  // ====================================================

  async function handleConfirmReceipt(rawId: string) {
    const updated =
      await confirmarTransferencia(rawId);

    setTransfers((current) =>
      current.map((item) =>
        item.rawId === rawId ? updated : item,
      ),
    );

    setStats((current) => ({
      ...current,
      pending: Math.max(0, current.pending - 1),
      confirmed: current.confirmed + 1,
    }));

    setSelectedTransfer(null);

    notify?.(
      "Recebimento confirmado. A custódia do lote foi transferida para sua organização.",
    );

    void refreshData().catch((error) => {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar os dados.",
      );
    });
  }

  // ====================================================
  // REGISTRAR OCORRÊNCIA
  // ====================================================

  async function handleReportIssue(
    rawId: string,
    notes: string,
  ) {
    const updated =
      await registrarOcorrenciaTransferencia(
        rawId,
        notes,
      );

    setTransfers((current) =>
      current.map((item) =>
        item.rawId === rawId ? updated : item,
      ),
    );

    setStats((current) => ({
      ...current,
      pending: Math.max(0, current.pending - 1),
      withIssue: current.withIssue + 1,
    }));

    setSelectedTransfer(null);

    notify?.(
      "Ocorrência registrada. O lote permanece sob custódia da origem.",
    );

    void refreshData().catch((error) => {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar os dados.",
      );
    });
  }

  // ====================================================
  // PERMISSÕES
  // ====================================================

  const usuario = getUsuario();

  const normalizedProfile =
    usuario?.perfil?.toUpperCase();

  const canCreate =
    Boolean(usuario) &&
    normalizedProfile !== "VIEWER" &&
    normalizedProfile !== "VISUALIZADOR";

  // ====================================================
  // INTERFACE
  // ====================================================

  return (
    <div className="space-y-6">

      {/* CABEÇALHO */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Transferências
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Gerencie a movimentação de custódia dos lotes entre participantes da cadeia.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            disabled={
              isLoading ||
              options.lots.length === 0 ||
              options.participants.length === 0
            }
            title={
              options.lots.length === 0
                ? "Não há lotes disponíveis para transferir"
                : undefined
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeftRight size={17} />
            Nova transferência
          </button>
        )}
      </div>

      {/* ERRO DE CARREGAMENTO */}

      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-semibold">
            Não foi possível carregar os dados de transferências.
          </p>

          <p>{loadError}</p>

          <button
            onClick={() => {
              setIsLoading(true);

              void refreshData()
                .catch((error) =>
                  setLoadError(
                    error instanceof Error
                      ? error.message
                      : "Falha ao atualizar.",
                  ),
                )
                .finally(() => setIsLoading(false));
            }}
            className="self-start rounded-lg border border-red-200 bg-white px-3 py-1.5 font-semibold hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* INDICADORES */}

      <TransferStats stats={stats} />

      {/* HISTÓRICO */}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Histórico de transferências
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Acompanhe as movimentações de custódia registradas pela sua organização.
            </p>
          </div>
        </div>

        {/* FILTROS */}

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

        {/* TABELA */}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500">
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
            Carregando transferências...
          </div>
        ) : (
          <TransferTable
            transfers={filteredTransfers}
            onView={setSelectedTransfer}
          />
        )}

        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Exibindo {filteredTransfers.length} de{" "}
            {transfers.length} transferências
          </span>

          <span className="text-slate-400">
            Dados carregados do banco de dados
          </span>
        </div>
      </section>

      {/* MODAL DE NOVA TRANSFERÊNCIA */}

      {showModal && (
        <NewTransferModal
          lots={options.lots}
          participants={options.participants}
          onClose={() => setShowModal(false)}
          onConfirm={handleCreateTransfer}
        />
      )}

      {/* DETALHES DA TRANSFERÊNCIA */}

      {selectedTransfer && (
        <TransferDetails
          transfer={{
            ...selectedTransfer,
            canRespond:
              selectedTransfer.canRespond && canCreate,
          }}
          onClose={() => setSelectedTransfer(null)}
          onConfirmReceipt={handleConfirmReceipt}
          onReportIssue={handleReportIssue}
        />
      )}
    </div>
  );
}