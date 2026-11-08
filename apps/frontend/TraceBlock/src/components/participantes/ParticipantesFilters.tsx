import { Search, ChevronDown } from "lucide-react";

interface ParticipantFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  type: string;
  setType: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
}

export default function ParticipantFilters({
  search,
  setSearch,
  type,
  setType,
  status,
  setStatus,
}: ParticipantFiltersProps) {
  const selectClass =
    "h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
      <label className="flex h-9 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-slate-400 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 xl:w-[280px]">
        <Search size={16} />

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar organização ou responsável..."
          className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative">
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={`${selectClass} w-full appearance-none pr-9 sm:w-[190px]`}
          >
            <option value="">Todos os tipos</option>
            <option value="Fabricante">Fabricante</option>
            <option value="Transportadora">Transportadora</option>
            <option value="Centro de armazenamento">
              Centro de armazenamento
            </option>
            <option value="Distribuidor">Distribuidor</option>
          </select>

          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        <div className="relative">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={`${selectClass} w-full appearance-none pr-9 sm:w-[175px]`}
          >
            <option value="">Todos os status</option>
            <option value="Autorizado">Autorizado</option>
            <option value="Aguardando validação">
              Aguardando validação
            </option>
            <option value="Suspenso">Suspenso</option>
          </select>

          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>
    </div>
  );
}