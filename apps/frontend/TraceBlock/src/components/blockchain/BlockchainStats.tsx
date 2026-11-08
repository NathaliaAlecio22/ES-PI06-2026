import {
  Blocks,
  ArrowLeftRight,
  Clock3,
  ShieldCheck,
} from "lucide-react";

const stats = [
  {
    label: "Total de blocos",
    value: "894.215",
    icon: Blocks,
  },
  {
    label: "Total de transações",
    value: "24.891",
    icon: ArrowLeftRight,
  },
  {
    label: "Último bloco registrado",
    value: "18s",
    icon: Clock3,
  },
  {
    label: "Status da rede",
    value: "Operacional",
    icon: ShieldCheck,
  },
];

export default function BlockchainStats() {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="relative flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Icon size={19} strokeWidth={1.8} />
            </div>

            <div className="flex min-w-0 flex-col">
              <strong className="text-[15px] font-bold text-[#0b1730]">
                {stat.value}
              </strong>

              <span className="mt-1 text-[10px] text-slate-500">
                {stat.label}
              </span>
            </div>

            {stat.label === "Status da rede" && (
              <span className="absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-green-500 shadow-[0_0_0_3px_#dcfce7]" />
            )}
          </div>
        );
      })}
    </div>
  );
}