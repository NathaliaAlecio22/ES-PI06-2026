
import { useState } from "react";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Menu,
  Search,
  X,
} from "lucide-react";

import type { Page } from "./sidebar.config";

interface TopbarProps {
  page: Page;
  openMenu: () => void;
}

const pageLabels: Record<Page, string> = {
  overview: "Visão geral",
  products: "Produtos e lotes",
  participants: "Participantes",
  custody: "Cadeia de custódia",
  transfers: "Transferências",
  blockchain: "Histórico Blockchain",
  sensors: "Condições e sensores",
  reports: "Relatórios",
  admin: "Administração",
  support: "Ajuda e suporte",
  settings: "Configurações",
};

export default function Topbar({ page, openMenu }: TopbarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-[30px]">
      {/* Breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={openMenu}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden text-slate-400 sm:inline">
            TraceBlock
          </span>

          <ChevronRight
            size={15}
            className="hidden shrink-0 text-slate-300 sm:block"
          />

          <span className="truncate font-semibold text-slate-800">
            {pageLabels[page]}
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {/* Pesquisa */}
        <div className="hidden h-[34px] w-[210px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 transition-colors focus-within:border-[#315cf5] focus-within:bg-white md:flex">
          <Search size={15} className="shrink-0 text-slate-400" />

          <input
            type="text"
            placeholder="Buscar..."
            className="w-full border-none bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
          />

          <kbd className="shrink-0 rounded border border-slate-200 bg-white px-1 py-0.5 text-[9px] text-slate-400">
            /
          </kbd>
        </div>

        {/* Status Blockchain */}
        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 lg:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

          <span className="text-[10px] font-medium text-emerald-700">
            Blockchain conectada
          </span>
        </div>

        {/* Notificações */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            aria-label="Notificações"
            aria-expanded={notificationsOpen}
            className={`relative rounded-lg p-2 transition-colors ${
              notificationsOpen
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Bell size={19} />

            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-[340px]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Notificações
                  </h3>

                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Atualizações da plataforma
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  aria-label="Fechar notificações"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col items-center px-5 py-8 text-center">
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-slate-100">
                  <CheckCheck size={21} className="text-slate-400" />
                </span>

                <p className="text-xs font-semibold text-slate-700">
                  Tudo em dia!
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  Você não possui novas notificações.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="hidden h-7 w-px bg-slate-200 sm:block" />

        {/* Usuário */}
        <div className="flex items-center gap-2.5">
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-[11px] font-semibold text-slate-800">
              Marina Rocha
            </span>

            <span className="text-[9px] text-slate-400">
              Gerente de operações
            </span>
          </div>

          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e8edff] text-[10px] font-bold text-[#315cf5]">
            MR
          </div>
        </div>
      </div>
    </header>
  );
}
