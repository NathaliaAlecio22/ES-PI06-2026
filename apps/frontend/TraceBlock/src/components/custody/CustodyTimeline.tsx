import {
  Check,
  ClipboardCheck,
  Clock3,
  Copy,
  Fingerprint,
  MapPin,
  MoreHorizontal,
  Truck,
  UserRound,
} from "lucide-react";

import type { CustodyStep } from "./custody,types";

interface Props {
  steps: CustodyStep[];
}

function stateLabel(state: CustodyStep["state"]) {
  if (state === "done") return "Concluída";
  if (state === "current") return "Etapa atual";
  return "Pendente";
}

function stateClasses(state: CustodyStep["state"]) {
  if (state === "done")
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";

  if (state === "current")
    return "bg-blue-50 text-blue-700 ring-blue-200";

  return "bg-slate-100 text-slate-500 ring-slate-200";
}

export default function CustodyTimeline({ steps }: Props) {
  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
    } catch {
      // Clipboard pode estar indisponível em contextos sem permissão HTTPS.
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Histórico de custódia
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Linha do tempo de organizações, responsáveis e movimentações
          </p>
        </div>

        <span className="w-fit rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {steps.length} registros
        </span>
      </div>

      {steps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
          Nenhum registro de custódia encontrado para este lote.
        </div>
      ) : (
        <div>
          {steps.map((step, index) => (
            <div className="flex gap-4 sm:gap-5" key={step.id}>
              <div className="flex w-9 shrink-0 flex-col items-center">
                <span
                  className={`z-10 grid h-9 w-9 place-items-center rounded-full ring-4 ring-white ${
                    step.state === "done"
                      ? "bg-emerald-100 text-emerald-700"
                      : step.state === "current"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {step.state === "done" ? (
                    <Check size={17} />
                  ) : step.state === "current" ? (
                    <Truck size={17} />
                  ) : (
                    <Clock3 size={17} />
                  )}
                </span>

                {index < steps.length - 1 && (
                  <span className="my-1 min-h-8 w-px flex-1 bg-slate-200" />
                )}
              </div>

              <article
                className={`mb-5 min-w-0 flex-1 rounded-xl border p-4 transition ${
                  step.state === "current"
                    ? "border-blue-200 bg-blue-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${stateClasses(
                        step.state
                      )}`}
                    >
                      {stateLabel(step.state)}
                    </span>

                    <h3 className="mt-2 text-sm font-semibold text-slate-900">
                      {step.org}
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {step.role}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label={`Mais opções para ${step.org}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Detail
                    icon={UserRound}
                    label="Responsável"
                    value={step.person}
                  />

                  <Detail
                    icon={MapPin}
                    label="Localização"
                    value={step.location}
                  />

                  <Detail
                    icon={Clock3}
                    label="Data e horário"
                    value={step.date}
                  />

                  <Detail
                    icon={ClipboardCheck}
                    label="Operação"
                    value={step.type}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
                  <Fingerprint size={15} className="text-slate-400" />

                  <span className="text-slate-500">
                    Hash da transação
                  </span>

                  <code className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-700">
                    {step.hash}
                  </code>

                  {step.hash !== "Pendente" && (
                    <button
                      type="button"
                      onClick={() => void copyHash(step.hash)}
                      title="Copiar hash"
                      className="rounded p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                </div>
              </article>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-slate-400" />

      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 break-words text-xs font-medium text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}