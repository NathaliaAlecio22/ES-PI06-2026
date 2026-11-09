import { AlertTriangle, Droplets, MapPin, Clock3 } from "lucide-react";
import { sensorAlerts } from "./sensors.data";

export default function SensorAlerts() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Alertas recentes
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Ocorrências identificadas pelos sensores
          </p>
        </div>

        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-red-50 px-2 text-xs font-bold text-red-600">
          {sensorAlerts.length}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {sensorAlerts.map((alert) => {
          const high = alert.severity === "high";

          return (
            <div
              key={alert.id}
              className={`rounded-lg border p-4 ${
                high
                  ? "border-red-100 bg-red-50/60"
                  : "border-amber-100 bg-amber-50/60"
              }`}
            >
              <div className="flex gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    high
                      ? "bg-red-100 text-red-600"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {high ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <Droplets size={18} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">
                      {alert.title}
                    </h3>

                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        high
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {high ? "Crítico" : "Atenção"}
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {alert.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock3 size={12} />
                      {alert.date}
                    </span>

                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {alert.location}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}