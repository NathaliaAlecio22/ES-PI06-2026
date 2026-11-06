
import {
  ChevronDown,
  CircleHelp,
  LogOut,
  Settings,
  X,
} from "lucide-react";

import Brand from "./Brand";
import { navItems, type Page } from "./sidebar.config";

interface SidebarProps {
  page: Page;
  setPage: (page: Page) => void;
  open: boolean;
  close: () => void;
  logout: () => void;
}

export default function Sidebar({
  page,
  setPage,
  open,
  close,
  logout,
}: SidebarProps) {
  const renderNavItem = (item: (typeof navItems)[number]) => {
    const Icon = item.icon;
    const active = page === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setPage(item.id);
          close();
        }}
        className={`flex h-[39px] w-full items-center gap-[11px] rounded-[7px] px-2.5 text-left text-[11px] font-medium transition-colors ${
          active
            ? "bg-[#2448c9] text-white shadow-[inset_3px_0_#7390ff]"
            : "text-[#98a3b4] hover:bg-[#1a2435] hover:text-[#f1f3f6]"
        }`}
      >
        <Icon size={18} className="shrink-0" />

        <span className="min-w-0 flex-1">{item.label}</span>

        {item.id === "transfers" && (
          <span className="ml-auto rounded-lg bg-white/15 px-1.5 py-0.5 text-[8px] text-[#dfe5ff]">
            3
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Fundo escuro do menu mobile */}
      {open && (
        <div
          onClick={close}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[244px] flex-col bg-[#111827] px-[14px] pb-[15px] pt-[25px] text-[#9aa5b5] transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-[9px]">
          <Brand />

          <button
            type="button"
            onClick={close}
            aria-label="Fechar menu"
            className="rounded-md p-1 text-[#9aa5b5] transition-colors hover:bg-[#1a2435] hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Organização */}
        <button
          type="button"
          className="mx-px mb-[22px] mt-[26px] flex items-center gap-[9px] rounded-[9px] border border-[#293244] bg-[#182132] p-2.5 text-left transition-colors hover:bg-[#202c40]"
        >
          <span className="grid h-[29px] w-[29px] shrink-0 place-items-center rounded-[7px] bg-[#2d55df] text-[10px] font-bold text-white">
            AM
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[8px] text-[#788398]">
              Organização
            </span>

            <span className="truncate text-[10px] font-semibold text-[#e6e9ef]">
              AgroMarket Brasil
            </span>
          </span>

          <ChevronDown size={15} className="shrink-0" />
        </button>

        {/* Navegação */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          <span className="mb-2 mt-1 block px-2.5 text-[8px] font-bold tracking-[0.12em] text-[#5d687b]">
            OPERAÇÃO
          </span>

          {navItems.slice(0, 8).map(renderNavItem)}

          <span className="mb-2 mt-5 block px-2.5 text-[8px] font-bold tracking-[0.12em] text-[#5d687b]">
            GESTÃO
          </span>

          {navItems.slice(8).map(renderNavItem)}
        </nav>

        {/* Rodapé da sidebar */}
        <div className="mt-auto border-t border-[#242d3d] pt-[11px]">
          <button
            type="button"
            className="flex h-[39px] w-full items-center gap-[11px] rounded-[7px] px-2.5 text-left text-[11px] font-medium text-[#98a3b4] transition-colors hover:bg-[#1a2435] hover:text-white"
          >
            <CircleHelp size={18} />
            <span>Ajuda e suporte</span>
          </button>

          <button
            type="button"
            className="flex h-[39px] w-full items-center gap-[11px] rounded-[7px] px-2.5 text-left text-[11px] font-medium text-[#98a3b4] transition-colors hover:bg-[#1a2435] hover:text-white"
          >
            <Settings size={18} />
            <span>Configurações</span>
          </button>

          {/* Usuário */}
          <div className="mt-[9px] flex items-center gap-[9px] px-2 pb-0 pt-[11px]">
            <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-[#e8edff] text-[9px] font-bold text-[#315cf5]">
              MR
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[10px] font-semibold text-[#e8ebef]">
                Marina Rocha
              </span>

              <span className="truncate text-[8px] text-[#727e90]">
                Gerente de operações
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sair"
              aria-label="Sair da plataforma"
              className="rounded-md p-1 text-[#727e90] transition-colors hover:bg-[#1a2435] hover:text-white"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
