
import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Plus,
  Search,
  Users,
} from "lucide-react";

import OrganizationUsers from "../../components/organization/OrganizationUsers";
import UserFormModal from "../../components/organization/UserFormModal";

import type { OrganizationUser } from "../../components/organization/organization.types"

const initialUsers: OrganizationUser[] = [
  {
    id: "1",
    name: "Carlos Mendes",
    email: "carlos@empresa.com",
    department: "Administração",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2026-11-01",
  },
  {
    id: "2",
    name: "Ana Oliveira",
    email: "ana@empresa.com",
    department: "Logística",
    role: "OPERATOR",
    status: "ACTIVE",
    createdAt: "2026-11-02",
  },
  {
    id: "3",
    name: "Pedro Santos",
    email: "pedro@empresa.com",
    department: "Qualidade",
    role: "VIEWER",
    status: "INACTIVE",
    createdAt: "2026-11-03",
  },
  {
    id: "4",
    name: "Mariana Costa",
    email: "mariana@empresa.com",
    department: "Produção",
    role: "OPERATOR",
    status: "PENDING",
    createdAt: "2026-11-04",
  },
];

export default function OrganizationManagement() {
  const [users, setUsers] = useState<OrganizationUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] =
    useState<OrganizationUser | null>(null);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return users;

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.department.toLowerCase().includes(term)
    );
  }, [users, search]);

  const activeUsers = users.filter(
    (user) => user.status === "ACTIVE"
  ).length;

  const pendingUsers = users.filter(
    (user) => user.status === "PENDING"
  ).length;

  const administrators = users.filter(
    (user) => user.role === "ADMIN"
  ).length;

  const handleNewUser = () => {
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleEditUser = (user: OrganizationUser) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleSaveUser = (
    data: Omit<OrganizationUser, "id" | "createdAt">
  ) => {
    if (selectedUser) {
      setUsers((current) =>
        current.map((user) =>
          user.id === selectedUser.id
            ? { ...user, ...data }
            : user
        )
      );
      return;
    }

    const newUser: OrganizationUser = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    setUsers((current) => [newUser, ...current]);
  };

  const handleToggleStatus = (id: string) => {
    setUsers((current) =>
      current.map((user) => {
        if (user.id !== id) return user;

        return {
          ...user,
          status:
            user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        };
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={19} className="text-[#315cf5]" />
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Gestão da organização
            </h1>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Gerencie os usuários e os acessos da sua organização.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNewUser}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#315cf5] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2448c9]"
        >
          <Plus size={16} />
          Adicionar usuário
        </button>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Total de usuários"
          value={users.length}
          icon={Users}
          description="Usuários cadastrados"
        />

        <Metric
          label="Usuários ativos"
          value={activeUsers}
          icon={CheckCircle2}
          description="Com acesso liberado"
        />

        <Metric
          label="Administradores"
          value={administrators}
          icon={Building2}
          description="Com perfil administrativo"
        />

        <Metric
          label="Convites pendentes"
          value={pendingUsers}
          icon={Clock3}
          description="Aguardando ativação"
        />
      </div>

      {/* Listagem */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Usuários da organização
            </h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Consulte e gerencie os funcionários vinculados à empresa.
            </p>
          </div>

          <div className="relative w-full sm:w-[280px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar usuário..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition focus:border-[#315cf5] focus:bg-white"
            />
          </div>
        </div>

        <OrganizationUsers
          users={filteredUsers}
          onEdit={handleEditUser}
          onToggleStatus={handleToggleStatus}
        />

        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-[10px] text-slate-400">
            Exibindo {filteredUsers.length} de {users.length} usuários.
          </p>
        </div>
      </section>

      <UserFormModal
        open={modalOpen}
        user={selectedUser}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveUser}
      />
    </div>
  );
}

import type { LucideIcon } from "lucide-react";

function Metric({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">
            {value}
          </p>
        </div>

        <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-[#315cf5]">
          <Icon size={18} />
        </div>
      </div>

      <p className="mt-3 text-[10px] text-slate-400">
        {description}
      </p>
    </div>
  );
}
