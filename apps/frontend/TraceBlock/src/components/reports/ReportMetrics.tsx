import {
  ArrowRight,
  Clock3,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type { ReportRecord } from "./reports.types";

interface ReportMetricsProps {
  records: ReportRecord[];
}

export default function ReportMetrics({
  records,
}: ReportMetricsProps) {
  const movements = records.reduce(
    (total, item) => total + item.movements,
    0
  );

  const alerts = records.reduce(
    (total, item) => total + item.alerts,
    0
  );

  const averageTransit =
    records.length > 0
      ? records.reduce(
          (total, item) => total + item.transitDays,
          0
        ) / records.length
      : 0;

  const averageCompliance =
    records.length > 0
      ? records.reduce(
          (total, item) => total + item.compliance,
          0
        ) / records.length
      : 0;

  const metrics = [
    {
      label: "Movimentações",
      value: movements.toLocaleString("pt-BR"),
      note: "Total no período selecionado",
      icon: ArrowRight,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Tempo médio em trânsito",
      value: `${averageTransit.toFixed(1).replace(".", ",")} dias`,
      note: "Média de tempo das operações",
      icon: Clock3,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Conformidade",
      value: `${averageCompliance.toFixed(1).replace(".", ",")}%`,
      note: "Índice médio de conformidade",
      icon: ShieldCheck,
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Alertas de condição",
      value: alerts.toLocaleString("pt-BR"),
      note: "Alertas registrados no período",
      icon: AlertTriangle,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <article
            key={metric.label}
            className="flex min-h-[130px] items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <p className="text-sm font-medium text-slate-500">
                {metric.label}
              </p>

              <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                {metric.value}
              </h3>

              <p className="mt-2 text-xs text-slate-400">
                {metric.note}
              </p>
            </div>

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${metric.color}`}
            >
              <Icon size={19} />
            </div>
          </article>
        );
      })}
    </section>
  );
}