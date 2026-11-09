
import {
  ArrowRight,
  Blocks,
  Building2,
  FileBarChart,
  Gauge,
  LayoutDashboard,
  Link2,
  PackageOpen,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type Page =
  | "overview"
  | "products"
  | "participants"
  | "custody"
  | "transfers"
  | "blockchain"
  | "sensors"
  | "reports"
  | "admin"
  | "support"
  | "settings";

export const navItems: {
  id: Page;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "products", label: "Produtos e lotes", icon: PackageOpen },
  { id: "participants", label: "Participantes", icon: Building2 },
  { id: "custody", label: "Cadeia de custódia", icon: Link2 },
  { id: "transfers", label: "Transferências", icon: ArrowRight },
  { id: "blockchain", label: "Histórico Blockchain", icon: Blocks },
  { id: "sensors", label: "Condições e sensores", icon: Gauge },
  { id: "reports", label: "Relatórios", icon: FileBarChart },
  { id: "admin", label: "Administração", icon: ShieldCheck },
];
