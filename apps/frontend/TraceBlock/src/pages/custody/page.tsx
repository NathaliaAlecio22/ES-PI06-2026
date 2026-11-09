import { useMemo, useState } from "react";
import { Download, Link2 } from "lucide-react";

import CustodyLotSelector from "../../components/custody/CustodySelector";
import CustodyProgress from "../../components/custody/CustodyProgress";
import CustodyTimeline from "../../components/custody/CustodyTimeline";

import { custodyByLot, custodyLots } from "../../components/custody/custody.data";
import type { CustodyStep } from "../../components/custody/custody,types";

export default function CustodyPage() {
  const [lot, setLot] = useState("LT-2025-0482");

  const selectedLot =
    custodyLots.find((item) => item.value === lot) ?? custodyLots[0];

  const steps = useMemo<CustodyStep[]>(
    () => custodyByLot[lot] ?? [],
    [lot]
  );

  const exportHistory = () => {
    const rows = [
      [
        "Lote",
        "Produto",
        "Organização",
        "Etapa",
        "Responsável",
        "Localização",
        "Data",
        "Operação",
        "Hash",
        "Status",
      ],

      ...steps.map((step) => [
        lot,
        selectedLot.product,
        step.org,
        step.role,
        step.person,
        step.location,
        step.date,
        step.type,
        step.hash,
        step.state === "done"
          ? "Concluída"
          : step.state === "current"
            ? "Etapa atual"
            : "Pendente",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replaceAll('"', '""')}"`
          )
          .join(";")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `cadeia-custodia-${lot}.csv`;

    anchor.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">
            <Link2 size={15} />
            Rastreabilidade
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cadeia de custódia
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Visualize cada etapa, responsável e registro do ciclo de vida do lote.
          </p>
        </div>

        <button
          type="button"
          onClick={exportHistory}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Download size={16} />
          Exportar histórico
        </button>
      </header>

      <CustodyLotSelector
        lot={lot}
        onLotChange={setLot}
      />

      <CustodyProgress steps={steps} />

      <CustodyTimeline steps={steps} />

      <p className="text-xs text-slate-400">
        Os registros exibidos são dados demonstrativos do protótipo TraceBlock.
      </p>
    </div>
  );
}