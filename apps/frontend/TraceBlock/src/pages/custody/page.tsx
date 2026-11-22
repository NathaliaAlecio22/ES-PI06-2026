import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Link2 } from "lucide-react";

import CustodyLotSelector from "../../components/custody/CustodySelector";
import CustodyProgress from "../../components/custody/CustodyProgress";
import CustodyTimeline from "../../components/custody/CustodyTimeline";
import WorkflowSetup from "../../components/custody/WorkflowSetup";

import type {
  CustodyLot,
  CustodyStep,
} from "../../components/custody/custody,types";
import {
  buscarCustodiaLote,
  listarLotesCustodia,
} from "../../services/custodia";

const stateLabels: Record<CustodyStep["state"], string> = {
  done: "Concluída",
  current: "Etapa atual",
  pending: "Pendente",
  issue: "Com ocorrência",
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function CustodyPage() {
  const [lots, setLots] = useState<CustodyLot[]>([]);
  const [lotsLoading, setLotsLoading] = useState(true);
  const [lotsError, setLotsError] = useState("");

  const [lot, setLot] = useState("");
  const [steps, setSteps] = useState<CustodyStep[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsError, setStepsError] = useState("");

  // Evita que a resposta de um lote antigo sobrescreva a do lote selecionado agora.
  const latestRequest = useRef(0);

  const loadSteps = useCallback((code: string) => {
    const requestId = ++latestRequest.current;
    const isCurrent = () => latestRequest.current === requestId;

    setStepsLoading(true);
    setStepsError("");

    buscarCustodiaLote(code)
      .then((result) => {
        if (isCurrent()) setSteps(result.steps);
      })
      .catch((error: unknown) => {
        if (isCurrent()) {
          setSteps([]);
          setStepsError(
            errorMessage(error, "Não foi possível carregar a cadeia de custódia."),
          );
        }
      })
      .finally(() => {
        if (isCurrent()) setStepsLoading(false);
      });
  }, []);

  useEffect(() => {
    let active = true;

    listarLotesCustodia()
      .then((list) => {
        if (!active) return;

        setLots(list);

        if (list.length > 0) {
          setLot(list[0].value);
          loadSteps(list[0].value);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLotsError(errorMessage(error, "Não foi possível carregar os lotes."));
        }
      })
      .finally(() => {
        if (active) setLotsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadSteps]);

  const handleLotChange = (code: string) => {
    setLot(code);
    loadSteps(code);
  };

  const selectedLot = lots.find((item) => item.value === lot) ?? lots[0];

  const exportHistory = () => {
    if (!selectedLot) return;

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
        selectedLot.value,
        selectedLot.product,
        step.org,
        step.stageName ?? step.role,
        step.person,
        step.location,
        step.date,
        step.type,
        step.hash ?? "",
        stateLabels[step.state],
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
    anchor.download = `cadeia-custodia-${selectedLot.value}.csv`;

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
          disabled={!selectedLot || steps.length === 0}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} />
          Exportar histórico
        </button>
      </header>

      {lotsError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {lotsError}
        </p>
      )}

      {lotsLoading && (
        <div className="h-[92px] animate-pulse rounded-xl border border-slate-200 bg-white" />
      )}

      <WorkflowSetup />

      {!lotsLoading && !lotsError && lots.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-500">
          Nenhum lote encontrado. Cadastre um produto com lote para iniciar o acompanhamento da cadeia de custódia.
        </div>
      )}

      {lots.length > 0 && (
        <>
          <CustodyLotSelector
            lots={lots}
            lot={lot}
            onLotChange={handleLotChange}
          />

          {stepsError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {stepsError}
            </p>
          )}

          {stepsLoading ? (
            <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ) : (
            <>
              <CustodyProgress steps={steps} />

              <CustodyTimeline steps={steps} />
            </>
          )}
        </>
      )}

      <p className="text-xs text-slate-400">
        A linha do tempo combina as etapas configuradas pelo administrador com as transferências realizadas. O hash é exibido quando a operação é registrada na blockchain.
      </p>
    </div>
  );
}
