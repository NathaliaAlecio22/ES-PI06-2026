import MetricsCard from "../../components/overview/MetricsCard";
import MovementsCharts from "../../components/overview/MovementsChart";
import LotsChart from "../../components/overview/LotsChart";

interface OverviewProps {
    goProducts: () => void;
}

import { Plus } from "lucide-react";
import RecentActivities from "../../components/overview/RecentActivities";
import BlockchainIntegrity from "../../components/overview/BlockchainIntegrity";


export default function Overview({goProducts}: OverviewProps) {
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

            <MetricsCard />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <MovementsCharts />
                <LotsChart />
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
    )
}