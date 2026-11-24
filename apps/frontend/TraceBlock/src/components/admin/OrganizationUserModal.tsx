import { useState, type FormEvent } from "react";
import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react";

import AdminModal from "./AdminModal";
import type {
  OrganizationUser,
  OrganizationUserRole,
} from "../participantes/participantes.types";
import type { OrganizationUserInput } from "../../services/organization";

interface Props {
  user?: OrganizationUser;
  onClose: () => void;
  onSave: (input: OrganizationUserInput) => Promise<void>;
}

const roleLabels: Record<OrganizationUserRole, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  VIEWER: "Consulta",
};

export default function OrganizationUserModal({ user, onClose, onSave }: Props) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [role, setRole] = useState<OrganizationUserRole>(user?.role ?? "OPERATOR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await onSave({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department: department.trim(),
        role,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar o usuário.",
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <AdminModal
      title={user ? "Editar funcionário" : "Adicionar funcionário"}
      description={
        user
          ? "Atualize os dados e o perfil de acesso deste funcionário."
          : "Enviaremos um convite para criar uma senha e ativar o acesso."
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-xs font-semibold text-slate-700">
          <span className="flex items-center gap-2">
            <UserRound size={14} /> Nome completo
          </span>
          <input
            required
            minLength={2}
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            autoComplete="name"
          />
        </label>

        <label className="block text-xs font-semibold text-slate-700">
          <span className="flex items-center gap-2">
            <Mail size={14} /> E-mail
          </span>
          <input
            required
            type="email"
            maxLength={150}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            readOnly={Boolean(user)}
            className={`${inputClass} read-only:bg-slate-50 read-only:text-slate-500`}
            autoComplete="email"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-2">
              <Phone size={14} /> Telefone
            </span>
            <input
              maxLength={30}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClass}
              autoComplete="tel"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Departamento
            <input
              required
              minLength={2}
              maxLength={100}
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <label className="block text-xs font-semibold text-slate-700">
          <span className="flex items-center gap-2">
            <ShieldCheck size={14} /> Perfil de acesso
          </span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as OrganizationUserRole)}
            className={inputClass}
          >
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        {!user && (
          <p className="rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
            O funcionário receberá um e-mail com um link para criar a própria senha.
          </p>
        )}

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Salvando..." : user ? "Salvar alterações" : "Enviar convite"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
