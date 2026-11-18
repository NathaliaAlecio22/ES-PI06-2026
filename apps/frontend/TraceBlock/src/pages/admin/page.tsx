import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";

import AdminTabs from "../../components/admin/AdminTabs";
import AdminOverview from "../../components/admin/AdminOverview";
import UsersManagement from "../../components/admin/AdminManagement";
import OrganizationsManagement from "../../components/admin/OrganizationsManagement";
import RolesManagement from "../../components/admin/RolesManagement";
import ActivityLogs, { type ActivityLog } from "../../components/admin/ActivityLogs";

import type {
  AdminTab,
  AdminUser,
  Organization,
  AccessRole,
} from "../../components/admin/admin.types";

const initialUsers: AdminUser[] = [
  {
    id: "1",
    name: "Marina Rocha",
    email: "marina@agromarket.com.br",
    organization: "AgroMarket Brasil",
    role: "Administrador",
    lastAccess: "Agora",
    status: "Ativo",
  },
  {
    id: "2",
    name: "Roberto Lima",
    email: "roberto@translog.com.br",
    organization: "TransLog Brasil",
    role: "Operador",
    lastAccess: "Hoje, 14:32",
    status: "Ativo",
  },
  {
    id: "3",
    name: "Carla Nunes",
    email: "carla@cqagro.com.br",
    organization: "Controle Qualidade Agro",
    role: "Auditor",
    lastAccess: "Ontem, 17:48",
    status: "Ativo",
  },
];

const initialOrganizations: Organization[] = [
  {
    id: "1",
    name: "AgroMarket Brasil",
    cnpj: "12.345.678/0001-90",
    type: "Fabricante",
    city: "Campinas, SP",
    status: "Ativo",
  },
  {
    id: "2",
    name: "TransLog Brasil",
    cnpj: "23.456.789/0001-10",
    type: "Transportadora",
    city: "São Paulo, SP",
    status: "Ativo",
  },
  {
    id: "3",
    name: "Controle Qualidade Agro",
    cnpj: "34.567.890/0001-20",
    type: "Auditoria",
    city: "Jundiaí, SP",
    status: "Ativo",
  },
];

const initialRoles: AccessRole[] = [
  {
    id: "1",
    name: "Administrador",
    description: "Acesso administrativo completo à plataforma.",
    permissions: ["Usuários", "Organizações", "Perfis", "Produtos", "Relatórios"],
  },
  {
    id: "2",
    name: "Operador",
    description: "Gerencia as operações e movimentações.",
    permissions: ["Produtos", "Transferências", "Cadeia de custódia"],
  },
  {
    id: "3",
    name: "Auditor",
    description: "Consulta registros e acompanha a rastreabilidade.",
    permissions: ["Histórico Blockchain", "Relatórios", "Cadeia de custódia"],
  },
  {
    id: "4",
    name: "Visualizador",
    description: "Acesso somente para consulta de informações.",
    permissions: ["Visão geral", "Produtos", "Relatórios"],
  },
];

const initialActivities: ActivityLog[] = [
  {
    id: "1",
    user: "Marina Rocha",
    action: "Usuário cadastrado",
    description: "Um novo usuário foi adicionado à plataforma.",
    date: "Hoje, 14:32",
  },
  {
    id: "2",
    user: "Marina Rocha",
    action: "Organização atualizada",
    description: "Os dados de uma organização foram atualizados.",
    date: "Hoje, 11:18",
  },
  {
    id: "3",
    user: "Roberto Lima",
    action: "Acesso realizado",
    description: "O usuário entrou na plataforma.",
    date: "Hoje, 09:45",
  },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("Usuários");

  const [users, setUsers] = useState(initialUsers);
  const [organizations, setOrganizations] = useState(initialOrganizations);

  const [activities, setActivities] = useState(initialActivities);

  function saveUser(user: AdminUser) {
    setUsers((current) => {
      const exists = current.some((item) => item.id === user.id);

      return exists
        ? current.map((item) => item.id === user.id ? user : item)
        : [...current, user];
    });

    setActivities((current) => [
      {
        id: crypto.randomUUID(),
        user: "Administrador",
        action: "Usuário salvo",
        description: `Os dados de ${user.name} foram salvos.`,
        date: "Agora",
      },
      ...current,
    ]);
  }

  function toggleUserStatus(id: string) {
    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? { ...user, status: user.status === "Ativo" ? "Inativo" : "Ativo" }
          : user,
      ),
    );
  }

  function saveOrganization(organization: Organization) {
    setOrganizations((current) => {
      const exists = current.some((item) => item.id === organization.id);

      return exists
        ? current.map((item) => item.id === organization.id ? organization : item)
        : [...current, organization];
    });
  }

  const pending = users.filter((user) => user.status === "Pendente").length;

  return (
    <>
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
            <ShieldCheck size={15} />
            Gestão da plataforma
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Administração
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Gerencie usuários, organizações, perfis e permissões do TraceBlock.
          </p>
        </div>

        {activeTab === "Usuários" && (
          <button
            onClick={() => {
              // A abertura do formulário é controlada pelo UsersManagement.
              // O botão de cadastro fica dentro da própria aba.
              setActiveTab("Usuários");
            }}
            className="hidden items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={17} />
            Adicionar usuário
          </button>
        )}
      </header>

      <AdminOverview
        users={users.length}
        organizations={organizations.length}
        roles={initialRoles.length}
        pending={pending}
      />

      <AdminTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "Usuários" && (
        <UsersManagement
          users={users}
          onSave={saveUser}
          onToggleStatus={toggleUserStatus}
        />
      )}

      {activeTab === "Organizações" && (
        <OrganizationsManagement
          organizations={organizations}
          onSave={saveOrganization}
        />
      )}

      {activeTab === "Perfis e permissões" && (
        <RolesManagement roles={initialRoles} />
      )}

      {activeTab === "Atividades" && (
        <ActivityLogs activities={activities} />
      )}
    </>
  );
}