import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import ProductStats from "../../components/products/ProductStats";
import ProductsTable from "../../components/products/ProductsTable";
import ProductFormModal from "../../components/products/ProductFormModal";
import ProductDetailsModal from "../../components/products/ProductDetailsModal";

import type { Product, ProductFormData } from "../../components/products/Products.types";
import {
  buscarEstatisticasProdutos,
  cadastrarProduto,
  listarProdutos,
  verificarCadeiaCustodiaProduto,
  type ProductStatsData,
} from "../../services/produtos";
import { getUsuario } from "../../services/auth";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStatsData>({
    total: 0,
    inTransit: 0,
    stored: 0,
    pending: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState<
    "checking" | "ready" | "missing" | "error"
  >("checking");
  const [workflowError, setWorkflowError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    null
  );

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const [loadedProducts, loadedStats] = await Promise.all([
          listarProdutos(),
          buscarEstatisticasProdutos(),
        ]);
        if (active) {
          setProducts(loadedProducts);
          setStats(loadedStats);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar produtos e lotes.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadProducts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    verificarCadeiaCustodiaProduto()
      .then(({ configured }) => {
        if (active) setWorkflowStatus(configured ? "ready" : "missing");
      })
      .catch((error: unknown) => {
        if (active) {
          setWorkflowStatus("error");
          setWorkflowError(
            error instanceof Error
              ? error.message
              : "Não foi possível verificar a cadeia de custódia.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

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
  async function handleSaveProduct(form: ProductFormData) {
    const product = await cadastrarProduto(form);
    setProducts((current) => [product, ...current]);
    setStats((current) => ({
      ...current,
      total: current.total + 1,
      stored: current.stored + 1,
    }));
    setFormOpen(false);
  }

  const usuario = getUsuario();

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

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            disabled={workflowStatus !== "ready" || isLoading}
            onClick={() => {
              if (workflowStatus === "ready") setFormOpen(true);
            }}
            title={workflowStatus === "missing"
              ? "Crie uma cadeia de custódia antes de cadastrar produtos."
              : undefined}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />
            Cadastrar produto
          </button>
          {workflowStatus === "checking" && (
            <p role="status" className="text-xs text-slate-500">
              Verificando cadeia de custódia...
            </p>
          )}
          {workflowStatus === "missing" && (
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <p role="alert" className="text-xs text-amber-700">
                Configure etapas e responsáveis em Cadeia de custódia para liberar o cadastro.
              </p>
              {usuario?.perfil?.toUpperCase() !== "ADMINISTRADOR" &&
                usuario?.perfil?.toUpperCase() !== "ADMIN" && (
                  <p className="text-xs text-slate-500">
                    Solicite a um administrador da organização que configure a cadeia.
                  </p>
                )}
            </div>
          )}
          {workflowStatus === "error" && (
            <p role="alert" className="max-w-xs text-right text-xs text-red-600">
              {workflowError}
            </p>
          )}
          {workflowError && workflowStatus === "missing" && (
            <p role="alert" className="max-w-xs text-right text-xs text-red-600">
              {workflowError}
            </p>
          )}
        </div>
      </div>

      {/* Indicadores */}
      {loadError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </p>
      )}
      <ProductStats stats={stats} />

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
      {isLoading && (
        <p role="status" className="text-center text-sm text-slate-500">
          Carregando produtos e lotes...
        </p>
      )}

      {/* Modal de cadastro */}
      {formOpen && (
        <ProductFormModal
          close={() => setFormOpen(false)}
          onSave={handleSaveProduct}
          manufacturer={usuario?.empresa ?? ""}
          responsible={usuario?.nome ?? ""}
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