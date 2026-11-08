export interface ReportRecord {
  id: string;
  organization: string;
  type: string;
  category: string;
  date: string;
  movements: number;
  transitDays: number;
  compliance: number;
  alerts: number;
}

export type PeriodFilter =
  | "7"
  | "30"
  | "90"
  | "year"
  | "custom";

export interface ReportFilters {
  period: PeriodFilter;
  organization: string;
  category: string;
  startDate: string;
  endDate: string;
}