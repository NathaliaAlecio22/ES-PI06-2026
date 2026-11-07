import {
  Activity,
  Blocks,
  CheckCircle2,
  Clock3,
  Database,
  ShieldCheck,
} from "lucide-react";

const blockchainInfo = [
  {
    label: "Último bloco",
    value: "#58.294.120",
    icon: Blocks,
  },
  {
    label: "Transações registradas",
    value: "14.892",
    icon: Database,
  },
  {
    label: "Última sincronização",
    value: "Há 12 segundos",
    icon: Clock3,
  },
];

export default function BlockchainIntegrity() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Integridade do Blockchain
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Monitoramento da rede e dos registros
          </p>
        </div>

        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Rede conectada
        </span>
      </div>

      <div className="mt-6 flex items-center gap-4 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
          <ShieldCheck size={26} className="text-emerald-600" />
        </div>

        <div>
          <p className="font-semibold text-emerald-800">
            Integridade verificada
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Os registros estão sincronizados e sem inconsistências detectadas.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {blockchainInfo.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <Icon size={17} className="text-slate-600" />
              </div>

              <div>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <CheckCircle2 size={15} className="text-emerald-500" />
        <span>
          <Activity size={13} className="mr-1 inline" />
          Monitoramento ativo da rede
        </span>
      </div>
    </section>
  );
}