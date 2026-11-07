import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const lotsData = [
  {
    name: "Em transporte",
    value: 94,
    color: "#315cf5",
  },
  {
    name: "Armazenados",
    value: 72,
    color: "#10b981",
  },
  {
    name: "Em processamento",
    value: 52,
    color: "#f59e0b",
  },
  {
    name: "Outros",
    value: 30,
    color: "#94a3b8",
  },
];

const totalLots = lotsData.reduce(
  (total, item) => total + item.value,
  0
);

export default function LotsChart() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Distribuição de lotes
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Lotes separados por situação atual
        </p>
      </div>

      {/* Gráfico e legenda */}
      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
        {/* Donut */}
        <div className="relative h-[220px] w-full max-w-[240px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={lotsData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={67}
                outerRadius={92}
                paddingAngle={4}
                stroke="none"
                cornerRadius={5}
                animationDuration={900}
              >
                {lotsData.map((item) => (
                  <Cell
                    key={item.name}
                    fill={item.color}
                  />
                ))}
              </Pie>

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;

                  const item = payload[0].payload;

                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />

                        <span className="text-xs text-slate-500">
                          {item.name}
                        </span>
                      </div>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {item.value} lotes
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Total no centro */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {totalLots}
            </span>

            <span className="mt-1 text-xs text-slate-500">
              Total de lotes
            </span>
          </div>
        </div>

        {/* Legenda */}
        <div className="w-full space-y-5">
          {lotsData.map((item) => {
            const percentage = (
              (item.value / totalLots) *
              100
            ).toFixed(1);

            return (
              <div
                key={item.name}
                className="space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />

                    <span className="text-sm text-slate-600">
                      {item.name}
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-slate-900">
                    {item.value}
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}