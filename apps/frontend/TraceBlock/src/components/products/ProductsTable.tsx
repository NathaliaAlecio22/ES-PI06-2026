import {
  Search,
  Filter,
  ChevronDown,
  MoreHorizontal,
  Package,
  Download,
} from "lucide-react";

import type { Product, ProductStatus } from "./Products.types";

interface ProductsTableProps {
  products: Product[];
  search: string;
  setSearch: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  onSelect: (product: Product) => void;
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const styles: Record<ProductStatus, string> = {
    "Em transporte": "bg-blue-50 text-blue-700 ring-blue-600/10",
    Armazenado: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Entregue: "bg-green-50 text-green-700 ring-green-600/10",
    "Em produção": "bg-slate-100 text-slate-700 ring-slate-500/10",
    Pendente: "bg-amber-50 text-amber-700 ring-amber-600/10",
    "Com ocorrência": "bg-red-50 text-red-700 ring-red-600/10",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function ProductIdentity({ product }: { product: Product }) {
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Package size={19} />
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-800">
          {product.name}
        </p>

        <p className="mt-0.5 text-xs text-slate-500">
          {product.lot}
        </p>
      </div>
    </div>
  );
}

function exportProducts(products: Product[]) {
  const headers = [
    "Código",
    "Produto",
    "Lote",
    "Categoria",
    "Fabricação",
    "Responsável",
    "Localização",
    "Status",
  ];

  const rows = products.map((product) => [
    product.code,
    product.name,
    product.lot,
    product.category,
    product.date,
    product.owner,
    product.location,
    product.status,
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(";")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "produtos-e-lotes.csv";
  link.click();

  URL.revokeObjectURL(url);
}

export default function ProductsTable({
  products,
  search,
  setSearch,
  category,
  setCategory,
  status,
  setStatus,
  onSelect,
}: ProductsTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Cabeçalho da tabela */}
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Produtos cadastrados
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Consulte e gerencie os produtos e lotes da plataforma.
          </p>
        </div>

        <button
          onClick={() => exportProducts(products)}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Download size={16} />
          Exportar
        </button>
      </div>

      {/* Barra de pesquisa e filtros */}
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por produto, código ou lote..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
          <div className="relative">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-600 outline-none focus:border-blue-500"
            >
              <option value="">Todas as categorias</option>
              <option value="Alimentos">Alimentos</option>
              <option value="Medicamentos">Medicamentos</option>
              <option value="Eletrônicos">Eletrônicos</option>
              <option value="Matéria-prima">Matéria-prima</option>
            </select>

            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div className="relative">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-600 outline-none focus:border-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="Em transporte">Em transporte</option>
              <option value="Armazenado">Armazenado</option>
              <option value="Entregue">Entregue</option>
              <option value="Em produção">Em produção</option>
              <option value="Pendente">Pendente</option>
              <option value="Com ocorrência">Com ocorrência</option>
            </select>

            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        <button
          onClick={() => {
            setSearch("");
            setCategory("");
            setStatus("");
          }}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Filter size={15} />
          Limpar filtros
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-4">Código</th>
              <th className="px-5 py-4">Produto / lote</th>
              <th className="px-5 py-4">Categoria</th>
              <th className="px-5 py-4">Fabricação</th>
              <th className="px-5 py-4">Responsável atual</th>
              <th className="px-5 py-4">Localização</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {products.length > 0 ? (
              products.map((product) => (
                <tr
                  key={product.code}
                  onClick={() => onSelect(product)}
                  className="cursor-pointer transition-colors hover:bg-slate-50/80"
                >
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="font-mono text-xs font-semibold text-blue-600">
                      {product.code}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <ProductIdentity product={product} />
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                    {product.category}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                    {product.date}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                    {product.owner}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                    {product.location}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={product.status} />
                  </td>

                  <td className="px-5 py-4">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(product);
                      }}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={`Ver ${product.name}`}
                    >
                      <MoreHorizontal size={19} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <Package
                    size={32}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 font-medium text-slate-700">
                    Nenhum produto encontrado
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Tente alterar os termos da pesquisa ou os filtros.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row">
        <p className="text-xs text-slate-500">
          Exibindo {products.length} registros nesta visualização
        </p>

        <span className="text-xs text-slate-400">
          Dados demonstrativos
        </span>
      </div>
    </section>
  );
}