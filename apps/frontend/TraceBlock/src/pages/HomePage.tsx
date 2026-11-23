
import { useState } from "react";
import type { Page } from "../components/layout/sidebar.config";
import AppLayout from "../components/layout/AppLayout";
import Overview from "./overview/page";
import ProductsPage from "./products/page";
import ParticipantsPage from "./participantes/page";
import BlockchainPage from "./blockchain/page";
import ReportsPage from "./reports/page";
import TransfersPage from "./transfer/page";
import SensorsPage from "./sensor/page";
import CustodyPage from "./custody/page";
import AdminPage from "./admin/page";


export function HomePage() {
    const [page, setPage] = useState<Page>("overview");

    return (
        <AppLayout page={page} setPage={setPage}>
            {page === "overview" && (
                <Overview
                goProducts={() => setPage("products")}
                />
            )}

            {page === 'products' && (
                <ProductsPage />
            )}

            {page === 'participants' && (
                <ParticipantsPage />
            )}

            {page === 'blockchain' && (
                <BlockchainPage />
            )}

            {page === 'reports' && (
                <ReportsPage />
            )}

            {page === 'transfers' && (
                <TransfersPage />
            )}

            {page === 'sensors' && (
                <SensorsPage />
            )}

            {page === 'custody' && (
                <CustodyPage />
            )}

            {page === 'admin' && (
                <AdminPage />
            )}
        </AppLayout>
    )
}