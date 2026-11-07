import { useState } from "react";
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

const chartData = [
  { month: "Jan", movements: 120 },
  { month: "Fev", movements: 180 },
  { month: "Mar", movements: 145 },
  { month: "Abr", movements: 240 },
  { month: "Mai", movements: 210 },
  { month: "Jun", movements: 310 },
  { month: "Jul", movements: 280 },
  { month: "Ago", movements: 350 },
  { month: "Set", movements: 290 },
  { month: "Out", movements: 420 },
  { month: "Nov", movements: 380 },
  { month: "Dez", movements: 460 },
];

type Period = "6" | "12";

export default function MovementsCharts() {
    const [period, setPeriod] = useState<Period>("12");

    const filteredData = period === "6" ? chartData.slice(-6) : chartData;

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
                    <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}
                    className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-xs font-medium text-slate-600 outline-none transition hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                        <option value="6">Últimos 6 meses</option>
                        <option value="12">Últimos 12 meses</option>
                    </select>

                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />

                </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="text-xs text-slate-500">
                    Movimentações registradas
                </span>
            </div>

            <div className="mt-4 h-[260px] w-full">
                <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart
            data={filteredData}
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
            </div>
        </section>
    )
}