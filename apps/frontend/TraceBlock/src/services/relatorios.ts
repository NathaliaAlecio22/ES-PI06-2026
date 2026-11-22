import { apiRequest } from "./api";
import type { ReportData, ReportFilters } from "../components/reports/reports.types";


export async function getReportData(filters: ReportFilters): Promise<ReportData> {
  const params = new URLSearchParams();
  params.set("period", filters.period);
  if (filters.organizationId !== "all") params.set("organizationId", filters.organizationId);
  if (filters.category !== "all") params.set("category", filters.category);
  if ( filters.period === "custom" ) {
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
  }
  return apiRequest<ReportData>(`/relatorios?${params.toString()}`);
}
