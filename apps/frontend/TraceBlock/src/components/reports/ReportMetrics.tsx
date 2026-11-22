import { ArrowLeftRight, Clock3, ShieldCheck, AlertTriangle } from "lucide-react";
import type { ReportMetricsData } from "./reports.types";
interface ReportMetricsProps { metrics: ReportMetricsData }
export default function ReportMetrics({ metrics }: ReportMetricsProps) {
  const cards = [
    { label: "Movimentações", value: metrics.movements.toLocaleString("pt-BR"), note: "Transferências no período", icon: ArrowLeftRight, color: "bg-blue-50 text-blue-600" },
    { label: "Tempo médio de confirmação", value: `${metrics.averageTransitDays.toFixed(1).replace(".", ",")} dias`, note: "Envio até confirmação", icon: Clock3, color: "bg-emerald-50 text-emerald-600" },
    { label: "Taxa de confirmação", value: `${metrics.confirmationRate.toFixed(1).replace(".", ",")}%`, note: `${metrics.confirmed} transferências confirmadas`, icon: ShieldCheck, color: "bg-violet-50 text-violet-600" },
    { label: "Ocorrências", value: metrics.occurrences.toLocaleString("pt-BR"), note: "Transferências com ocorrência registrada", icon: AlertTriangle, color: "bg-amber-50 text-amber-600" },
  ];
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => { const Icon = card.icon; return (
        <article key={card.label} className="flex min-h-[130px] items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><p className="text-sm font-medium text-slate-500">{card.label}</p><h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{card.value}</h3><p className="mt-2 text-xs text-slate-400">{card.note}</p></div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.color}`}><Icon size={19}/></div>
        </article>
      ); })}
    </section>
  );
}
