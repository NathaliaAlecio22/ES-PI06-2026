import { Search, SlidersHorizontal, Warehouse, X } from "lucide-react";

interface Props {
  search: string;
  status: string;
  storageStatus: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onStorageStatusChange: (value: string) => void;
  onReset: () => void;
}

export default function TransferFilters({
  search,
  status,
  storageStatus,
  onSearchChange,
  onStatusChange,
  onStorageStatusChange,
  onReset,
}: Props) {
  const hasFilters = search !== "" || status !== "Todos" || storageStatus !== 'Todos';

  return (
    <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-slate-400 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50">
          <Search size={17} />

          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar transferência, produto ou lote..."
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>

        <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-500">
          <SlidersHorizontal size={16} />

          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="min-w-0 bg-transparent text-sm outline-none"
          >
            <option value="Todos">Todos os status</option>
            <option value="Confirmada">Confirmada</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Aguardando confirmação">
              Aguardando confirmação
            </option>
            <option value="Com ocorrência">Com ocorrência</option>
          </select>
        </div>

        <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-slate-500">
            <Warehouse size={16} />

            <select
                value={storageStatus}
                onChange={(e) => onStorageStatusChange(e.target.value)}
                className="min-w-0 bg-transparent text-sm outline-none">
                    <option value="Todos">Todas as opções</option>
                    <option value="Em transporte">Em transporte</option>
                    <option value="Armazenado">Armazenado</option>
                </select>
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 lg:self-auto"
        >
          <X size={15} />
          Limpar filtros
        </button>
      )}
    </div>
  );
}