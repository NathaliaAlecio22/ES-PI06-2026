import { useEffect, useMemo, useState } from "react";
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
import type { OrganizationUser } from "../../components/organization/organization.types";
import {
  alterarStatusUsuario,
  atualizarUsuarioOrganizacao,
  cancelarConviteUsuario,
  convidarUsuario,
  listarUsuariosOrganizacao,
  type OrganizationUserInput,
  type OrganizationUserStats,
} from "../../services/organization";

const emptyStats: OrganizationUserStats = {
  total: 0,
  active: 0,
  administrators: 0,
  pendingInvitations: 0,
};

export default function OrganizationManagement() {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [stats, setStats] = useState(emptyStats);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUsers() {
    const result = await listarUsuariosOrganizacao();
    setUsers(result.users);
    setStats(result.stats);
    setCanManageUsers(result.permissions.canManageUsers);
  }

  useEffect(() => {
    let active = true;
    listarUsuariosOrganizacao()
      .then((result) => {
        if (!active) return;
        setUsers(result.users);
        setStats(result.stats);
        setCanManageUsers(result.permissions.canManageUsers);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar os usuários.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.department.toLowerCase().includes(term),
    );
  }, [users, search]);

  const handleSaveUser = async (data: OrganizationUserInput) => {
    if (selectedUser) {
      const id = selectedUser.id.replace(/^user:/, "");
      await atualizarUsuarioOrganizacao(id, data);
    } else {
      await convidarUsuario(data);
    }

    await loadUsers();
  };

  const handleToggleStatus = async (user: OrganizationUser) => {
    setError("");
    try {
      const id = user.id.replace(/^user:/, "");
      await alterarStatusUsuario(id, user.status !== "ACTIVE");
      await loadUsers();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Não foi possível alterar o status do usuário.",
      );
    }
  };

  const handleCancelInvitation = async (user: OrganizationUser) => {
    setError("");
    try {
      const id = user.id.replace(/^invite:/, "");
      await cancelarConviteUsuario(id);
      await loadUsers();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Não foi possível cancelar o convite.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={19} className="text-[#315cf5]" />
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Gestão da organização
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Gerencie os usuários, convites e permissões da sua organização.
          </p>
        </div>

        {canManageUsers && (
          <button
            type="button"
            onClick={() => {
              setSelectedUser(null);
              setModalOpen(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#315cf5] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2448c9]"
          >
            <Plus size={16} />
            Convidar usuário
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total de usuários" value={stats.total} icon={Users} description="Contas da organização" />
        <Metric label="Usuários ativos" value={stats.active} icon={CheckCircle2} description="Com acesso liberado" />
        <Metric label="Administradores" value={stats.administrators} icon={Building2} description="Com perfil administrativo" />
        <Metric label="Convites pendentes" value={stats.pendingInvitations} icon={Clock3} description="Aguardando aceitação" />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Usuários da organização
            </h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Consulte usuários, perfis de acesso e convites enviados.
            </p>
          </div>

          <div className="relative w-full sm:w-[280px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar usuário..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition focus:border-[#315cf5] focus:bg-white"
            />
          </div>
        </div>

        {isLoading ? (
          <p role="status" className="p-8 text-center text-sm text-slate-500">
            Carregando usuários...
          </p>
        ) : (
          <>
            <OrganizationUsers
              users={filteredUsers}
              canManageUsers={canManageUsers}
              onEdit={(user) => {
                setSelectedUser(user);
                setModalOpen(true);
              }}
              onToggleStatus={(user) => void handleToggleStatus(user)}
              onCancelInvitation={(user) => void handleCancelInvitation(user)}
            />
            <div className="border-t border-slate-100 px-5 py-3">
              <p className="text-[10px] text-slate-400">
                Exibindo {filteredUsers.length} de {users.length} registros.
              </p>
            </div>
          </>
        )}
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
          <p className="text-[11px] font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">
            {value}
          </p>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-[#315cf5]">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-[10px] text-slate-400">{description}</p>
    </div>
  );
}
