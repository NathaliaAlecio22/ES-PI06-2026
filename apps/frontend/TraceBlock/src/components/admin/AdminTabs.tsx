import type { AdminTab } from "./admin.types";

interface AdminTabsProps {
  activeTab: AdminTab;
  onChange: (tab: AdminTab) => void;
}

const tabs: AdminTab[] = [
  "Usuários",
  "Organizações",
  "Perfis e permissões",
  "Atividades",
];

export default function AdminTabs({ activeTab, onChange }: AdminTabsProps) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white px-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`shrink-0 border-b-2 px-4 py-4 text-sm font-semibold transition ${
            activeTab === tab
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}