export type PeriodFilter = "7" | "30" | "90" | "year" | "custom";

export interface ReportFilters {
  period: PeriodFilter;
  organizationId: string;
  category: string;
  startDate: string;
  endDate: string;
}

export interface ReportMetricsData {
  movements: number;
  confirmed: number;
  averageTransitDays: number;
  confirmationRate: number;
  occurrences: number;
}
export interface ReportRecord {
  id: string;
  date: string | null;
  lotCode: string;
  productName: string;
  category: string;
  originId: string | null;
  originName: string;
  destinationId: string;
  destinationName: string;
  status: string;
  statusLabel: string;
  location: string;
  quantity: string;
  unit: string;
  txHash: string | null;
  temperature: string | null;
  humidity: string | null;
  transitDays: number | null;
}
export interface MonthlyReportData {
  month: string;
  label: string;
  movements: number;
}
export interface CategoryReportData {
  category: string;
  total: number;
  confirmationRate: number;
  occurrences: number;
}
export interface OrganizationReportData {
  id: string;
  organization: string;
  type: string;
  movements: number;
  averageTransitDays: number;
  confirmationRate: number;
  occurrences: number;
}
export interface ReportOrganizationOption {
  id: string;
  name: string;
  type: string;
}
export interface ReportData {
  metrics: ReportMetricsData;
  monthly: MonthlyReportData[];
  categories: CategoryReportData[];
  organizations: OrganizationReportData[];
  organizationOptions: ReportOrganizationOption[];
  categoryOptions: string[];
  records: ReportRecord[];
}
