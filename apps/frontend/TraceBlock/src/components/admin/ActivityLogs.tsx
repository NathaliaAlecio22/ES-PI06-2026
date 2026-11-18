import { Activity, Clock3, UserRound } from "lucide-react";

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  date: string;
  description: string;
}

interface Props {
  activities: ActivityLog[];
}

export default function ActivityLogs({ activities }: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="font-bold text-slate-900">Histórico de atividades</h3>
        <p className="mt-1 text-sm text-slate-500">
          Acompanhe as ações realizadas na plataforma.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {activities.map((item) => (
          <article key={item.id} className="flex gap-4 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
              <Activity size={18} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">{item.action}</p>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>

              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <UserRound size={13} /> {item.user}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={13} /> {item.date}
                </span>
              </div>
            </div>
          </article>
        ))}

        {activities.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            Nenhuma atividade registrada.
          </p>
        )}
      </div>
    </section>
  );
}