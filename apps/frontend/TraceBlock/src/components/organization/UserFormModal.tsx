
import { useEffect, useState, type FormEvent } from "react";
import { X, UserPlus } from "lucide-react";

import type {
  OrganizationUser,
  OrganizationUserRole,
} from "./organization.types";
import type { OrganizationUserInput } from "../../services/organization";

interface UserFormModalProps {
  open: boolean;
  user?: OrganizationUser | null;
  onClose: () => void;
  onSave: (user: OrganizationUserInput) => Promise<void>;
}

const initialForm = {
  name: "",
  email: "",
  phone: "",
  department: "",
  role: "OPERATOR" as OrganizationUserRole,
};

export default function UserFormModal({
  open,
  user,
  onClose,
  onSave,
}: UserFormModalProps) {
  const [form, setForm] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone ?? "",
        department: user.department,
        role: user.role,
      });
    } else {
      setForm(initialForm);
    }
    setError("");
  }, [user, open]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar o usuário.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#315cf5] focus:ring-2 focus:ring-blue-100";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus size={19} className="text-[#315cf5]" />
              <h2 className="text-base font-semibold text-slate-800">
                {user ? "Editar usuário" : "Convidar usuário"}
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              {user
                ? "Atualize os dados e as permissões do usuário."
                : "O usuário receberá um convite por e-mail para criar a senha."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Nome completo
            </label>

            <input
              required
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              placeholder="Ex.: João da Silva"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              E-mail corporativo
            </label>

            <input
              required
              type="email"
              readOnly={Boolean(user)}
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              placeholder="joao@empresa.com"
              className={`${inputClass} read-only:bg-slate-50`}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Telefone
            </label>

            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(00) 00000-0000"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Departamento
            </label>

            <input
              value={form.department}
              onChange={(e) =>
                setForm({ ...form, department: e.target.value })
              }
              placeholder="Ex.: Logística"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Perfil de acesso
            </label>

            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value as OrganizationUserRole,
                })
              }
              className={inputClass}
            >
              <option value="ADMIN">Administrador</option>
              <option value="OPERATOR">Operador</option>
              <option value="VIEWER">Consulta</option>
            </select>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-[#315cf5] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2448c9] disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving
                ? "Salvando..."
                : user
                  ? "Salvar alterações"
                  : "Enviar convite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
