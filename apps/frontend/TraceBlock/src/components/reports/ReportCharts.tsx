import type { MonthlyReportData, CategoryReportData } from "./reports.types";
interface ReportChartsProps { monthly: MonthlyReportData[]; categories: CategoryReportData[] }
export default function ReportCharts({ monthly, categories }: ReportChartsProps) {
  const max = Math.max(...monthly.map((item) => item.movements), 1);
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-6"><h3 className="text-base font-semibold text-slate-800">Performance operacional</h3><p className="mt-1 text-xs text-slate-500">Transferências por mês</p></div>
        {monthly.length ? (
          <div className="flex h-56 items-end gap-3 overflow-x-auto border-b border-slate-100 px-2 pb-3">
            {monthly.map((item) => (
              <div key={item.month} className="flex h-full min-w-[42px] flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[11px] font-medium text-slate-500">{item.movements}</span>
                <div className="w-full max-w-10 rounded-t-md bg-blue-500 transition-all hover:bg-blue-600" style={{ height: `${Math.max((item.movements / max) * 150, 5)}px` }} title={`${item.movements} transferências`} />
                <span className="whitespace-nowrap text-xs text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>
        ) : <div className="flex h-56 items-center justify-center text-sm text-slate-400">Não existem movimentações no período.</div>}
      </article>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-6"><h3 className="text-base font-semibold text-slate-800">Taxa de confirmação por categoria</h3><p className="mt-1 text-xs text-slate-500">Transferências confirmadas em relação ao total</p></div>
        <div className="space-y-5">
          {categories.length ? categories.map((item) => (
            <div key={item.category}><div className="mb-2 flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-700">{item.category}</span><span className="text-sm font-semibold text-slate-600">{item.confirmationRate.toFixed(1).replace(".", ",")}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(item.confirmationRate, 100)}%` }}/></div><p className="mt-1 text-xs text-slate-400">{item.total} transferências · {item.occurrences} ocorrências</p></div>
          )) : <p className="py-10 text-center text-sm text-slate-400">Nenhuma categoria encontrada.</p>}
        </div>
      </article>
    </section>
  );
}
