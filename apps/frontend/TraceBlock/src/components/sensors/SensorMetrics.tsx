import {
  Thermometer,
  Droplets,
  Radio,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

interface Props {
  temperature: number;
  humidity: number;
  recordsCount: number;
  alertsCount: number;
}

const metrics = [
  {
    key: "temperature",
    label: "Temperatura atual",
    icon: Thermometer,
    color: "orange",
    suffix: "°C",
  },
  {
    key: "humidity",
    label: "Umidade atual",
    icon: Droplets,
    color: "cyan",
    suffix: "%",
  },
  {
    key: "records",
    label: "Registros coletados",
    icon: Radio,
    color: "blue",
    suffix: "",
  },
  {
    key: "alerts",
    label: "Alertas identificados",
    icon: AlertTriangle,
    color: "red",
    suffix: "",
  },
] as const;

export default function SensorMetrics({
  temperature,
  humidity,
  recordsCount,
  alertsCount,
}: Props) {
  const values = {
    temperature,
    humidity,
    records: recordsCount,
    alerts: alertsCount,
  };

  const colors = {
    orange: "bg-orange-50 text-orange-600",
    cyan: "bg-cyan-50 text-cyan-600",
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const value = values[metric.key];

        const isAlert = metric.key === "alerts";
        const isOutside =
          metric.key === "temperature" &&
          (temperature < 15 || temperature > 24);

        const warning = isAlert
          ? alertsCount > 0
          : isOutside;

        return (
          <div
            key={metric.key}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  colors[metric.color]
                }`}
              >
                <Icon size={21} />
              </div>

              {warning && (
                <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600">
                  <ArrowUpRight size={13} />
                  Atenção
                </span>
              )}

              {!warning && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600">
                  <ArrowDownRight size={13} />
                  Normal
                </span>
              )}
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">
                {metric.label}
              </p>

              <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {value.toLocaleString("pt-BR")}
                {metric.suffix}
              </h3>

              <p className="mt-2 text-xs text-slate-400">
                {metric.key === "temperature" && "Faixa de referência: 15 °C – 24 °C"}
                {metric.key === "humidity" && "Umidade monitorada"}
                {metric.key === "records" && "Leituras registradas no período"}
                {metric.key === "alerts" && "Requerem análise"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}