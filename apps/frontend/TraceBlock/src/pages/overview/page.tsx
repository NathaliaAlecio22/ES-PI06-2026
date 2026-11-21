import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import MetricsCard from "../../components/overview/MetricsCard";
import MovementsCharts from "../../components/overview/MovementsChart";
import LotsChart from "../../components/overview/LotsChart";
import RecentActivities from "../../components/overview/RecentActivities";
import BlockchainIntegrity from "../../components/overview/BlockchainIntegrity";
import {
  buscarEstatisticasProdutos,
  type ProductStatsData,
} from "../../services/produtos";

import { listarProdutos } from "../../services/produtos";
import type { Product } from "../../components/products/Products.types";

import { listarTransferencias } from "../../services/transferencias";

interface OverviewProps {
  goProducts: () => void;
}

export default function Overview({ goProducts }: OverviewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStatsData | null>(null);
  const [transferCount, setTransferCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    buscarEstatisticasProdutos()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((error) => {
        console.error("Erro ao carregar métricas:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
  let cancelled = false;

  async function loadTransfers() {
    try {
      const data = await listarTransferencias();

      if (!cancelled) {
        setTransferCount(data.length);
      }
    } catch (error) {
      console.error("Erro ao carregar transferências:", error);
    }
  }

  void loadTransfers();

  return () => {
    cancelled = true;
  };
}, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const data = await listarProdutos();
        if (!cancelled) setProducts(data);
      } catch (error) {
        console.error("Erro ao carregar lotes:", error);
      }
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const lotsData = useMemo(() => {
    return [
      {
        name: "Em transporte",
        value: products.filter((product) => product.status === "Em transporte")
          .length,
        color: "#315CF5",
      },
      {
        name: "Armazenados",
        value: products.filter((product) => product.status === "Armazenado")
          .length,
        color: "#10B981",
      },
    ];
  }, [products]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Visão geral
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Acompanhe a rastreabilidade e a movimentação dos seus produtos em tempo real.
          </p>
        </div>

        <button
          onClick={goProducts}
          className="flex items-center gap-2 rounded-lg bg-[#315CF5] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#244CE0]"
        >
          <Plus size={16} strokeWidth={2} />
          <span>Novo produto</span>
        </button>
      </div>

      <MetricsCard stats={stats}  transferCount={transferCount}/>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <MovementsCharts />
        <LotsChart lotsData={lotsData} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivities />
        </div>

        <div className="lg:col-span-1">
          <BlockchainIntegrity />
        </div>
      </div>
    </div>
  );
}