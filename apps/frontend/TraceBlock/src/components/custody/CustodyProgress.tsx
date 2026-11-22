import { AlertTriangle, CheckCircle2, Clock3, Route } from "lucide-react";
import type { CustodyStep } from "./custody,types";

interface Props {
  steps: CustodyStep[];
}

export default function CustodyProgress({ steps }: Props) {
  // Uma ocorrência altera o estado da etapa, mas não a remove da cadeia configurada.
  const chain = steps;
  const issues = steps.filter((step) => step.state === "issue").length;

  const completed = chain.filter((step) => step.state === "done").length;
  const current = chain.find((step) => step.state === "current");
  const reached = completed + (current ? 1 : 0);

  const percentage = chain.length
    ? Math.round((reached / chain.length) * 100)
    : 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Route size={17} className="text-blue-600" />
            Progresso da cadeia
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Acompanhamento das etapas de custódia do lote
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-xl font-bold tracking-tight text-slate-900">
            {reached} de {chain.length} etapas
          </p>

          <p className="text-xs text-slate-500">
            {percentage}% da cadeia percorrida
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-emerald-600" />
          {completed} etapas concluídas
        </span>

        {issues > 0 && (
          <span className="inline-flex items-center gap-1.5 text-red-600">
            <AlertTriangle size={14} />
            {issues} {issues === 1 ? "ocorrência" : "ocorrências"}
          </span>
        )}

        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={14} className="text-blue-600" />
          {current ? `Custódia atual: ${current.org}` : "Sem custódia registrada"}
        </span>
      </div>
    </section>
  );
}
