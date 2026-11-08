import { CalendarDays, Filter, RotateCcw } from "lucide-react";
import type { ReportFilters } from "./reports.types";
import { organizations, categories } from "./reports.data";

interface ReportsFiltersProps {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

const selectClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-2 block text-xs font-semibold text-slate-600";

export default function ReportsFilters({
  filters,
  onChange,
  onApply,
  onReset,
}: ReportsFiltersProps) {
  function updateFilter<K extends keyof ReportFilters>(
    key: K,
    value: ReportFilters[K]
  ) {
    onChange({
      ...filters,
      [key]: value,
    });
  }

  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={17} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-800">
            Filtros de relatórios
          </h3>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-blue-600"
        >
          <RotateCcw size={13} />
          Limpar filtros
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Período */}
        <div>
          <label className={labelClass}>Período</label>

          <select
            value={filters.period}
            onChange={(e) =>
              updateFilter(
                "period",
                e.target.value as ReportFilters["period"]
              )
            }
            className={selectClass}
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="year">Este ano</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        {/* Organização */}
        <div>
          <label className={labelClass}>Organização</label>

          <select
            value={filters.organization}
            onChange={(e) =>
              updateFilter("organization", e.target.value)
            }
            className={selectClass}
          >
            <option value="all">Todas as organizações</option>

            {organizations.map((organization) => (
              <option key={organization} value={organization}>
                {organization}
              </option>
            ))}
          </select>
        </div>

        {/* Categoria */}
        <div>
          <label className={labelClass}>Categoria</label>

          <select
            value={filters.category}
            onChange={(e) =>
              updateFilter("category", e.target.value)
            }
            className={selectClass}
          >
            <option value="all">Todas as categorias</option>

            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Aplicar */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={onApply}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Filter size={15} />
            Aplicar filtros
          </button>
        </div>
      </div>

      {/* Datas personalizadas */}
      {filters.period === "custom" && (
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Data inicial</label>

            <div className="relative">
              <CalendarDays
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  updateFilter("startDate", e.target.value)
                }
                className={`${selectClass} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Data final</label>

            <div className="relative">
              <CalendarDays
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="date"
                value={filters.endDate}
                min={filters.startDate || undefined}
                onChange={(e) =>
                  updateFilter("endDate", e.target.value)
                }
                className={`${selectClass} pl-9`}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}