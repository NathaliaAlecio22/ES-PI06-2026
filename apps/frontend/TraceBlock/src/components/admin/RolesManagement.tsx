import { ShieldCheck } from "lucide-react";
import type { AccessRole } from "./admin.types";

interface Props {
  roles: AccessRole[];
}

export default function RolesManagement({ roles }: Props) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {roles.map((role) => (
        <article key={role.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck size={21} />
            </span>

            <div>
              <h3 className="font-bold text-slate-900">{role.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{role.description}</p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              Permissões
            </p>

            <div className="flex flex-wrap gap-2">
              {role.permissions.map((permission) => (
                <span key={permission} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600">
                  {permission}
                </span>
              ))}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}