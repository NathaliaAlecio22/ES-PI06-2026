import { useState, type FormEvent } from "react";
import {
  X,
  ShieldCheck,
  Building2,
  UserRound,
  Mail,
  Phone,
  MapPin,
  Fingerprint,
} from "lucide-react";
import type {
  Participant,
  ParticipantFormData,
  ParticipantType,
} from "./participantes.types";

interface ParticipantFormModalProps {
  onClose: () => void;
  onSave: (participant: Participant) => void;
}

const initialForm: ParticipantFormData = {
  name: "",
  cnpj: "",
  type: "",
  person: "",
  email: "",
  phone: "",
  address: "",
  digitalId: "",
};

export default function ParticipantFormModal({
  onClose,
  onSave,
}: ParticipantFormModalProps) {
  const [form, setForm] = useState<ParticipantFormData>(initialForm);

  function updateField<K extends keyof ParticipantFormData>(
    field: K,
    value: ParticipantFormData[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const participant: Participant = {
      id: crypto.randomUUID(),
      initials: form.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase(),
      name: form.name.trim(),
      type: form.type as ParticipantType,
      cnpj: form.cnpj.trim(),
      person: form.person.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      digitalId: form.digitalId.trim() || "Não informado",
      lots: 0,
      status: "Aguardando validação",
    };

    onSave(participant);
  }

  const inputClass =
    "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass =
    "text-xs font-semibold text-slate-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <span className="text-[9px] font-bold tracking-[1.2px] text-blue-600">
              TRACEBLOCK
            </span>

            <h2 className="mt-1 text-lg font-bold tracking-tight text-[#0b1730]">
              Cadastrar participante
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Informe os dados da organização que fará parte da cadeia.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[65vh] space-y-6 overflow-y-auto px-6 py-5">
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Building2 size={17} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Identificação da organização
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Nome da organização *
                  </label>

                  <input
                    required
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Razão social da organização"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>CNPJ *</label>

                  <input
                    required
                    value={form.cnpj}
                    onChange={(e) => updateField("cnpj", e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Tipo de participante *
                  </label>

                  <select
                    required
                    value={form.type}
                    onChange={(e) => updateField("type", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="Fabricante">Fabricante</option>
                    <option value="Transportadora">Transportadora</option>
                    <option value="Centro de armazenamento">
                      Centro de armazenamento
                    </option>
                    <option value="Distribuidor">Distribuidor</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Endereço</label>

                  <div className="relative">
                    <MapPin
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="Cidade, estado"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="h-px bg-slate-100" />

            <section>
              <div className="mb-4 flex items-center gap-2">
                <UserRound size={17} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Responsável pela organização
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Nome do responsável *
                  </label>

                  <input
                    required
                    value={form.person}
                    onChange={(e) => updateField("person", e.target.value)}
                    placeholder="Nome completo"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Telefone</label>

                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="(00) 00000-0000"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>E-mail *</label>

                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="responsavel@organizacao.com.br"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="h-px bg-slate-100" />

            <section>
              <div className="mb-4 flex items-center gap-2">
                <Fingerprint size={17} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Identificação digital
                </h3>
              </div>

              <label className={labelClass}>
                Identificação digital (opcional)
              </label>

              <input
                value={form.digitalId}
                onChange={(e) => updateField("digitalId", e.target.value)}
                placeholder="Endereço ou identificador da carteira digital"
                className={inputClass}
              />

              <p className="mt-1.5 text-[11px] text-slate-400">
                Pode ser preenchido posteriormente, conforme a integração com
                a Blockchain.
              </p>
            </section>

            <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/70 p-4">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <strong className="text-xs font-semibold text-slate-800">
                  Status de autorização
                </strong>

                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  O participante será cadastrado como aguardando validação.
                  Um administrador deverá autorizar sua participação na cadeia
                  de suprimentos.
                </p>

                <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                  Aguardando validação
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <ShieldCheck size={16} />
              Cadastrar participante
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}