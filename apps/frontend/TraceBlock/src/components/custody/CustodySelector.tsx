import { ChevronDown, PackageOpen, Search } from "lucide-react";
import { custodyLots } from "./custody.data";

interface Props {
  lot: string;
  onLotChange: (value: string) => void;
}

export default function CustodyLotSelector({
  lot,
  onLotChange,
}: Props) {
  const selected =
    custodyLots.find((item) => item.value === lot) ?? custodyLots[0];

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <label
          htmlFor="custody-lot"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Lote selecionado
        </label>

        <div className="relative max-w-xl">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <select
            id="custody-lot"
            value={lot}
            onChange={(event) => onLotChange(event.target.value)}
            className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {custodyLots.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3 rounded-lg bg-slate-50 p-3 lg:min-w-[330px]">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-700">
          <PackageOpen size={21} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {selected.product}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {selected.harvest} · {selected.quantity}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {selected.status}
        </span>
      </div>
    </section>
  );
}