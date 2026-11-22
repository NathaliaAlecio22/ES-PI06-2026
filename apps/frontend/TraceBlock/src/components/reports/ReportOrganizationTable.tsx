import { Building2 } from "lucide-react";
import type { OrganizationReportData } from "./reports.types";
interface ReportOrganizationTableProps { organizations: OrganizationReportData[] }
export default function ReportOrganizationTable({ organizations }: ReportOrganizationTableProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-base font-semibold text-slate-800">Resumo por organização</h3><p className="mt-1 text-xs text-slate-500">Indicadores das organizações envolvidas no período</p></div><span className="text-xs font-medium text-slate-400">{organizations.length} organizações</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4 font-semibold">Organização</th><th className="px-5 py-4 font-semibold">Tipo</th><th className="px-5 py-4 font-semibold">Movimentações</th><th className="px-5 py-4 font-semibold">Tempo médio</th><th className="px-5 py-4 font-semibold">Confirmadas</th><th className="px-5 py-4 font-semibold">Ocorrências</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{organizations.length ? organizations.map((item) => <tr key={item.id} className="transition hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Building2 size={17}/></span><span className="font-semibold text-slate-700">{item.organization}</span></div></td><td className="px-5 py-4 text-slate-500">{item.type}</td><td className="px-5 py-4 font-medium text-slate-700">{item.movements.toLocaleString("pt-BR")}</td><td className="px-5 py-4 text-slate-600">{item.averageTransitDays.toFixed(1).replace(".", ",")} dias</td><td className="px-5 py-4"><span className="font-semibold text-emerald-600">{item.confirmationRate.toFixed(1).replace(".", ",")}%</span></td><td className="px-5 py-4">{item.occurrences ? <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">{item.occurrences}</span> : <span className="text-slate-400">—</span>}</td></tr>) : <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">Nenhuma organização encontrada no período.</td></tr>}</tbody>
      </table></div>
    </article>
  );
}
