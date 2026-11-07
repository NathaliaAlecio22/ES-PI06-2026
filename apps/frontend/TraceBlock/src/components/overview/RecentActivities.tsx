import { ArrowRight } from "lucide-react";

type Activity = {
  id: string;
  product: string;
  action: string;
  responsible: string;
  date: string;
  status: "Confirmada" | "Pendente";
};

const activities: Activity[] = [
  {
    id: "LT-0482",
    product: "Café Arábica Premium",
    action: "Transferência",
    responsible: "TransLog Brasil",
    date: "Hoje, 14:32",
    status: "Confirmada",
  },
  {
    id: "LT-0479",
    product: "Cacau Orgânico",
    action: "Armazenamento",
    responsible: "CD Guarulhos",
    date: "Hoje, 11:18",
    status: "Confirmada",
  },
  {
    id: "LT-0476",
    product: "Algodão Fibra Longa",
    action: "Entrega",
    responsible: "Têxtil Paulista",
    date: "Hoje, 09:45",
    status: "Confirmada",
  },
  {
    id: "LT-0471",
    product: "Óleo Essencial de Laranja",
    action: "Inspeção",
    responsible: "Ana Ribeiro",
    date: "Ontem, 17:06",
    status: "Pendente",
  },
];

function StatusBadge({ status }: { status: Activity["status"] }) {
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

export default function RecentActivities() {
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
            {activities.map((activity) => (
              <tr
                key={activity.id}
                className="text-sm transition-colors hover:bg-slate-50"
              >
                <td className="px-5 py-4 font-medium text-blue-600">
                  {activity.id}
                </td>

                <td className="px-5 py-4 font-medium text-slate-800">
                  {activity.product}
                </td>

                <td className="px-5 py-4 text-slate-600">
                  {activity.action}
                </td>

                <td className="px-5 py-4 text-slate-600">
                  {activity.responsible}
                </td>

                <td className="px-5 py-4 text-slate-500">
                  {activity.date}
                </td>

                <td className="px-5 py-4">
                  <StatusBadge status={activity.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}