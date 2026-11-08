import {
  Users,
  ShieldCheck,
  Clock3,
  PackageOpen,
} from "lucide-react";

const stats = [
  {
    label: "Organizações ativas",
    value: "32",
    icon: Users,
    color: "text-blue-600",
    background: "bg-blue-50",
  },
  {
    label: "Participantes autorizados",
    value: "28",
    icon: ShieldCheck,
    color: "text-green-600",
    background: "bg-green-50",
  },
  {
    label: "Aguardando validação",
    value: "4",
    icon: Clock3,
    color: "text-amber-600",
    background: "bg-amber-50",
  },
  {
    label: "Lotes sob custódia",
    value: "85",
    icon: PackageOpen,
    color: "text-purple-600",
    background: "bg-purple-50",
  },
];

export default function ParticipantStats() {
  return (
    <section className="mb-4 grid grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className={`flex items-center gap-3.5 px-5 py-4 ${
              index !== stats.length - 1
                ? "border-b border-slate-200 xl:border-b-0 xl:border-r"
                : ""
            } ${
              index === 1
                ? "sm:border-r xl:border-r"
                : ""
            }`}
          >
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${stat.background} ${stat.color}`}
            >
              <Icon size={19} />
            </div>

            <div className="min-w-0">
              <strong className="block text-xl font-bold leading-none tracking-tight text-[#0b1730]">
                {stat.value}
              </strong>

              <span className="mt-1.5 block text-xs text-slate-500">
                {stat.label}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}