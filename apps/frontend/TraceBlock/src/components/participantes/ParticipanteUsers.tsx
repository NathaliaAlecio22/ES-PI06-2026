
import {
  Ban,
  Pencil,
  Power,
  UserRound,
} from "lucide-react";

import type {
  OrganizationUser,
  OrganizationUserRole,
} from "./participantes.types";

interface OrganizationUsersProps {
  users: OrganizationUser[];
  canManageUsers: boolean;
  onEdit: (user: OrganizationUser) => void;
  onToggleStatus: (user: OrganizationUser) => void;
  onCancelInvitation: (user: OrganizationUser) => void;
}

const roleLabels: Record<OrganizationUserRole, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  VIEWER: "Consulta",
};

export default function OrganizationUsers({
  users,
  canManageUsers,
  onEdit,
  onToggleStatus,
  onCancelInvitation,
}: OrganizationUsersProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              {["Usuário", "Departamento", "Perfil", "Status", "Ações"].map(
                (heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="transition hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#315cf5]">
                      <UserRound size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {user.name}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-slate-400">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4 text-xs text-slate-600">
                  {user.department || "Não informado"}
                </td>

                <td className="px-5 py-4">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
                    {roleLabels[user.role]}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      user.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : user.status === "PENDING"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {user.status === "ACTIVE"
                      ? "Ativo"
                      : user.status === "PENDING"
                        ? "Pendente"
                        : user.status === "EXPIRED"
                          ? "Convite expirado"
                          : "Inativo"}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    {canManageUsers && user.id.startsWith("user:") && (
                      <>
                        <button
                          type="button"
                          title="Editar usuário e permissões"
                          onClick={() => onEdit(user)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-[#315cf5]"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          title={
                            user.status === "ACTIVE"
                              ? "Desativar usuário"
                              : "Ativar usuário"
                          }
                          onClick={() => onToggleStatus(user)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Power size={15} />
                        </button>
                      </>
                    )}
                    {canManageUsers && user.id.startsWith("invite:") && (
                      <>
                        <span className="px-2 text-[10px] text-slate-400">
                          Convite por e-mail
                        </span>
                        {user.status === "PENDING" && (
                          <button
                            type="button"
                            title="Cancelar convite"
                            aria-label={`Cancelar convite para ${user.email}`}
                            onClick={() => onCancelInvitation(user)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Ban size={15} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <p className="text-sm font-semibold text-slate-600">
                    Nenhum usuário encontrado
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Tente alterar sua pesquisa ou cadastre um novo usuário.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}