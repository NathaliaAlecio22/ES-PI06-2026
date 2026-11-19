import {
  ArrowLeftRight,
  Clock3,
  Truck,
  AlertTriangle,
} from "lucide-react";

import type { TransferStatsData } from "./tranfers.type";

interface Props {
  stats: TransferStatsData;
}

export default function TransferStats({stats}: Props) {
  const cards = [
    {
      label: "Transferências realizadas",
      value: stats.total,
      description: "Operações da sua organização",
      icon: ArrowLeftRight,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Aguardando confirmação",
      value: stats.pending,
      description: "Aguardando recebimento pelo destino",
      icon: Clock3,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Confirmadas",
      value: stats.confirmed,
      description: "Custódia transferida ao destino",
      icon: Truck,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Com ocorrência",
      value: stats.withIssue,
      description: "Operações recusadas com justificativa",
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>

                <h3 className="mt-3 text-2xl font-bold text-slate-900">
                  {card.value}
                </h3>
              </div>

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}
              >
                <Icon size={21} />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}