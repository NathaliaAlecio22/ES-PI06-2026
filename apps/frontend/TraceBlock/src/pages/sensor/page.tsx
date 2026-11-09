import { useMemo, useState } from "react";
import { Activity } from "lucide-react";

import SensorFilters from "../../components/sensors/SensorFilters";
import SensorMetrics from "../../components/sensors/SensorMetrics";
import SensorCharts from "../../components/sensors/SensorCharts";
import SensorAlerts from "../../components/sensors/SensorAlerts";
import SensorRecords from "../../components/sensors/SensorRecords";

import { sensorRecords } from "../../components/sensors/sensors.data";

export default function SensorsPage() {
  const [selectedLot, setSelectedLot] = useState("LOTE-2026-001");
  const [period, setPeriod] = useState("24h");

  const filteredRecords = useMemo(() => {
    let records = sensorRecords;

    if (selectedLot !== "all") {
      records = records.filter((record) => record.lot === selectedLot);
    }

    if (period === "24h") {
      records = records.filter((record) => record.date === "18/03/2026");
    }

    return records;
  }, [selectedLot, period]);

  const latestRecord = filteredRecords[0];

  const temperature = latestRecord?.temperature ?? 0;
  const humidity = latestRecord?.humidity ?? 0;

  const alertsCount = filteredRecords.filter(
    (record) => record.temperature > 24 || record.humidity > 70
  ).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Condições e sensores
            </h1>

            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Monitoramento ativo
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Monitore as condições ambientais registradas durante a cadeia de
            custódia.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <SensorFilters
        selectedLot={selectedLot}
        setSelectedLot={setSelectedLot}
        period={period}
        setPeriod={setPeriod}
      />

      {/* Indicadores */}
      <SensorMetrics
        temperature={temperature}
        humidity={humidity}
        recordsCount={filteredRecords.length}
        alertsCount={alertsCount}
      />

      {/* Gráficos e alertas */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <SensorCharts />
        <SensorAlerts />
      </div>

      {/* Tabela */}
      <SensorRecords records={filteredRecords} />

      {/* Rodapé informativo */}
      <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3">
        <Activity size={16} className="shrink-0 text-blue-600" />

        <p className="text-xs leading-relaxed text-blue-800">
          Os registros ambientais são utilizados para acompanhar a integridade
          dos produtos durante o transporte e armazenamento. Valores fora dos
          limites configurados devem ser analisados pelo responsável.
        </p>
      </div>
    </div>
  );
}