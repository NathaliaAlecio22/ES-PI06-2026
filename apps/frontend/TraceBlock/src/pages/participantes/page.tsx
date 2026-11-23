import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  PackageOpen,
  Plus,
  Search,
  type LucideIcon,
} from "lucide-react";

import ParticipantesLista from "../../components/participantes/ParticipantesLista";
import ParticipantFormModal from "../../components/participantes/ParticipantesFormModal";
import type {
  Participant,
  ParticipantFormData,
  ParticipantStats,
} from "../../components/participantes/participantes.types";
import { convidarOrganizacaoParticipante, listarOrganizacoesParticipantes } from "../../services/participantes";

const emptyStats: ParticipantStats = {
  total: 0,
  active: 0,
  pendingInvitations: 0,
  lots: 0,
};

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState(emptyStats);
  const [canManageParticipants, setCanManageParticipants] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    listarOrganizacoesParticipantes()
      .then((result) => {
        if (!active) return;
        setParticipants(result.participants);
        setStats(result.stats);
        setCanManageParticipants(result.permissions.canManageParticipants);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar as organizações participantes.",
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

  const filteredParticipants = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return participants;
    return participants.filter((participant) =>
      [
        participant.name,
        participant.cnpj,
        participant.type,
        participant.person,
        participant.email,
      ].some((value) => value.toLowerCase().includes(term)),
    );
  }, [participants, search]);

  async function handleSaveParticipant(data: ParticipantFormData) {
    setError("");
    setSuccess("");
    const participant = await convidarOrganizacaoParticipante(data);
    setParticipants((current) => [participant, ...current]);
    setStats((current) => ({
      ...current,
      total: current.total + 1,
      pendingInvitations: current.pendingInvitations + 1,
    }));
    setFormOpen(false);
    setSuccess(
      `Organização ${participant.name} cadastrada. O convite foi enviado para ${participant.email}.`,
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Participantes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulte e cadastre as organizações participantes da cadeia de suprimentos.
          </p>
        </div>
        {canManageParticipants && (
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setFormOpen(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={17} />
            Cadastrar participante
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Organizações" value={stats.total} icon={Building2} />
        <Metric label="Ativas" value={stats.active} icon={CheckCircle2} />
        <Metric label="Convites pendentes" value={stats.pendingInvitations} icon={Clock3} />
        <Metric label="Lotes vinculados" value={stats.lots} icon={PackageOpen} />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Organizações participantes
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              A lista mostra empresas, não os usuários individuais de cada organização.
            </p>
          </div>
          <div className="relative w-full sm:w-[300px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar organização, CNPJ ou responsável..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {isLoading ? (
          <p role="status" className="p-8 text-center text-sm text-slate-500">
            Carregando organizações...
          </p>
        ) : (
          <ParticipantesLista participants={filteredParticipants} />
        )}
      </section>

      <ParticipantFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveParticipant}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
        <Icon size={19} />
      </span>
      <div>
        <p className="text-xl font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-1.5 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
