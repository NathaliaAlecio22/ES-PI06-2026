import { useMemo, useState } from "react";
import { Download, FileBarChart } from "lucide-react";

import ReportsFilters from "../../components/reports/ReportsFilters";
import ReportMetrics from "../../components/reports/ReportMetrics";
import ReportCharts from "../../components/reports/ReportCharts"
import ReportOrganizationTable from "../../components/reports/ReportOrganizationTable";

import { reportRecords } from "../../components/reports/reports.data";
import type { ReportFilters } from "../../components/reports/reports.types";

const initialFilters: ReportFilters = {
  period: "30",
  organization: "all",
  category: "all",
  startDate: "",
  endDate: "",
};

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);

  const [appliedFilters, setAppliedFilters] =
    useState<ReportFilters>(initialFilters);

  const filteredRecords = useMemo(() => {
    const latestDate = new Date(
      `${reportRecords.reduce(
        (latest, item) =>
          item.date > latest ? item.date : latest,
        reportRecords[0].date
      )}T12:00:00`
    );

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (appliedFilters.period === "custom") {
      startDate = appliedFilters.startDate
        ? new Date(`${appliedFilters.startDate}T00:00:00`)
        : null;

      endDate = appliedFilters.endDate
        ? new Date(`${appliedFilters.endDate}T23:59:59`)
        : null;
    } else if (appliedFilters.period === "year") {
      startDate = new Date(latestDate.getFullYear(), 0, 1);
      endDate = new Date(
        latestDate.getFullYear(),
        11,
        31,
        23,
        59,
        59
      );
    } else {
      const days = Number(appliedFilters.period);

      endDate = new Date(latestDate);
      endDate.setHours(23, 59, 59, 999);

      startDate = new Date(latestDate);
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);
    }

    return reportRecords.filter((record) => {
      const recordDate = new Date(`${record.date}T12:00:00`);

      const matchesDate =
        (!startDate || recordDate >= startDate) &&
        (!endDate || recordDate <= endDate);

      const matchesOrganization =
        appliedFilters.organization === "all" ||
        record.organization === appliedFilters.organization;

      const matchesCategory =
        appliedFilters.category === "all" ||
        record.category === appliedFilters.category;

      return (
        matchesDate &&
        matchesOrganization &&
        matchesCategory
      );
    });
  }, [appliedFilters]);

  function handleApplyFilters() {
    if (
      filters.period === "custom" &&
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      window.alert("A data inicial não pode ser posterior à data final.");
      return;
    }

    setAppliedFilters({ ...filters });
  }

  function handleResetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  function handleExport() {
    if (filteredRecords.length === 0) {
      window.alert("Não existem dados para exportar.");
      return;
    }

    const headers = [
      "ID",
      "Organização",
      "Tipo",
      "Categoria",
      "Data",
      "Movimentações",
      "Tempo médio em trânsito",
      "Conformidade",
      "Alertas",
    ];

    const rows = filteredRecords.map((item) => [
      item.id,
      item.organization,
      item.type,
      item.category,
      item.date,
      item.movements,
      item.transitDays,
      `${item.compliance}%`,
      item.alerts,
    ]);

    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF" + csvContent],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "relatorio-traceblock.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <FileBarChart size={19} className="text-blue-600" />

            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Análise e desempenho
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Relatórios
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Analise a performance, conformidade e rastreabilidade da operação.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Download size={16} />
          Exportar relatório
        </button>
      </header>

      {/* Filtros */}
      <ReportsFilters
        filters={filters}
        onChange={setFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* Indicadores */}
      <ReportMetrics records={filteredRecords} />

      {/* Gráficos */}
      <ReportCharts records={filteredRecords} />

      {/* Tabela */}
      <ReportOrganizationTable records={filteredRecords} />
    </div>
  );
}