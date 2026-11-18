import {
  Building2,
  Clock3,
  ShieldCheck,
  Users,
} from "lucide-react";

interface AdminOverviewProps {
  users: number;
  organizations: number;
  roles: number;
  pending: number;
}

const cards = [
  {
    key: "users",
    label: "Usuários cadastrados",
    icon: Users,
    color: "bg-blue-50 text-blue-600",
  },
  {
    key: "organizations",
    label: "Organizações",
    icon: Building2,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    key: "roles",
    label: "Perfis de acesso",
    icon: ShieldCheck,
    color: "bg-purple-50 text-purple-600",
  },
  {
    key: "pending",
    label: "Cadastros pendentes",
    icon: Clock3,
    color: "bg-amber-50 text-amber-600",
  },
] as const;

export default function AdminOverview({
  users,
  organizations,
  roles,
  pending,
}: AdminOverviewProps) {
  const values = { users, organizations, roles, pending };

  return (
    <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.key}
            className="flex min-h-28 items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <p className="text-xs font-medium text-slate-500">
                {card.label}
              </p>
              <strong className="mt-2 block text-2xl font-bold text-slate-900">
                {values[card.key]}
              </strong>
            </div>

            <span className={`grid size-11 place-items-center rounded-xl ${card.color}`}>
              <Icon size={21} />
            </span>
          </article>
        );
      })}
    </section>
  );
}