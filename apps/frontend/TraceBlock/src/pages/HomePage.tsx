import Sidebar from "../components/layout/Sidebar";

import { useState } from "react";
import type { Page } from "../components/layout/sidebar.config";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";


export function HomePage() {
    const [page, setPage] = useState<Page>("overview");
    const navigate = useNavigate();

    function handleLogout() {
        navigate("/login")
    }

    return (
        <AppLayout page={page} setPage={setPage} logout={handleLogout}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                        Visão geral
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Acompanhe as principais informações da sua operação.
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <p className="text-sm text-slate-500">
                        Conteúdo de visão geral será implementado aqui.
                    </p>
                </div>
            </div>
        </AppLayout>
    )
}