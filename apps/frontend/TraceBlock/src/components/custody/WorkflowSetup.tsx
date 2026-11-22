import { useEffect, useState } from "react";
import { Plus, ShieldCheck, Trash2, Wallet } from "lucide-react";

import { getUsuario } from "../../services/auth";
import {
  buscarOpcoesWorkflow,
  criarWorkflow,
  type WorkflowDefinition,
  type WorkflowParticipantOption,
} from "../../services/workflows";

type StageDraft = {
  name: string;
  participantId: string;
  specification: string;
};

const emptyStage = (): StageDraft => ({
  name: "",
  participantId: "",
  specification: "",
});

export default function WorkflowSetup() {
  const [organizationId, setOrganizationId] = useState("");
  const [participants, setParticipants] = useState<WorkflowParticipantOption[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [stages, setStages] = useState<StageDraft[]>([emptyStage(), emptyStage()]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const user = getUsuario();
  const canManage = user?.perfil === "ADMINISTRADOR" || user?.perfil === "ADMIN";

  useEffect(() => {
    let active = true;
    buscarOpcoesWorkflow()
      .then((result) => {
        if (!active) return;
        setOrganizationId(result.organizationId);
        setParticipants(result.participants);
        setWorkflow(result.workflow);
        if (!result.workflow) {
          setStages((current) => current.map((stage, index) => {
            if (index !== 0) return stage;
            const ownParticipant = result.participants.find(
              (participant) => participant.id === result.organizationId,
            );
            return { ...stage, participantId: ownParticipant?.id ?? "" };
          }));
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a configuração da cadeia.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateStage = (index: number, patch: Partial<StageDraft>) => {
    setStages((current) => current.map((stage, stageIndex) =>
      stageIndex === index ? { ...stage, ...patch } : stage,
    ));
  };

  const handleCreate = async () => {
    setError("");
    const ownParticipant = participants.find((participant) => participant.id === organizationId);
    if (!ownParticipant) {
      setError("Cadastre a carteira da sua organização antes de definir a cadeia.");
      return;
    }

    setSaving(true);
    try {
      const steps = await Promise.all(stages.map(async (stage) => {
        const participant = participants.find((option) => option.id === stage.participantId);
        if (!participant) throw new Error("Selecione um participante ativo para cada etapa.");
        if (!participant.address) {
          throw new Error(`Cadastre a carteira de ${participant.name} antes de atribuir essa etapa.`);
        }
        if (!stage.name.trim() || !stage.specification.trim()) {
          throw new Error("Informe o nome e os dados exigidos em cada etapa.");
        }
        return {
          name: stage.name.trim(),
          requiredRole: participant.role,
          assignee: participant.address,
          specification: stage.specification.trim(),
        };
      }));

      const created = await criarWorkflow({
        name: name.trim(),
        steps,
      });
      setWorkflow(created);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Não foi possível criar a cadeia.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
          <ShieldCheck size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900">Etapas e responsáveis</h2>
          <p className="mt-1 text-xs text-slate-500">
            A cadeia é definida uma vez por organização e sua sequência fica registrada na blockchain.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      )}

      {workflow ? (
        <div className="mt-5 space-y-3">
          {workflow.steps.map((step, index) => {
            const participant = participants.find(
              (item) => item.address?.toLowerCase() === step.assignee.toLowerCase(),
            );
            return (
              <div key={`${step.name}-${index}`} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{step.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {participant?.name ?? step.assignee} · {step.requiredRole}
                  </p>
                </div>
                <Wallet size={15} className="mt-1 shrink-0 text-slate-400" />
              </div>
            );
          })}
          <p className="break-all pt-1 font-mono text-[10px] text-slate-400">
            Contrato: {workflow.workflowAddress}
          </p>
          <p className="text-xs text-slate-500">
            A sequência já está em uso e não pode ser editada. Alterações exigem uma nova cadeia.
          </p>
        </div>
      ) : canManage ? (
        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="workflow-name" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Nome da cadeia
            </label>
            <input
              id="workflow-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              placeholder="Ex.: Cadeia de distribuição"
            />
          </div>

          {stages.map((stage, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">Etapa {index + 1}</p>
                {index > 0 && (
                  <button
                    type="button"
                    aria-label={`Remover etapa ${index + 1}`}
                    onClick={() => setStages((current) => current.filter((_, item) => item !== index))}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-600">
                  Nome
                  <input
                    value={stage.name}
                    onChange={(event) => updateStage(index, { name: event.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-700 outline-none focus:border-blue-500"
                    placeholder="Ex.: Fabricação"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Organização responsável
                  <select
                    value={stage.participantId}
                    disabled={index === 0}
                    onChange={(event) => updateStage(index, { participantId: event.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-50"
                  >
                    <option value="">Selecione</option>
                    {participants.map((participant) => (
                      <option
                        key={participant.id}
                        value={participant.id}
                        disabled={!participant.address}
                      >
                        {participant.name} ({participant.role}){participant.address ? "" : " — carteira não cadastrada"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                  Dados exigidos nesta etapa
                  <textarea
                    value={stage.specification}
                    onChange={(event) => updateStage(index, { specification: event.target.value })}
                    rows={2}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-500"
                    placeholder="Descreva os documentos ou informações que devem acompanhar esta etapa."
                  />
                </label>
              </div>
              {index === 0 && (
                <p className="mt-2 text-[11px] text-slate-400">
                  A primeira etapa é a origem do lote e fica vinculada à sua organização.
                </p>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setStages((current) => [...current, emptyStage()])}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={15} />
            Adicionar etapa
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving || !name.trim() || stages.length < 2}
            className="ml-2 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Registrando na blockchain..." : "Criar cadeia"}
          </button>
          <p className="text-[11px] text-slate-400">
            A primeira etapa é sua organização; as demais podem ser atribuídas a qualquer participante com carteira cadastrada. A configuração é imutável.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500">A cadeia desta organização ainda não foi configurada pelo administrador.</p>
      )}
    </section>
  );
}
