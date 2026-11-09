import {
  ArrowRight,
  MoreHorizontal,
  Package,
  Hash,
} from "lucide-react";

import type { Transfer } from "./tranfers.type";

interface Props {
  transfers: Transfer[];
  onView: (transfer: Transfer) => void;
}

function StorageStatusBadge({
  status,
}: {
  status: Transfer["storageStatus"];
}) {
  const styles = {
    "Em transporte": "bg-blue-50 text-blue-700 border-blue-200",
    Armazenado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const dots = {
    "Em transporte": "bg-blue-500",
    Armazenado: "bg-emerald-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {status}
    </span>
  );
}

function TransferStatus({ status }: { status: Transfer["status"] }) {
  const styles = {
    Confirmada: "bg-green-50 text-green-700 border-green-200",
    "Em andamento": "bg-blue-50 text-blue-700 border-blue-200",
    "Aguardando confirmação": "bg-amber-50 text-amber-700 border-amber-200",
    "Com ocorrência": "bg-red-50 text-red-700 border-red-200",
  };

  const dots = {
    Confirmada: "bg-green-500",
    "Em andamento": "bg-blue-500",
    "Aguardando confirmação": "bg-amber-500",
    "Com ocorrência": "bg-red-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {status}
    </span>
  );
}

export default function TransferTable({ transfers, onView }: Props) {
  if (transfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Package size={25} />
        </div>

        <h3 className="font-semibold text-slate-800">
          Nenhuma transferência encontrada
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Tente alterar os filtros ou realizar uma nova pesquisa.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] border-collapse text-left">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50">
            {[
              "Identificação",
              "Produto / lote",
              "Responsável anterior",
              "Novo responsável",
              "Data e horário",
              "Status",
              "Armazenamento",
              "Hash",
              "",
            ].map((heading) => (
              <th
                key={heading}
                className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {transfers.map((transfer) => (
            <tr
              key={transfer.id}
              className="border-b border-slate-100 transition hover:bg-slate-50/70"
            >
              <td className="px-5 py-4">
                <button
                  onClick={() => onView(transfer)}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                >
                  {transfer.id}
                </button>
              </td>

              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Package size={17} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {transfer.product}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {transfer.lot}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-5 py-4 text-sm text-slate-600">
                {transfer.previousOwner}
              </td>

              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <ArrowRight size={14} className="shrink-0 text-slate-400" />

                  <span className="text-sm font-medium text-slate-700">
                    {transfer.newOwner}
                  </span>
                </div>
              </td>

              <td className="px-5 py-4">
                <p className="text-sm text-slate-700">{transfer.date}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {transfer.time}
                </p>
              </td>

              <td className="px-5 py-4">
                <TransferStatus status={transfer.status} />
              </td>

              <td className="px-5 py-4">
                <StorageStatusBadge status={transfer.storageStatus} />
                </td>

              <td className="px-5 py-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Hash size={13} />
                  <span className="font-mono">{transfer.hash}</span>
                </div>
              </td>

              <td className="px-5 py-4">
                <button
                  onClick={() => onView(transfer)}
                  title="Visualizar transferência"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  <MoreHorizontal size={19} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}