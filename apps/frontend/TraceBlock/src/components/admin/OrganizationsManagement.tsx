import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Organization } from "./admin.types";
import AdminModal from "./AdminModal";

interface Props {
  organizations: Organization[];
  onSave: (organization: Organization) => void;
}

const emptyOrganization: Organization = {
  id: "",
  name: "",
  cnpj: "",
  type: "Fabricante",
  city: "",
  status: "Pendente",
};

export default function OrganizationsManagement({ organizations, onSave }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyOrganization);

  const filtered = useMemo(
    () =>
      organizations.filter((org) =>
        `${org.name} ${org.cnpj} ${org.city} ${org.type}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [organizations, search],
  );

  function save(event: React.FormEvent) {
    event.preventDefault();
    onSave({ ...form, id: form.id || crypto.randomUUID() });
    setOpen(false);
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:justify-between">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 sm:w-80">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar organizações..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          <button
            onClick={() => {
              setForm(emptyOrganization);
              setOpen(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={17} /> Adicionar organização
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Organização</th>
                <th className="px-5 py-4">CNPJ</th>
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4">Localização</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-semibold text-slate-800">{org.name}</td>
                  <td className="px-5 py-4 text-slate-600">{org.cnpj}</td>
                  <td className="px-5 py-4 text-slate-600">{org.type}</td>
                  <td className="px-5 py-4 text-slate-600">{org.city}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {org.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    Nenhuma organização encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {open && (
        <AdminModal
          title="Nova organização"
          description="Cadastre uma organização na plataforma."
          onClose={() => setOpen(false)}
        >
          <form onSubmit={save} className="space-y-4">
            {[
              { label: "Nome", key: "name", placeholder: "Razão social" },
              { label: "CNPJ", key: "cnpj", placeholder: "00.000.000/0000-00" },
              { label: "Cidade", key: "city", placeholder: "Cidade - UF" },
            ].map((field) => (
              <label key={field.key} className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">{field.label}</span>
                <input
                  required
                  value={form[field.key as keyof Organization] as string}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                />
              </label>
            ))}

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Tipo de participante</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option>Fabricante</option>
                <option>Distribuidor</option>
                <option>Transportadora</option>
                <option>Centro de armazenamento</option>
                <option>Varejista</option>
              </select>
            </label>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">
                Cancelar
              </button>
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Salvar organização
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  );
}