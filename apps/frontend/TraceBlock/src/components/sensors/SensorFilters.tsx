import { CalendarDays, FilterIcon } from "lucide-react";
import { sensorLots } from "./sensors.data";

interface Props {
  selectedLot: string;
  setSelectedLot: (value: string) => void;
  period: string;
  setPeriod: (value: string) => void;
}

export default function SensorFilters({
  selectedLot,
  setSelectedLot,
  period,
  setPeriod,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-500">
          Produto / lote
        </label>

        <select
          value={selectedLot}
          onChange={(e) => setSelectedLot(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {sensorLots.map((lot) => (
            <option key={lot.value} value={lot.value}>
              {lot.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-500">
          Período
        </label>

        <div className="relative">
          <CalendarDays
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="24h">Últimas 24 horas</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
        </div>
      </div>

      <div className="flex items-end">
        <button type="button" onClick={() => {}}  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto">
            <FilterIcon size={16} />

            Aplicar filtros
        </button>
      </div>
    </div>
  );
}