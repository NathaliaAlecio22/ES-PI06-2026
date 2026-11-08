import { useMemo, useState } from "react";
import { Plus, X, Building2, Mail, PackageOpen, Fingerprint } from "lucide-react";

import ParticipantStats from "../../components/participantes/ParticipantesStats";
import ParticipantFilters from "../../components/participantes/ParticipantesFilters";
import ParticipantsTable from "../../components/participantes/ParticipantesTable";
import ParticipantFormModal from "../../components/participantes/ParticipantesFormModal";

import { initialParticipants } from "../../components/participantes/participantes.data";

import type { Participant } from "../../components/participantes/participantes.types";

export default function ParticipantsPage() {
  const [participants, setParticipants] =
    useState<Participant[]>(initialParticipants);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);

  const filteredParticipants = useMemo(() => {
    return participants.filter((participant) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        participant.name.toLowerCase().includes(searchValue) ||
        participant.person.toLowerCase().includes(searchValue) ||
        participant.cnpj.includes(searchValue) ||
        participant.email.toLowerCase().includes(searchValue);

      const matchesType = !type || participant.type === type;
      const matchesStatus = !status || participant.status === status;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [participants, search, type, status]);

  function handleSaveParticipant(participant: Participant) {
    const duplicateCnpj = participants.some(
      (item) => item.cnpj.replace(/\D/g, "") ===
        participant.cnpj.replace(/\D/g, "")
    );

    if (duplicateCnpj) {
      window.alert("Já existe um participante cadastrado com esse CNPJ.");
      return;
    }

    setParticipants((previous) => [participant, ...previous]);
    setFormOpen(false);
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1730]">
            Participantes
          </h1>

          <p className="mt-1.5 text-xs text-slate-500">
            Gerencie as organizações autorizadas na cadeia de suprimentos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg border border-blue-600 bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:border-blue-700 hover:bg-blue-700"
        >
          <Plus size={16} />
          Cadastrar participante
        </button>
      </div>

      {/* Indicadores */}
      <ParticipantStats />

      {/* Filtros e tabela */}
      <section className="min-h-[470px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Organizações cadastradas
            </h2>

            <p className="mt-1 text-[11px] text-slate-500">
              Consulte os participantes e suas respectivas autorizações.
            </p>
          </div>

          <ParticipantFilters
            search={search}
            setSearch={setSearch}
            type={type}
            setType={setType}
            status={status}
            setStatus={setStatus}
          />
        </div>

        <ParticipantsTable
          participants={filteredParticipants}
          onSelect={setSelectedParticipant}
        />
      </section>

      {/* Modal de cadastro */}
      {formOpen && (
        <ParticipantFormModal
          onClose={() => setFormOpen(false)}
          onSave={handleSaveParticipant}
        />
      )}

      {/* Modal de detalhes */}
      {selectedParticipant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedParticipant(null);
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <span className="text-[9px] font-bold tracking-wider text-blue-600">
                  TRACEBLOCK
                </span>

                <h2 className="mt-1 text-lg font-bold text-[#0b1730]">
                  Detalhes do participante
                </h2>
              </div>

              <button
                onClick={() => setSelectedParticipant(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700">
                  {selectedParticipant.initials}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {selectedParticipant.name}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedParticipant.type}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-[10px] text-slate-400">CNPJ</span>
                  <p className="mt-1 text-xs font-medium text-slate-700">
                    {selectedParticipant.cnpj}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400">
                    Responsável
                  </span>
                  <p className="mt-1 text-xs font-medium text-slate-700">
                    {selectedParticipant.person}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-400">E-mail</span>
                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-700">
                    <Mail size={14} className="text-slate-400" />
                    {selectedParticipant.email}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400">
                    Localização
                  </span>
                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-700">
                    <Building2 size={14} className="text-slate-400" />
                    {selectedParticipant.address || "Não informado"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400">
                    Lotes vinculados
                  </span>
                  <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <PackageOpen size={14} className="text-slate-400" />
                    {selectedParticipant.lots}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-400">
                    Identificação digital
                  </span>
                  <p className="mt-1 flex items-center gap-2 break-all font-mono text-xs text-slate-700">
                    <Fingerprint size={14} className="shrink-0 text-slate-400" />
                    {selectedParticipant.digitalId}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="text-[10px] text-slate-400">
                  Status de autorização
                </span>

                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {selectedParticipant.status}
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <button
                onClick={() => setSelectedParticipant(null)}
                className="h-9 rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}