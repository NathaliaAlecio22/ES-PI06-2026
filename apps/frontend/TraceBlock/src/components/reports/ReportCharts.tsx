import type { ReportRecord } from "./reports.types";

interface ReportChartsProps {
  records: ReportRecord[];
}

export default function ReportCharts({
  records,
}: ReportChartsProps) {
  const monthNames = [
    "Jan", "Fev", "Mar", "Abr",
    "Mai", "Jun", "Jul", "Ago",
    "Set", "Out", "Nov", "Dez",
  ];

  const monthlyData = monthNames.map((month, index) => {
    const monthRecords = records.filter(
      (record) => new Date(`${record.date}T12:00:00`).getMonth() === index
    );

    return {
      month,
      value: monthRecords.reduce(
        (total, record) => total + record.movements,
        0
      ),
    };
  });

  const visibleMonths = monthlyData.filter((item) => item.value > 0);

  const maxMovements = Math.max(
    ...visibleMonths.map((item) => item.value),
    1
  );

  const categoryData = Array.from(
    new Set(records.map((record) => record.category))
  ).map((category) => {
    const categoryRecords = records.filter(
      (record) => record.category === category
    );

    const compliance =
      categoryRecords.reduce(
        (total, record) => total + record.compliance,
        0
      ) / categoryRecords.length;

    return {
      category,
      compliance,
    };
  });

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
      {/* Performance operacional */}
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-semibold text-slate-800">
            Performance operacional
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Movimentações registradas por mês
          </p>
        </div>

        {visibleMonths.length > 0 ? (
          <div className="flex h-56 items-end gap-3 overflow-x-auto border-b border-slate-100 px-2 pb-3">
            {visibleMonths.map((item) => (
              <div
                key={item.month}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-[11px] font-medium text-slate-500">
                  {item.value}
                </span>

                <div
                  className="w-full max-w-10 rounded-t-md bg-blue-500 transition-all hover:bg-blue-600"
                  style={{
                    height: `${Math.max(
                      (item.value / maxMovements) * 150,
                      5
                    )}px`,
                  }}
                  title={`${item.value} movimentações`}
                />

                <span className="text-xs text-slate-400">
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-56 items-center justify-center text-sm text-slate-400">
            Não existem movimentações para os filtros selecionados.
          </div>
        )}
      </article>

      {/* Conformidade por categoria */}
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-semibold text-slate-800">
            Conformidade por categoria
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Índice médio de registros válidos
          </p>
        </div>

        <div className="space-y-6">
          {categoryData.length > 0 ? (
            categoryData.map((item) => (
              <div key={item.category}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700">
                    {item.category}
                  </span>

                  <span className="text-sm font-semibold text-slate-600">
                    {item.compliance.toFixed(1).replace(".", ",")}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${Math.min(item.compliance, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">
              Nenhuma categoria encontrada.
            </p>
          )}
        </div>
      </article>
    </section>
  );
}