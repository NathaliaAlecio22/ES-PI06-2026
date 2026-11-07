import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import ProductStats from "../../components/products/ProductStats";
import ProductsTable from "../../components/products/ProductsTable";
import ProductFormModal from "../../components/products/ProductFormModal";
import ProductDetailsModal from "../../components/products/ProductDetailsModal";

import { initialProducts } from "../../components/products/products.data";
import type { Product } from "../../components/products/Products.types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    null
  );

  // Pesquisa e filtros
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchValue = search.toLowerCase();

      const matchesSearch = [
        product.code,
        product.name,
        product.lot,
        product.owner,
        product.location,
      ].some((value) => value.toLowerCase().includes(searchValue));

      const matchesCategory =
        !category || product.category === category;

      const matchesStatus =
        !status || product.status === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, category, status]);

  // Cadastro de produto
  function handleSaveProduct(product: Product) {
    const codeExists = products.some(
      (item) => item.code.toLowerCase() === product.code.toLowerCase()
    );

    const lotExists = products.some(
      (item) => item.lot.toLowerCase() === product.lot.toLowerCase()
    );

    if (codeExists || lotExists) {
      window.alert(
        codeExists
          ? "Já existe um produto com esse código."
          : "Já existe um produto com esse identificador de lote."
      );

      return;
    }

    setProducts((current) => [product, ...current]);
    setFormOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Produtos e lotes
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Gerencie os produtos cadastrados e acompanhe sua trajetória
            na cadeia de suprimentos.
          </p>
        </div>

        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Cadastrar produto
        </button>
      </div>

      {/* Indicadores */}
      <ProductStats />

      {/* Tabela e filtros */}
      <ProductsTable
        products={filteredProducts}
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        status={status}
        setStatus={setStatus}
        onSelect={setSelectedProduct}
      />

      {/* Modal de cadastro */}
      {formOpen && (
        <ProductFormModal
          close={() => setFormOpen(false)}
          onSave={handleSaveProduct}
        />
      )}

      {/* Modal de detalhes */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          close={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}