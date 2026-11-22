import { useEffect, useState } from "react";
import { Download, FileBarChart, FileText, LoaderCircle } from "lucide-react";

import ReportsFilters from "../../components/reports/ReportsFilters";
import ReportMetrics from "../../components/reports/ReportMetrics";
import ReportCharts from "../../components/reports/ReportCharts";
import ReportOrganizationTable from "../../components/reports/ReportOrganizationTable";
import type { ReportData, ReportFilters } from "../../components/reports/reports.types";
import { getReportData } from "../../services/relatorios";


const initialFilters: ReportFilters = {
  period: "30",
  organizationId: "all",
  category: "all",
  startDate: "",
  endDate: "",
};
const ptDate = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
function csvSafe(value: unknown) {
  const raw = String(value ?? "");
  // Avoid spreadsheet formula injection in text fields.
  const protectedValue = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}
function downloadFile(content: Blob, filename: string) {
  const url = URL.createObjectURL(content);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function dateRangeLabel(filters: ReportFilters) {
  if (filters.period === "custom") return `${filters.startDate || "Desde o início"}${filters.endDate ? ` até ${filters.endDate}` : " até hoje"}`;
  if (filters.period === "year") return "Ano atual";
  return `Últimos ${filters.period} dias`;
}


export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(initialFilters);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  useEffect(() => {
    let active = true;
    getReportData(appliedFilters)
      .then((data) => { if (active) setReport(data); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Erro ao carregar relatórios."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appliedFilters]);


  function handleApplyFilters() {
    if (filters.period === "custom" && filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      window.alert("A data inicial não pode ser posterior à data final.");
      return;
    }
    setLoading(true);
    setError(null);
    setAppliedFilters({ ...filters });
  }
  function handleResetFilters() {
    setLoading(true);
    setError(null);
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  function handleRetry() {
    setLoading(true);
    setError(null);
    setAppliedFilters({ ...appliedFilters });
  }

  function exportCSV() {
    if (!report?.records.length) { window.alert("Não existem movimentações para exportar."); return; }
    setExporting("csv");
    const headers = ["ID movimentação", "Data", "Lote", "Produto", "Categoria", "Origem", "Destino", "Status", "Localização", "Quantidade", "Hash da transação", "Temperatura", "Umidade", "Tempo até confirmação (dias)"];
    const rows = report.records.map((record) => [
      record.id, ptDate(record.date), record.lotCode, record.productName, record.category,
      record.originName, record.destinationName, record.statusLabel, record.location,
      `${record.quantity} ${record.unit}`.trim(), record.txHash ?? "", record.temperature ?? "", record.humidity ?? "",
      record.transitDays === null ? "" : record.transitDays.toFixed(2).replace(".", ","),
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvSafe).join(";")).join("\r\n");
    downloadFile(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), `traceblock-relatorio-${new Date().toISOString().slice(0, 10)}.csv`);
    setExporting(null);
  }

  function exportPDF() {
    if (!report?.records.length) { window.alert("Não existem movimentações para exportar."); return; }
    setExporting("pdf");
    const escapeHtml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const organizationsRows = report.organizations.map((item) => `<tr><td>${escapeHtml(item.organization)}</td><td>${escapeHtml(item.type)}</td><td>${item.movements}</td><td>${item.averageTransitDays.toFixed(2)} dias</td><td>${item.confirmationRate.toFixed(1)}%</td><td>${item.occurrences}</td></tr>`).join("");
    const movementRows = report.records.map((item) => `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(ptDate(item.date))}</td><td>${escapeHtml(item.lotCode)}</td><td>${escapeHtml(item.productName)}</td><td>${escapeHtml(item.originName)}</td><td>${escapeHtml(item.destinationName)}</td><td>${escapeHtml(item.statusLabel)}</td><td>${escapeHtml(item.location)}</td></tr>`).join("");
    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) { window.alert("Permita pop-ups para gerar o relatório PDF."); setExporting(null); return; }
    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>TraceBlock - Relatório</title><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#172033;padding:28px}h1{font-size:22px;margin:0 0 6px}h2{font-size:15px;margin:26px 0 10px}p{color:#64748b;font-size:11px;margin:4px 0 18px}.metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:20px 0}.metric{border:1px solid #dbe3ef;border-radius:8px;padding:12px}.metric small{color:#64748b;display:block;margin-bottom:8px}.metric strong{font-size:18px}table{width:100%;border-collapse:collapse;font-size:9px;margin-top:8px}th,td{border:1px solid #dbe3ef;padding:7px;text-align:left;vertical-align:top}th{background:#f1f5f9;color:#475569}footer{margin-top:24px;color:#94a3b8;font-size:10px}@media print{body{padding:0}.metrics{break-inside:avoid}h2{break-after:avoid}table{page-break-inside:auto}tr{page-break-inside:avoid;page-break-after:auto}thead{display:table-header-group}}
      </style></head><body><h1>TraceBlock | Relatório de rastreabilidade</h1><p>Período: ${escapeHtml(dateRangeLabel(appliedFilters))} · Gerado em: ${escapeHtml(new Date().toLocaleString("pt-BR"))}</p>
      <div class="metrics"><div class="metric"><small>Movimentações</small><strong>${report.metrics.movements}</strong></div><div class="metric"><small>Confirmadas</small><strong>${report.metrics.confirmed}</strong></div><div class="metric"><small>Taxa de confirmação</small><strong>${report.metrics.confirmationRate.toFixed(1)}%</strong></div><div class="metric"><small>Tempo médio</small><strong>${report.metrics.averageTransitDays.toFixed(2)} dias</strong></div><div class="metric"><small>Ocorrências</small><strong>${report.metrics.occurrences}</strong></div></div>
      <h2>Resumo por organização</h2><table><thead><tr><th>Organização</th><th>Tipo</th><th>Movimentações</th><th>Tempo médio</th><th>Confirmação</th><th>Ocorrências</th></tr></thead><tbody>${organizationsRows || "<tr><td colspan='6'>Sem dados no período</td></tr>"}</tbody></table>
      <h2>Detalhamento das movimentações</h2><table><thead><tr><th>ID</th><th>Data</th><th>Lote</th><th>Produto</th><th>Origem</th><th>Destino</th><th>Status</th><th>Local</th></tr></thead><tbody>${movementRows || "<tr><td colspan='8'>Sem dados no período</td></tr>"}</tbody></table><footer>Relatório gerado pelo TraceBlock com dados da plataforma.</footer></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => printWindow.close();
    printWindow.print();
    setExporting(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2"><FileBarChart size={19} className="text-blue-600"/><span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Análise e desempenho</span></div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Relatórios</h1>
          <p className="mt-1 text-sm text-slate-500">Analise movimentações, confirmação e rastreabilidade da operação.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={loading || !report?.records.length || exporting !== null} onClick={exportCSV} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Download size={16}/>{exporting === "csv" ? "Exportando..." : "Exportar CSV"}</button>
          <button type="button" disabled={loading || !report?.records.length || exporting !== null} onClick={exportPDF} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><FileText size={16}/>{exporting === "pdf" ? "Gerando PDF..." : "Exportar PDF"}</button>
        </div>
      </header>
      <ReportsFilters filters={filters} organizations={report?.organizationOptions ?? []} categories={report?.categoryOptions ?? []} onChange={setFilters} onApply={handleApplyFilters} onReset={handleResetFilters}/>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={handleRetry} className="ml-3 font-semibold underline">Tentar novamente</button></div>}
      {loading ? <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18}/>Carregando dados dos relatórios...</div> : report && !error ? <>
        <ReportMetrics metrics={report.metrics}/>
        <ReportCharts monthly={report.monthly} categories={report.categories}/>
        <ReportOrganizationTable organizations={report.organizations}/>
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><h3 className="font-semibold text-slate-800">Movimentações incluídas</h3><p className="mt-1 text-xs text-slate-500">{report.records.length} registros • mesmos filtros aplicados no relatório e nas exportações</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Lote / Produto", "Origem", "Destino", "Data", "Status", "Localização"].map((title) => <th key={title} className="px-4 py-3 font-semibold">{title}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.records.length ? report.records.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="font-medium text-slate-800">{item.lotCode}</div><div className="text-xs text-slate-500">{item.productName} · {item.category}</div></td><td className="px-4 py-3 text-slate-600">{item.originName}</td><td className="px-4 py-3 text-slate-600">{item.destinationName}</td><td className="px-4 py-3 text-slate-600">{ptDate(item.date)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.status === "CONFIRMADA" ? "bg-emerald-50 text-emerald-700" : item.status === "COM_OCORRENCIA" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{item.statusLabel}</span></td><td className="px-4 py-3 text-slate-600">{item.location || "—"}</td></tr>) : <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Nenhuma movimentação encontrada para os filtros.</td></tr>}</tbody></table></div>
        </article>
      </> : null}
    </div>
  );
}
