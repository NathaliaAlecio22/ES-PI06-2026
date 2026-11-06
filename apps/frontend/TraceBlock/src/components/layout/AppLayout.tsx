import { useState, type ReactNode } from "react";

import Sidebar from "./Sidebar";
import Topbar from "./TopBar";
import type { Page } from "./sidebar.config";

interface AppLayoutProps {
  children: ReactNode;
  page: Page;
  setPage: (page: Page) => void;
  logout: () => void;
}

export default function AppLayout({
  children,
  page,
  setPage,
  logout,
}: AppLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar
        page={page}
        setPage={setPage}
        open={menuOpen}
        close={() => setMenuOpen(false)}
        logout={logout}
      />

      <div className="min-h-screen lg:ml-[244px]">
        <Topbar
          page={page}
          openMenu={() => setMenuOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1600px] px-4 py-7 pb-[55px] sm:px-6 lg:px-[30px]">
          {children}
        </main>
      </div>
    </div>
  );
}