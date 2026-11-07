
import { useState } from "react";
import type { Page } from "../components/layout/sidebar.config";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import Overview from "./overview/page";
import ProductsPage from "./products/page";


export function HomePage() {
    const [page, setPage] = useState<Page>("overview");
    const navigate = useNavigate();

    function handleLogout() {
        navigate("/login")
    }

    return (
        <AppLayout page={page} setPage={setPage} logout={handleLogout}>
            {page === "overview" && (
                <Overview
                goProducts={() => setPage("products")}
                />
            )}

            {page === 'products' && (
                <ProductsPage />
            )}
        </AppLayout>
    )
}