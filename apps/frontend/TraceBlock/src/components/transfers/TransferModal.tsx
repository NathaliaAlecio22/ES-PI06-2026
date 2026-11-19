import { useState } from "react";

import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Package,
  MapPin,
  ShieldCheck,
  Truck,
  LoaderCircle,
} from "lucide-react";

import type {
  NewTransferData,
  TransferLotOption,
  TransferParticipantOption,
} from "./tranfers.type";

interface Props {
  lots: TransferLotOption[];
  participants: TransferParticipantOption[];
  onClose: () => void;
  onConfirm: (data: NewTransferData) => Promise<void>;
}

const initialForm: NewTransferData = {
  lot: "",
  destinationId: "",
  location: "",
  temperature: "",
  humidity: "",
  notes: "",
};

const steps = [
  "Lote",
  "Destino",
  "Condições",
  "Validação",
];

export default function NewTransferModal({
  lots,
  participants,
  onClose,
  onConfirm,
}: Props) {
  const [step, setStep] = useState(1);

  const [form, setForm] =
    useState<NewTransferData>(initialForm);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedLot = lots.find(
    (lot) => lot.code === form.lot,
  );

  const selectedDestination = participants.find(
    (participant) => participant.id === form.destinationId,
  );

  const updateForm = <K extends keyof NewTransferData>(
    field: K,
    value: NewTransferData[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
  };

  const handleNext = () => {
    if (step === 1 && !form.lot) {
      setError(
        "Selecione um lote que esteja sob a custódia da sua organização.",
      );

      return;
    }

    if (step === 2) {
      if (!form.destinationId) {
        setError(
          "Selecione o participante que receberá o lote.",
        );

        return;
      }

      if (!form.location.trim()) {
        setError(
          "Informe a localização da transferência.",
        );

        return;
      }
    }

    setError("");

    if (step < 4) {
      setStep((current) => current + 1);
    }
  };

  const handleConfirm = async () => {
    if (!selectedLot || !selectedDestination) {
      setError(
        "Confira o lote e o participante de destino antes de continuar.",
      );

      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onConfirm(form);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível cadastrar a transferência.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50";

  const quantityLabel = selectedLot
    ? [selectedLot.quantity, selectedLot.unit]
        .filter(Boolean)
        .join(" ") || "Quantidade não informada"
    : "";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isSubmitting
        ) {
          onClose();
        }
      }}
    >
      <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* CABEÇALHO */}

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Nova transferência
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Registre a passagem de custódia de um lote inteiro.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* STEPPER */}

        <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50 px-5 py-5 sm:px-8">
          {steps.map((label, index) => {
            const number = index + 1;
            const completed = step > number;
            const active = step === number;

            return (
              <div
                key={label}
                className="relative flex items-center gap-2"
              >
                <div
                  className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    completed || active
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {completed ? (
                    <Check size={15} />
                  ) : (
                    number
                  )}
                </div>

                <span
                  className={`relative z-20 hidden bg-slate-50 px-1 text-xs font-medium sm:block ${
                    active || completed
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {label}
                </span>

                {index !== steps.length - 1 && (
                  <div
                    className={`absolute left-8 right-0 top-4 h-px ${
                      completed
                        ? "bg-blue-500"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* CONTEÚDO */}

        <div className="min-h-[340px] px-6 py-7 sm:px-8">

          {/* ETAPA 1 - LOTE */}

          {step === 1 && (
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Selecione o lote
              </h3>

              <p className="mb-6 mt-1 text-sm text-slate-500">
                São exibidos apenas lotes disponíveis e atualmente sob sua custódia.
              </p>

              {lots.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Não há lotes disponíveis para transferência.
                  Um lote em transporte ou sem custódia da sua
                  organização não pode ser selecionado.
                </div>
              ) : (
                <>
                  <label
                    htmlFor="transfer-lot"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Lote disponível
                  </label>

                  <select
                    id="transfer-lot"
                    value={form.lot}
                    onChange={(event) =>
                      updateForm("lot", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">
                      Selecione um lote
                    </option>

                    {lots.map((lot) => (
                      <option
                        key={lot.id}
                        value={lot.code}
                      >
                        {lot.product} — {lot.code}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {selectedLot && (
                <div className="mt-5 flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <Package size={23} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">
                      {selectedLot.product}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {selectedLot.code} · {quantityLabel}
                    </p>

                    <p className="mt-2 text-xs text-slate-600">
                      Responsável atual:{" "}
                      <strong>
                        {selectedLot.currentOwner}
                      </strong>
                    </p>

                    {selectedLot.location && (
                      <p className="mt-1 text-xs text-slate-500">
                        Local de origem: {selectedLot.location}
                      </p>
                    )}
                  </div>

                  <Check
                    className="shrink-0 text-green-600"
                    size={20}
                  />
                </div>
              )}
            </div>
          )}

          {/* ETAPA 2 - DESTINO */}

          {step === 2 && (
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Defina o novo responsável
              </h3>

              <p className="mb-6 mt-1 text-sm text-slate-500">
                Escolha um participante ativo para receber a custódia do lote.
              </p>

              <label
                htmlFor="transfer-destination"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Participante de destino
              </label>

              <select
                id="transfer-destination"
                value={form.destinationId}
                onChange={(event) =>
                  updateForm(
                    "destinationId",
                    event.target.value,
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Selecione um participante
                </option>

                {participants.map((participant) => (
                  <option
                    key={participant.id}
                    value={participant.id}
                  >
                    {participant.name}
                    {participant.type
                      ? ` · ${participant.type}`
                      : ""}
                  </option>
                ))}
              </select>

              {selectedDestination && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
                    <Truck size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedDestination.name}
                    </p>

                    <p className="mt-1 text-xs text-green-700">
                      Participante ativo selecionado para receber a custódia.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <label
                  htmlFor="transfer-location"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Localização da transferência
                </label>

                <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-400">
                  <MapPin
                    size={17}
                    className="text-slate-400"
                  />

                  <input
                    id="transfer-location"
                    value={form.location}
                    onChange={(event) =>
                      updateForm("location", event.target.value)
                    }
                    placeholder="Ex.: Campinas, SP · Doca 04"
                    maxLength={200}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3 - CONDIÇÕES */}

          {step === 3 && (
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Condições do lote
              </h3>

              <p className="mb-6 mt-1 text-sm text-slate-500">
                Registre as condições observadas no momento da expedição.
                Os campos são opcionais.
              </p>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="transfer-temperature"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Temperatura (°C)
                  </label>

                  <input
                    id="transfer-temperature"
                    type="number"
                    step="0.01"
                    value={form.temperature}
                    onChange={(event) =>
                      updateForm(
                        "temperature",
                        event.target.value,
                      )
                    }
                    placeholder="Ex.: 18,4"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="transfer-humidity"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Umidade (%)
                  </label>

                  <input
                    id="transfer-humidity"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.humidity}
                    onChange={(event) =>
                      updateForm(
                        "humidity",
                        event.target.value,
                      )
                    }
                    placeholder="Ex.: 61"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="transfer-notes"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Observações
                  </label>

                  <textarea
                    id="transfer-notes"
                    value={form.notes}
                    onChange={(event) =>
                      updateForm("notes", event.target.value)
                    }
                    placeholder="Adicione informações relevantes sobre a operação..."
                    rows={3}
                    maxLength={2000}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div className="mt-5 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                A data e o horário serão definidos pelo servidor no momento do registro,
                preservando o horário efetivo da operação.
              </div>
            </div>
          )}

          {/* ETAPA 4 - REVISÃO */}

          {step === 4 && (
            <div>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Revisão
                  </span>

                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    Revise a transferência
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    A custódia só mudará para o destino depois da confirmação do recebimento.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700">
                  <ShieldCheck size={21} />

                  <span className="text-sm font-semibold">
                    Pronto para registrar
                  </span>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                {[
                  "Lote sob custódia da sua organização",
                  "Destino selecionado entre os participantes ativos",
                  "Localização informada",
                  "Transferência do lote inteiro",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-slate-700"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Check size={14} />
                    </span>

                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <h4 className="mb-4 text-sm font-semibold text-slate-800">
                  Resumo da transferência
                </h4>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-400">
                      Produto / lote
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {selectedLot?.product}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {selectedLot?.code} · {quantityLabel}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Origem
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {selectedLot?.currentOwner}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Destino
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {selectedDestination?.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Localização informada
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {form.location}
                    </p>
                  </div>

                  {(form.temperature || form.humidity) && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-400">
                        Condições
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {form.temperature
                          ? `Temperatura: ${form.temperature} °C`
                          : ""}

                        {form.temperature && form.humidity
                          ? " · "
                          : ""}

                        {form.humidity
                          ? `Umidade: ${form.humidity}%`
                          : ""}
                      </p>
                    </div>
                  )}

                  {form.notes && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-400">
                        Observações
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {form.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ERROS */}

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
            >
              {error}
            </p>
          )}
        </div>

        {/* RODAPÉ */}

        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
          <button
            onClick={
              step === 1
                ? onClose
                : () => setStep((current) => current - 1)
            }
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {step === 1 ? (
              "Cancelar"
            ) : (
              <>
                <ArrowLeft size={16} />
                Voltar
              </>
            )}
          </button>

          <button
            onClick={
              step === 4
                ? handleConfirm
                : handleNext
            }
            disabled={
              isSubmitting ||
              (step === 1 && lots.length === 0)
            }
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
                Registrando...
              </>
            ) : step === 4 ? (
              <>
                <Check size={16} />
                Confirmar transferência
              </>
            ) : (
              <>
                Continuar
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}