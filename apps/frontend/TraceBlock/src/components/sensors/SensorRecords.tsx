import { FileSpreadsheet, Radio, FileText } from "lucide-react";
import type { SensorRecord } from "./sensors.type";

interface Props {
  records: SensorRecord[];
}

export default function SensorRecords({ records }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Registros ambientais
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Leituras de sensores e inserções manuais
          </p>
        </div>

        <button
          type="button"
          className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          onClick={() => {
            const header = [
              "Origem",
              "Produto",
              "Lote",
              "Temperatura",
              "Umidade",
              "Localização",
              "Data",
              "Horário",
              "Responsável",
            ];

            const rows = records.map((record) => [
              record.source,
              record.product,
              record.lot,
              `${record.temperature} °C`,
              `${record.humidity}%`,
              record.location,
              record.date,
              record.time,
              record.responsible,
            ]);

            const csv = [header, ...rows]
              .map((row) =>
                row
                  .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                  .join(";")
              )
              .join("\n");

            const blob = new Blob(["\uFEFF" + csv], {
              type: "text/csv;charset=utf-8;",
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = "registros-ambientais.csv";
            link.click();

            URL.revokeObjectURL(url);
          }}
        >
          <FileSpreadsheet size={15} />
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Origem",
                "Produto / lote",
                "Temperatura",
                "Umidade",
                "Localização",
                "Data e horário",
                "Responsável",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {records.map((record) => (
              <tr
                key={record.id}
                className="transition hover:bg-slate-50/80"
              >
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      record.source === "Sensor IoT"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {record.source === "Sensor IoT" ? (
                      <Radio size={13} />
                    ) : (
                      <FileText size={13} />
                    )}
                    {record.source}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <p className="text-sm font-semibold text-slate-800">
                    {record.product}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {record.lot}
                  </p>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`text-sm font-semibold ${
                      record.temperature > 24
                        ? "text-red-600"
                        : "text-slate-700"
                    }`}
                  >
                    {record.temperature.toLocaleString("pt-BR")} °C
                  </span>
                </td>

                <td className="px-5 py-4 text-sm font-medium text-slate-700">
                  {record.humidity}%
                </td>

                <td className="px-5 py-4 text-sm text-slate-500">
                  {record.location}
                </td>

                <td className="px-5 py-4 text-sm text-slate-500">
                  <p>{record.date}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {record.time}
                  </p>
                </td>

                <td className="px-5 py-4 text-sm text-slate-600">
                  {record.responsible}
                </td>
              </tr>
            ))}

            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <Radio className="mx-auto mb-3 text-slate-300" size={28} />
                  <p className="text-sm font-medium text-slate-600">
                    Nenhum registro encontrado
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Tente selecionar outro lote.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 px-5 py-3">
        <p className="text-xs text-slate-400">
          Exibindo {records.length} registros ambientais
        </p>
      </div>
    </section>
  );
}