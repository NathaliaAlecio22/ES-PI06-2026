import {
  Blocks,
  ArrowLeftRight,
  Clock3,
  ShieldCheck,
} from "lucide-react";

import type { BlockchainStatsData } from "./blockchain.types";

interface BlockchainStatsProps {
  stats: BlockchainStatsData;
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

function formatLastBlock(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const seconds = Math.floor(
    (Date.now() - date.getTime()) / 1000
  );

  if (seconds < 60) {
    return `${seconds}s`;
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}min`;
  }

  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h`;
  }

  return `${Math.floor(seconds / 86400)}d`;
}

export default function BlockchainStats({
  stats,
}: BlockchainStatsProps) {
  const items = [
    {
      label: "Total de blocos",
      value: formatNumber(stats.totalBlocks),
      icon: Blocks,
    },
    {
      label: "Total de transações",
      value: formatNumber(stats.totalTransactions),
      icon: ArrowLeftRight,
    },
    {
      label: "Último bloco registrado",
      value: formatLastBlock(stats.lastBlockTime),
      icon: Clock3,
    },
    {
      label: "Status da rede",
      value: stats.networkStatus,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        const isNetwork = item.label === "Status da rede";

        const isOperational =
          stats.networkStatus === "Operacional";

        return (
          <div
            key={item.label}
            className="relative flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Icon size={19} strokeWidth={1.8} />
            </div>

            <div className="flex min-w-0 flex-col">
              <strong
                className={`text-[15px] font-bold ${
                  isNetwork && isOperational
                    ? "text-emerald-600"
                    : "text-[#0b1730]"
                }`}
              >
                {item.value}
              </strong>

              <span className="mt-1 text-[10px] text-slate-500">
                {item.label}
              </span>
            </div>

            {isNetwork && (
              <span
                className={`absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${
                  isOperational
                    ? "bg-green-500 shadow-[0_0_0_3px_#dcfce7]"
                    : "bg-amber-500"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}