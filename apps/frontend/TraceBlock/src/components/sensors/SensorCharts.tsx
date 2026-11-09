import { Activity, Thermometer } from "lucide-react";

const values = [
  18.2, 18.5, 19.1, 18.8, 19.4, 20.1, 19.6,
  20.4, 21.2, 20.8, 19.9, 20.3, 21.1, 22.4,
  21.7, 20.6, 19.8, 20.2, 21.4, 24.8, 22.1,
  20.4, 19.2, 18.4,
];

export default function SensorCharts() {
  const min = 0;
  const max = 30;
  const width = 700;
  const height = 220;

  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: height - ((value - min) / (max - min)) * height,
  }));

  const line = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Thermometer size={19} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Histórico de temperatura
              </h2>
              <p className="text-xs text-slate-500">
                Variação durante o período monitorado
              </p>
            </div>
          </div>
        </div>

        <span className="flex items-center gap-2 text-xs font-medium text-emerald-600">
          <Activity size={15} />
          Sensor IoT ativo
        </span>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <i className="h-2 w-2 rounded-full bg-blue-600" />
            Temperatura registrada
          </span>

          <span className="flex items-center gap-2">
            <i className="h-2 w-2 rounded-full bg-orange-400" />
            Limite superior: 24 °C
          </span>
        </div>

        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="h-56 w-full overflow-visible"
          >
            <defs>
              <linearGradient id="sensorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 10, 20, 30].map((value) => {
              const y = height - (value / max) * height;

              return (
                <g key={value}>
                  <line
                    x1="0"
                    y1={y}
                    x2={width}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="4 5"
                  />
                  <text
                    x="4"
                    y={y - 6}
                    fill="#94a3b8"
                    fontSize="11"
                  >
                    {value}°
                  </text>
                </g>
              );
            })}

            <line
              x1="0"
              y1={height - (24 / max) * height}
              x2={width}
              y2={height - (24 / max) * height}
              stroke="#fb923c"
              strokeDasharray="6 5"
              strokeWidth="1.5"
            />

            <path d={area} fill="url(#sensorGradient)" />

            <path
              d={line}
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>

        <div className="mt-3 flex justify-between text-[11px] text-slate-400">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>Agora</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs text-slate-500">Mínima</p>
          <strong className="mt-1 block text-base text-slate-900">18,2 °C</strong>
        </div>
        <div>
          <p className="text-xs text-slate-500">Máxima</p>
          <strong className="mt-1 block text-base text-red-600">24,8 °C</strong>
        </div>
        <div>
          <p className="text-xs text-slate-500">Média</p>
          <strong className="mt-1 block text-base text-slate-900">20,1 °C</strong>
        </div>
      </div>
    </section>
  );
}