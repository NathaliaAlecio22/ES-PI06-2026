import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown } from "lucide-react";

import { listarTransferencias } from "../../services/transferencias";
import type { Transfer } from "../transfers/tranfers.type";


type Period = "6" | "12";

type ChartData = {
  month: string;
  movements: number;
  key: string;
}

function parseTransferDate(date: string): Date | null {
  if (!date) return null;

  // Formato ISO: 2026-11-20
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
    const parsed = new Date(date);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Formato brasileiro: 20/11/2026
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [day, month, year] = date.split("/").map(Number);

    return new Date(year, month - 1, day);
  }

  return null;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

export default function MovementsCharts() {
  const [period, setPeriod] = useState<Period>("12");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTransfers() {
      try {
        const data = await listarTransferencias();

        if (!cancelled) {
          setTransfers(data);
        }
      } catch (error) {
        console.error("Erro ao carregar movimentações:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTransfers();

    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(() => {
    const today = new Date();
    const monthsCount = Number(period);

    const months: ChartData[] = [];

    // Monta os últimos 6 ou 12 meses
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(
        today.getFullYear(),
        today.getMonth() - i,
        1,
      );

      months.push({
        month: getMonthLabel(date),
        movements: 0,
        key: getMonthKey(date),
      });
    }

    // Contabiliza as transferências reais
    const movementsByMonth = new Map<string, number>();

    transfers.forEach((transfer) => {
      const date = parseTransferDate(transfer.date);

      if (!date) return;

      const key = getMonthKey(date);

      movementsByMonth.set(
        key,
        (movementsByMonth.get(key) ?? 0) + 1,
      );
    });

    // Preenche os valores no gráfico
    return months.map((month) => ({
      ...month,
      movements: movementsByMonth.get(month.key) ?? 0,
    }));
  }, [transfers, period]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Movimentações
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Histórico de movimentações dos lotes
          </p>
        </div>

        <div className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-xs font-medium text-slate-600 outline-none transition hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="6">Últimos 6 meses</option>
            <option value="12">Últimos 12 meses</option>
          </select>

          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />

        <span className="text-xs text-slate-500">
          Movimentações registradas
        </span>
      </div>

      <div className="mt-4 h-[260px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Carregando movimentações...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="movementsGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#315cf5"
                    stopOpacity={0.22}
                  />
                  <stop
                    offset="95%"
                    stopColor="#315cf5"
                    stopOpacity={0.01}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />

              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                dy={10}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(value) => value.toLocaleString("pt-BR")}
                allowDecimals={false}
              />

              <Tooltip
                cursor={{
                  stroke: "#cbd5e1",
                  strokeDasharray: "4 4",
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;

                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
                      <p className="text-xs font-medium text-slate-500">
                        {label}
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {Number(payload[0].value).toLocaleString("pt-BR")}
                      </p>

                      <p className="text-xs text-slate-500">
                        movimentações
                      </p>
                    </div>
                  );
                }}
              />

              <Area
                type="monotone"
                dataKey="movements"
                stroke="#315cf5"
                strokeWidth={3}
                fill="url(#movementsGradient)"
                activeDot={{
                  r: 6,
                  fill: "#315cf5",
                  stroke: "#ffffff",
                  strokeWidth: 3,
                }}
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}