import {
  PackageOpen,
  Truck,
  Warehouse,
  Clock3,
} from "lucide-react";

const stats = [
  {
    label: "Total de lotes",
    value: "248",
    icon: PackageOpen,
    color: "text-blue-600",
    background: "bg-blue-50",
  },
  {
    label: "Em transporte",
    value: "94",
    icon: Truck,
    color: "text-indigo-600",
    background: "bg-indigo-50",
  },
  {
    label: "Armazenados",
    value: "72",
    icon: Warehouse,
    color: "text-emerald-600",
    background: "bg-emerald-50",
  },
  {
    label: "Pendentes",
    value: "30",
    icon: Clock3,
    color: "text-amber-600",
    background: "bg-amber-50",
  },
];

export default function ProductStats() {
  return (
    <section className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className={`flex items-center gap-3 ${
              index !== 0 ? "lg:border-l lg:border-slate-200 lg:pl-5" : ""
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.background}`}
            >
              <Icon size={19} className={stat.color} />
            </div>

            <div className="min-w-0">
              <p className="text-xl font-bold tracking-tight text-slate-900">
                {stat.value}
              </p>

              <p className="truncate text-xs text-slate-500">
                {stat.label}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}