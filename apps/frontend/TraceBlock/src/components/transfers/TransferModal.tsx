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
} from "lucide-react";

import {
  transferProducts,
  transferOrganizations,
} from "./transfers.data";

import type { NewTransferData } from "./tranfers.type";

interface Props {
  onClose: () => void;
  onConfirm: (data: NewTransferData) => void;
}

const initialForm: NewTransferData = {
  product: "",
  lot: "",
  destination: "",
  location: "",
  date: new Date().toISOString().slice(0, 10),
  time: "11:00",
  temperature: "",
  humidity: "",
  notes: "",
};

const steps = [
  "Produto",
  "Destino",
  "Informações",
  "Validação",
];

export default function NewTransferModal({
  onClose,
  onConfirm,
}: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<NewTransferData>(initialForm);
  const [error, setError] = useState("");

  const selectedProduct = transferProducts.find(
    (product) => product.lot === form.lot
  );

  const updateForm = <K extends keyof NewTransferData>(
    field: K,
    value: NewTransferData[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
  };

  const handleNext = () => {
    if (step === 1 && !form.lot) {
      setError("Selecione um produto para continuar.");
      return;
    }

    if (step === 2 && !form.destination) {
      setError("Selecione o participante de destino.");
      return;
    }

    if (step < 4) {
      setStep((previous) => previous + 1);
    }
  };

  const handleConfirm = () => {
    onConfirm(form);
    onClose();
  };

  const inputClass =
    "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Nova transferência
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Registre a movimentação de custódia de um produto.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper */}
        <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50 px-5 py-5 sm:px-8">
          {steps.map((label, index) => {
            const number = index + 1;
            const completed = step > number;
            const active = step === number;

            return (
              <div key={label} className="relative flex items-center gap-2">
                <div
                  className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    completed || active
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {completed ? <Check size={15} /> : number}
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

                {index !== 3 && (
                  <div
                    className={`absolute left-8 right-0 top-4 h-px ${
                      completed ? "bg-blue-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div className="min-h-[340px] px-6 py-7 sm:px-8">
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h3 className="text-base font-bold text-slate-900">
                  Selecione o produto ou lote
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Escolha o produto cuja custódia será transferida.
                </p>
              </div>

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Produto disponível
              </label>

              <select
                value={form.lot}
                onChange={(event) => {
                  const product = transferProducts.find(
                    (item) => item.lot === event.target.value
                  );

                  setForm((previous) => ({
                    ...previous,
                    lot: product?.lot ?? "",
                    product: product?.name ?? "",
                  }));

                  setError("");
                }}
                className={inputClass}
              >
                <option value="">Selecione um produto</option>

                {transferProducts.map((product) => (
                  <option key={product.lot} value={product.lot}>
                    {product.name} — {product.lot}
                  </option>
                ))}
              </select>

              {selectedProduct && (
                <div className="mt-5 flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <Package size={23} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">
                      {selectedProduct.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {selectedProduct.lot} · {selectedProduct.quantity}
                    </p>

                    <p className="mt-2 text-xs text-slate-600">
                      Responsável atual:{" "}
                      <strong>{selectedProduct.owner}</strong>
                    </p>
                  </div>

                  <Check className="shrink-0 text-green-600" size={20} />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Defina o novo responsável
              </h3>

              <p className="mb-6 mt-1 text-sm text-slate-500">
                Escolha a organização que receberá a custódia.
              </p>

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Participante de destino
              </label>

              <select
                value={form.destination}
                onChange={(event) =>
                  updateForm("destination", event.target.value)
                }
                className={inputClass}
              >
                <option value="">Selecione um participante</option>

                {transferOrganizations
                  .filter(
                    (organization) =>
                      organization !== selectedProduct?.owner
                  )
                  .map((organization) => (
                    <option key={organization} value={organization}>
                      {organization}
                    </option>
                  ))}
              </select>

              {form.destination && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
                    <Truck size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {form.destination}
                    </p>
                    <p className="mt-1 text-xs text-green-700">
                      Participante selecionado para receber a custódia.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Localização da transferência
                </label>

                <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-400">
                  <MapPin size={17} className="text-slate-400" />

                  <input
                    value={form.location}
                    onChange={(event) =>
                      updateForm("location", event.target.value)
                    }
                    placeholder="Ex.: Campinas, SP · Doca 04"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Informações da operação
              </h3>

              <p className="mb-6 mt-1 text-sm text-slate-500">
                Informe a data, o horário e as condições da transferência.
              </p>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Data
                  </label>

                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      updateForm("date", event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Horário
                  </label>

                  <input
                    type="time"
                    value={form.time}
                    onChange={(event) =>
                      updateForm("time", event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Temperatura (opcional)
                  </label>

                  <input
                    value={form.temperature}
                    onChange={(event) =>
                      updateForm("temperature", event.target.value)
                    }
                    placeholder="Ex.: 18,4 °C"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Umidade (opcional)
                  </label>

                  <input
                    value={form.humidity}
                    onChange={(event) =>
                      updateForm("humidity", event.target.value)
                    }
                    placeholder="Ex.: 61%"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Observações
                  </label>

                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateForm("notes", event.target.value)
                    }
                    placeholder="Adicione informações relevantes sobre a operação..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Validação automática
                  </span>

                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    Revise a transferência
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Confira os dados antes de concluir o registro.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700">
                  <ShieldCheck size={21} />
                  <span className="text-sm font-semibold">
                    Pré-validação
                  </span>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                {[
                  "Produto e lote selecionados",
                  "Participante de destino informado",
                  "Data e horário preenchidos",
                  "Responsável atual identificado",
                  "Dados da operação revisados",
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-400">Produto</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {form.product}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Origem</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {selectedProduct?.owner}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Destino</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {form.destination}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm font-medium text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
          <button
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
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
            onClick={step === 4 ? handleConfirm : handleNext}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            {step === 4 ? (
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