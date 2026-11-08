import {
  Search,
  Eye,
  ArrowUpDown,
} from "lucide-react";

import type { Transaction } from "./blockchain.types";

interface TransactionsTableProps {
  transactions: Transaction[];
  search: string;
  setSearch: (value: string) => void;
  eventFilter: string;
  setEventFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  onSelect: (transaction: Transaction) => void;
}

function StatusBadge({ status }: { status: Transaction["status"] }) {
  const styles = {
    Confirmada: "border-green-100 bg-green-50 text-green-700",
    "Em análise": "border-amber-100 bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-[8px] font-semibold ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export default function TransactionsTable({
  transactions,
  search,
  setSearch,
  eventFilter,
  setEventFilter,
  statusFilter,
  setStatusFilter,
  onSelect,
}: TransactionsTableProps) {
  return (
    <section className="min-h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Cabeçalho */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="text-[13px] font-semibold text-[#172033]">
            Transações recentes
          </h2>

          <p className="mt-1 text-[10px] text-slate-500">
            Eventos imutáveis registrados na rede
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <label className="flex h-9 min-w-[210px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-slate-400 focus-within:border-blue-400">
            <Search size={15} />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar hash, bloco ou lote..."
              className="w-full bg-transparent text-[10px] text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[10px] text-slate-600 outline-none focus:border-blue-400"
          >
            <option value="">Todos os eventos</option>
            <option value="Transferência de custódia">
              Transferência de custódia
            </option>
            <option value="Leitura de condição">
              Leitura de condição
            </option>
            <option value="Recebimento">Recebimento</option>
            <option value="Registro de ocorrência">
              Registro de ocorrência
            </option>
            <option value="Cadastro de produto">
              Cadastro de produto
            </option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[10px] text-slate-600 outline-none focus:border-blue-400"
          >
            <option value="">Todas as validações</option>
            <option value="Confirmada">Confirmada</option>
            <option value="Em análise">Em análise</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50">
              {[
                "Hash da transação",
                "Bloco",
                "Tipo de evento",
                "Produto / lote",
                "Participante",
                "Data e horário",
                "Validação",
                "",
              ].map((heading, index) => (
                <th
                  key={`${heading}-${index}`}
                  className="h-10 whitespace-nowrap border-y border-slate-100 px-3 text-[8px] font-bold uppercase tracking-wide text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <tr
                  key={transaction.hash}
                  onClick={() => onSelect(transaction)}
                  className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-blue-50/50"
                >
                  <td className="whitespace-nowrap px-3 py-4 font-mono text-[9px] font-medium text-blue-600">
                    {transaction.hash}
                  </td>

                  <td className="whitespace-nowrap px-3 py-4 font-mono text-[9px] text-slate-600">
                    {transaction.block}
                  </td>

                  <td className="whitespace-nowrap px-3 py-4 text-[9px] text-slate-700">
                    {transaction.event}
                  </td>

                  <td className="whitespace-nowrap px-3 py-4 text-[9px] font-semibold text-slate-700">
                    {transaction.item}
                  </td>

                  <td className="whitespace-nowrap px-3 py-4 text-[9px] text-slate-600">
                    {transaction.party}
                  </td>

                  <td className="whitespace-nowrap px-3 py-4 text-[9px] text-slate-500">
                    {transaction.date}
                  </td>

                  <td className="px-3 py-4">
                    <StatusBadge status={transaction.status} />
                  </td>

                  <td className="px-3 py-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(transaction);
                      }}
                      title="Visualizar transação"
                      className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={24} className="text-slate-300" />

                    <strong className="text-[11px] text-slate-600">
                      Nenhuma transação encontrada
                    </strong>

                    <span className="text-[9px] text-slate-400">
                      Tente alterar os filtros ou os termos da busca.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé */}
      <div className="flex flex-col justify-between gap-2 border-t border-slate-200 px-4 py-3 text-[9px] text-slate-500 sm:flex-row sm:items-center">
        <span>
          Exibindo {transactions.length} de {transactions.length} registros
          filtrados
        </span>

        <span className="flex items-center gap-1">
          <ArrowUpDown size={12} />
          Ordenação por registro mais recente
        </span>
      </div>
    </section>
  );
}