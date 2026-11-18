import {
  PackageOpen,
  Truck,
  Warehouse,
  ArrowLeftRight,
  Clock3,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

import type { ProductStatsData } from "../../services/produtos";

interface Metric {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

interface MetricsCardProps {
  stats: ProductStatsData | null; // null enquanto carrega ou se der erro
}

const formatNumber = (value?: number) =>
  value === undefined ? "—" : value.toLocaleString("pt-BR");

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{metric.title}</p>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {metric.value}
          </h3>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${metric.iconBg}`}
        >
          <Icon size={21} className={metric.iconColor} />
        </div>
      </div>
    </div>
  );
}

export default function MetricsCard({ stats }: MetricsCardProps) {
  const metrics: Metric[] = [
    {
      title: "Total de lotes",
      value: formatNumber(stats?.total),
      icon: PackageOpen,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
    },
    {
      title: "Em transporte",
      value: formatNumber(stats?.inTransit),
      icon: Truck,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
    },
    {
      title: "Armazenados",
      value: formatNumber(stats?.stored),
      icon: Warehouse,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
    {
      // ainda sem backend: mantido fixo
      title: "Transferências",
      value: "1.284",
      icon: ArrowLeftRight,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-50",
    },
    {
      title: "Pendências",
      value: formatNumber(stats?.pending),
      icon: Clock3,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-50",
    },
    {
      // ainda sem backend: mantido fixo
      title: "Registros inválidos",
      value: "02",
      icon: ShieldAlert,
      iconColor: "text-red-600",
      iconBg: "bg-red-50",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => (
        <MetricCard key={metric.title} metric={metric} />
      ))}
    </section>
  );
}