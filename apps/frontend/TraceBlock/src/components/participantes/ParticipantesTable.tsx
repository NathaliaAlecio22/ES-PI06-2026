import { MoreHorizontal, Users } from "lucide-react";
import type { Participant } from "./participantes.types";

interface ParticipantsTableProps {
  participants: Participant[];
  onSelect: (participant: Participant) => void;
}

function StatusBadge({ status }: { status: Participant["status"] }) {
  const styles = {
    Autorizado:
      "border-green-100 bg-green-50 text-green-700",
    "Aguardando validação":
      "border-amber-100 bg-amber-50 text-amber-700",
    Suspenso:
      "border-red-100 bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export default function ParticipantsTable({
  participants,
  onSelect,
}: ParticipantsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse text-left">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50">
              {[
                "Organização",
                "Tipo",
                "CNPJ",
                "Responsável",
                "E-mail",
                "Lotes",
                "Status",
                "",
              ].map((heading, index) => (
                <th
                  key={`${heading}-${index}`}
                  className="h-11 whitespace-nowrap px-4 text-[10px] font-bold uppercase tracking-wide text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {participants.map((participant) => (
              <tr
                key={participant.id}
                className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/80"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-blue-100 bg-blue-50 text-[10px] font-bold text-blue-700">
                      {participant.initials}
                    </div>

                    <strong className="text-xs font-semibold text-slate-800">
                      {participant.name}
                    </strong>
                  </div>
                </td>

                <td className="px-4 py-3 text-xs text-slate-600">
                  {participant.type}
                </td>

                <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-500">
                  {participant.cnpj}
                </td>

                <td className="px-4 py-3 text-xs text-slate-700">
                  {participant.person}
                </td>

                <td className="px-4 py-3 text-xs text-slate-500">
                  {participant.email}
                </td>

                <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                  {participant.lots}
                </td>

                <td className="px-4 py-3">
                  <StatusBadge status={participant.status} />
                </td>

                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSelect(participant)}
                    title="Ver detalhes"
                    className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}

            {participants.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center">
                    <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                      <Users size={22} />
                    </div>

                    <strong className="text-sm font-semibold text-slate-700">
                      Nenhum participante encontrado
                    </strong>

                    <p className="mt-1 text-xs text-slate-500">
                      Tente alterar os filtros ou a pesquisa.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-slate-500">
          Exibindo {participants.length} participante(s)
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled
            className="h-7 rounded-md border border-slate-200 px-2.5 text-xs text-slate-400 disabled:cursor-not-allowed"
          >
            Anterior
          </button>

          <span className="grid h-7 min-w-7 place-items-center rounded-md border border-blue-600 bg-blue-600 px-2 text-xs font-semibold text-white">
            1
          </span>

          <button
            type="button"
            disabled
            className="h-7 rounded-md border border-slate-200 px-2.5 text-xs text-slate-400 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}