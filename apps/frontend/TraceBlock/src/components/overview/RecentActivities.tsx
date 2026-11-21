import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeftRight } from "lucide-react";

import { listarTransferencias } from "../../services/transferencias";
import type { Transfer } from "../transfers/tranfers.type";

type ActivityStatus = "Confirmada" | "Pendente";


function StatusBadge({status}: {status: ActivityStatus}) {
  const styles =
    status === "Confirmada"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}

function formatActivityDate(date: string, time?: string) {
  if (!date) return "—";

  let parsedDate: Date;

  if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
    parsedDate = new Date(date);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [day, month, year] = date.split("/").map(Number);
    parsedDate = new Date(year, month - 1, day);
  } else {
    return `${date} ${time ?? ""}`.trim();
  }

  if (Number.isNaN(parsedDate.getTime())) return date;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday =
    parsedDate.getDate() === today.getDate() &&
    parsedDate.getMonth() === today.getMonth() &&
    parsedDate.getFullYear() === today.getFullYear();

  const isYesterday =
    parsedDate.getDate() === yesterday.getDate() &&
    parsedDate.getMonth() === yesterday.getMonth() &&
    parsedDate.getFullYear() === yesterday.getFullYear();

  const formattedTime = time || "";

  if (isToday) return `Hoje, ${formattedTime}`.replace(/,\s*$/, "");
  if (isYesterday) return `Ontem, ${formattedTime}`.replace(/,\s*$/, "");

  return `${parsedDate.toLocaleDateString("pt-BR")} ${formattedTime}`.trim();
}


export default function RecentActivities() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadActivities() {
      try {
        const data = await listarTransferencias();

        if (!cancelled) {
          setTransfers(data);
          setError(false);
        }
      } catch (err) {
        console.error("Erro ao carregar atividades recentes:", err);

        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadActivities();

    return () => {
      cancelled = true;
    };
  }, []);

  const recentTransfers = [...transfers].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time || ""}`).getTime();
    const dateB = new Date(`${b.date} ${b.time || ""}`).getTime();

    return dateB - dateA;
  })
  .slice(0, 5);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Atividades recentes
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Últimas movimentações registradas na plataforma
          </p>
        </div>

        <button className="flex shrink-0 items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
          Ver todas
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[750px] text-left">
          <thead className="bg-slate-50">
            <tr className="text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Lote</th>
              <th className="px-5 py-3">Produto</th>
              <th className="px-5 py-3">Atividade</th>
              <th className="px-5 py-3">Responsável</th>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                  Carregando movimentações...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-red-500">
                  Não foi possível carregar as movimentações.
                </td>
              </tr>
            ) : recentTransfers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                  Nenhuma movimentação registrada.
                </td>
              </tr>
            ) : (
              recentTransfers.map((transfer) => (
                <tr
                  key={transfer.rawId}
                  className="text-sm transition-colors hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-medium text-blue-600">
                    {transfer.lot}
                  </td>

                  <td className="px-5 py-4 font-medium text-slate-800">
                    {transfer.product}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <ArrowLeftRight size={15} className="text-violet-500" />
                      Transferência
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {transfer.newOwner || "—"}
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {formatActivityDate(transfer.date, transfer.time)}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge
                      status={
                        transfer.status === "Confirmada"
                          ? "Confirmada"
                          : "Pendente"
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}