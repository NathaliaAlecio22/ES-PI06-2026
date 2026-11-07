import {
  PackageOpen,
  Truck,
  Warehouse,
  ArrowLeftRight,
  Clock3,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

interface Metric {
    title: string;
    value: string;
    description: string;
    icon: LucideIcon;
    iconColor: string;
    iconBg: string;
}

const metrics: Metric[] = [
    {
    title: "Total de lotes",
    value: "248",
    description: "Lotes cadastrados",
    icon: PackageOpen,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    title: "Em transporte",
    value: "94",
    description: "Lotes em trânsito",
    icon: Truck,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
  },
  {
    title: "Armazenados",
    value: "72",
    description: "Lotes em estoque",
    icon: Warehouse,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    title: "Transferências",
    value: "1.284",
    description: "Movimentações realizadas",
    icon: ArrowLeftRight,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
  },
  {
    title: "Pendências",
    value: "07",
    description: "Aguardando validação",
    icon: Clock3,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
  },
  {
    title: "Registros inválidos",
    value: "02",
    description: "Precisam de atenção",
    icon: ShieldAlert,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
  },
]

function MetricCard({metric}: {metric: Metric}) {
    const Icon = metric.icon;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        {metric.title}
                    </p>

                    <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                        {metric.value}
                    </h3>
                </div>

                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${metric.iconBg}`}>
                    <Icon size={21} className={metric.iconColor} />
                </div>
            </div>
        </div>
    )
    
}

export default function MetricsCard() {
    return (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {metrics.map((metric) => (
                <MetricCard key={metric.title} metric={metric} />
            ))}
        </section>
    )
}