import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Plus,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import ActivityLogs, { type ActivityLog } from "../../components/admin/ActivityLogs";
import OrganizationUserModal from "../../components/admin/OrganizationUserModal";
import OrganizationUsers from "../../components/participantes/ParticipanteUsers";
import RolesManagement from "../../components/admin/RolesManagement";
import type { AccessRole } from "../../components/admin/admin.types";
import type {
  OrganizationUser,
} from "../../components/participantes/participantes.types";
import {
  alterarStatusUsuario,
  atualizarUsuarioOrganizacao,
  cancelarConviteUsuario,
  convidarUsuario,
  listarUsuariosOrganizacao,
  type OrganizationUserInput,
  type OrganizationUsersResult,
} from "../../services/organization";

const roleDetails: AccessRole[] = [
  {
    id: "ADMIN",
    name: "Administrador",
    description: "Administra os funcionários e os acessos da própria organização.",
    permissions: [
      "Convidar funcionários",
      "Gerenciar perfis e acessos",
      "Gerenciar produtos e lotes",
      "Realizar transferências",
      "Consultar relatórios e atividades",
    ],
  },
  {
    id: "OPERATOR",
    name: "Operador",
    description: "Executa as operações diárias da organização.",
    permissions: [
      "Gerenciar produtos e lotes",
      "Realizar transferências",
      "Acompanhar cadeia de custódia",
      "Consultar relatórios",
    ],
  },
  {
    id: "VIEWER",
    name: "Consulta",
    description: "Acompanha informações sem alterar dados ou gerenciar pessoas.",
    permissions: [
      "Consultar produtos e lotes",
      "Consultar transferências",
      "Acompanhar cadeia de custódia",
      "Consultar relatórios",
    ],
  },
];

const tabs = [
  "Usuários da empresa",
  "Perfis e permissões",
  "Atividades recentes",
] as const;

type AdminTab = (typeof tabs)[number];

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function OrganizationAdminPage() {
  const [data, setData] = useState<OrganizationUsersResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationUser | undefined>();
  const [activeTab, setActiveTab] = useState<AdminTab>("Usuários da empresa");

  const reload = useCallback(async () => {
    const result = await listarUsuariosOrganizacao();
    setData(result);
    return result;
  }, []);

  useEffect(() => {
    let active = true;
    listarUsuariosOrganizacao()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar os funcionários da organização.",
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

  async function saveUser(input: OrganizationUserInput) {
    setError("");
    setSuccess("");

    if (editingUser) {
      await atualizarUsuarioOrganizacao(editingUser.id.replace(/^user:/, ""), input);
      await reload();
      setSuccess(`Os dados de ${input.name} foram atualizados.`);
    } else {
      const invitation = await convidarUsuario(input);
      await reload();
      setSuccess(`Convite enviado para ${invitation.email} criar uma senha.`);
    }

    setModalOpen(false);
    setEditingUser(undefined);
  }

  async function toggleUserStatus(user: OrganizationUser) {
    setError("");
    setSuccess("");
    try {
      await alterarStatusUsuario(
        user.id.replace(/^user:/, ""),
        user.status !== "ACTIVE",
      );
      await reload();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível alterar o status do funcionário.",
      );
    }
  }

  async function cancelInvitation(user: OrganizationUser) {
    setError("");
    setSuccess("");
    try {
      await cancelarConviteUsuario(user.id.replace(/^invite:/, ""));
      await reload();
      setSuccess(`O convite para ${user.email} foi cancelado.`);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível cancelar o convite.",
      );
    }
  }

  function openCreateModal() {
    setError("");
    setSuccess("");
    setEditingUser(undefined);
    setModalOpen(true);
  }

  function openEditModal(user: OrganizationUser) {
    setError("");
    setSuccess("");
    setEditingUser(user);
    setModalOpen(true);
  }

  const activities: ActivityLog[] = (data?.activities ?? []).map((activity) => ({
    id: activity.id,
    user: activity.user,
    action: activity.action,
    description: activity.description,
    date: formatActivityDate(activity.occurredAt),
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
            <ShieldCheck size={15} />
            Gestão da organização
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Usuários da empresa
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Funcionários, perfis e atividades de {data?.organization.name ?? "sua organização"}.
          </p>
        </div>

        {activeTab === "Usuários da empresa" && data?.permissions.canManageUsers && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={17} />
            Adicionar funcionário
          </button>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      {isLoading ? (
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Carregando usuários da organização...
        </p>
      ) : data ? (
        <>
          <section aria-label={`Resumo de ${data.organization.name}`} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Organização" value={data.organization.name} icon={Building2} />
            <Metric label="Funcionários" value={data.stats.total} icon={Users} />
            <Metric label="Acessos ativos" value={data.stats.active} icon={CheckCircle2} />
            <Metric label="Convites pendentes" value={data.stats.pendingInvitations} icon={Clock3} />
          </section>

          <nav
            aria-label="Seções da administração da organização"
            className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white px-2"
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                aria-current={activeTab === tab ? "page" : undefined}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 border-b-2 px-4 py-4 text-sm font-semibold transition ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          {activeTab === "Usuários da empresa" && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Funcionários</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {data.organization.type || "Organização"} · Somente usuários vinculados a esta empresa.
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {data.stats.administrators} {data.stats.administrators === 1 ? "administrador" : "administradores"}
                </span>
              </div>

              <OrganizationUsers
                users={data.users}
                canManageUsers={data.permissions.canManageUsers}
                onEdit={openEditModal}
                onToggleStatus={toggleUserStatus}
                onCancelInvitation={cancelInvitation}
              />
            </section>
          )}

          {activeTab === "Perfis e permissões" && (
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">Perfis e permissões</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Os acessos disponíveis para os funcionários desta organização.
                </p>
              </div>
              <RolesManagement roles={roleDetails} />
            </section>
          )}

          {activeTab === "Atividades recentes" && (
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">Atividades recentes</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Convites enviados e aceitos nesta organização.
                </p>
              </div>
              <ActivityLogs activities={activities} />
            </section>
          )}
        </>
      ) : (
        <p role="alert" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Não foi possível carregar os dados da organização.
        </p>
      )}

      {modalOpen && (
        <OrganizationUserModal
          user={editingUser}
          onClose={() => setModalOpen(false)}
          onSave={saveUser}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <article className="flex min-h-28 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <strong className={`mt-2 block truncate font-bold text-slate-900 ${typeof value === "number" ? "text-2xl" : "text-base"}`}>
          {value}
        </strong>
      </div>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={21} />
      </span>
    </article>
  );
}
