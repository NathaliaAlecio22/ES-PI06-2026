import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import type { AdminUser } from "./admin.types";
import AdminModal from "./AdminModal";

interface UsersManagementProps {
  users: AdminUser[];
  onSave: (user: AdminUser) => void;
  onToggleStatus: (id: string) => void;
}

const emptyUser: AdminUser = {
  id: "",
  name: "",
  email: "",
  organization: "",
  role: "Operador",
  lastAccess: "Nunca",
  status: "Pendente",
};

function Status({ status }: { status: AdminUser["status"] }) {
  const styles = {
    Ativo: "bg-emerald-50 text-emerald-700",
    Pendente: "bg-amber-50 text-amber-700",
    Inativo: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function UsersManagement({
  users,
  onSave,
  onToggleStatus,
}: UsersManagementProps) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser>(emptyUser);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase();

    return users.filter((user) =>
      [user.name, user.email, user.organization, user.role]
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [users, search]);

  function openCreate() {
    setEditing(emptyUser);
    setModalOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditing(user);
    setModalOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSave({
      ...editing,
      id: editing.id || crypto.randomUUID(),
    });

    setModalOpen(false);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 px-3 sm:max-w-sm">
          <Search size={17} className="text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar usuários..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>

        <button
          onClick={openCreate}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={17} />
          Adicionar usuário
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Usuário</th>
              <th className="px-5 py-4">Organização</th>
              <th className="px-5 py-4">Perfil</th>
              <th className="px-5 py-4">Último acesso</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                      {user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                    </span>

                    <div>
                      <p className="font-semibold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4 text-slate-600">{user.organization}</td>
                <td className="px-5 py-4 text-slate-600">{user.role}</td>
                <td className="px-5 py-4 text-slate-500">{user.lastAccess}</td>
                <td className="px-5 py-4"><Status status={user.status} /></td>

                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(user)}
                      className="rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => onToggleStatus(user.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title={user.status === "Ativo" ? "Desativar usuário" : "Ativar usuário"}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <AdminModal
          title={editing.id ? "Editar usuário" : "Adicionar usuário"}
          description="Preencha os dados de acesso do usuário."
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Nome completo</span>
              <input
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Nome do usuário"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">E-mail</span>
              <input
                required
                type="email"
                value={editing.email}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="usuario@empresa.com.br"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Organização</span>
              <input
                required
                value={editing.organization}
                onChange={(e) => setEditing({ ...editing, organization: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Nome da organização"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Perfil de acesso</span>
              <select
                value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              >
                <option>Administrador</option>
                <option>Operador</option>
                <option>Auditor</option>
                <option>Visualizador</option>
              </select>
            </label>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Salvar usuário
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </section>
  );
}