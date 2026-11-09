import {
  ArrowLeftRight,
  Clock3,
  Truck,
  AlertTriangle,
} from "lucide-react";

import type { Transfer } from "./tranfers.type";

interface Props {
  transfers: Transfer[];
}

export default function TransferStats({ transfers }: Props) {
  const stats = [
    {
      label: "Transferências realizadas",
      value: transfers.length,
      description: "Registros cadastrados",
      icon: ArrowLeftRight,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Aguardando confirmação",
      value: transfers.filter(
        (item) => item.status === "Aguardando confirmação"
      ).length,
      description: "Pendentes de confirmação",
      icon: Clock3,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Em andamento",
      value: transfers.filter(
        (item) => item.status === "Em andamento"
      ).length,
      description: "Movimentações ativas",
      icon: Truck,
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Com ocorrência",
      value: transfers.filter(
        (item) => item.status === "Com ocorrência"
      ).length,
      description: "Requerem atenção",
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>

                <h3 className="mt-3 text-2xl font-bold text-slate-900">
                  {stat.value}
                </h3>
              </div>

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}
              >
                <Icon size={21} />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              {stat.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}