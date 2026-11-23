import { Building2, Users } from "lucide-react";

import type { Participant } from "./participantes.types";

const statusLabels: Record<Participant["status"], string> = {
  ACTIVE: "Ativa",
  PENDING: "Convite pendente",
  INACTIVE: "Inativa",
};

const statusStyles: Record<Participant["status"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  INACTIVE: "bg-slate-100 text-slate-500",
};

export default function ParticipantesLista({
  participants,
}: {
  participants: Participant[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left">
        <thead className="border-b border-slate-100 bg-slate-50">
          <tr>
            {["Organização", "Tipo", "CNPJ", "Responsável", "E-mail", "Lotes", "Status"].map(
              (heading) => (
                <th
                  key={heading}
                  className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {participants.map((participant) => (
            <tr key={participant.id} className="hover:bg-slate-50/70">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                    <Building2 size={17} />
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {participant.name}
                  </span>
                </div>
              </td>
              <td className="px-5 py-4 text-xs text-slate-600">
                {participant.type === "Varejista" ? "Venda" : participant.type}
              </td>
              <td className="px-5 py-4 font-mono text-[11px] text-slate-500">
                {participant.cnpj || "Não informado"}
              </td>
              <td className="px-5 py-4 text-xs text-slate-600">{participant.person}</td>
              <td className="px-5 py-4 text-xs text-slate-500">{participant.email}</td>
              <td className="px-5 py-4 text-xs font-semibold text-slate-700">{participant.lots}</td>
              <td className="px-5 py-4">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[participant.status]}`}>
                  {statusLabels[participant.status]}
                </span>
              </td>
            </tr>
          ))}
          {participants.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-14 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <Users size={22} />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Nenhuma organização encontrada
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Cadastre uma organização para enviar o convite ao responsável.
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
