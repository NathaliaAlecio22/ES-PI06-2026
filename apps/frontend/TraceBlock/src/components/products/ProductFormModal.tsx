import { useState, type FormEvent } from "react";
import {
  X,
  Package,
  ClipboardList,
  Warehouse,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";

import type { Product, ProductFormData } from "./Products.types";

interface ProductFormModalProps {
  close: () => void;
  onSave: (product: Product) => void;
}

const initialForm: ProductFormData = {
  name: "",
  code: "",
  category: "",
  description: "",
  lot: "",
  manufacturingDate: "",
  expirationDate: "",
  quantity: "",
  unit: "kg",
  manufacturer: "",
  responsible: "Carlos Eduardo Lima",
  location: "",
};

export default function ProductFormModal({
  close,
  onSave,
}: ProductFormModalProps) {
  const [form, setForm] = useState<ProductFormData>(initialForm);

  function updateField<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function formatDate(date: string) {
    if (!date) return "";

    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newProduct: Product = {
      code: form.code,
      name: form.name,
      lot: form.lot,
      category: form.category,
      date: formatDate(form.manufacturingDate),
      owner: form.manufacturer,
      location: form.location,
      status: "Armazenado",
      quantity: `${form.quantity} ${form.unit}`,
      expirationDate: formatDate(form.expirationDate),
      description: form.description,
      manufacturer: form.manufacturer,
      responsible: form.responsible,
    };

    onSave(newProduct);
  }

  const inputClass =
    "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass =
    "mb-1.5 block text-sm font-medium text-slate-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
              Novo registro
            </span>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Cadastrar produto e lote
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Preencha os dados para registrar um novo produto na plataforma.
            </p>
          </div>

          <button
            onClick={close}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[65vh] space-y-8 overflow-y-auto px-6 py-6">
            {/* Seção 1 */}
            <section>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Package size={20} />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    01. Informações do produto
                  </h3>

                  <p className="text-xs text-slate-500">
                    Dados que identificam o item na plataforma.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Nome do produto *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Ex.: Café Especial Torrado"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Código de identificação *</label>
                  <input
                    required
                    value={form.code}
                    onChange={(e) => updateField("code", e.target.value)}
                    placeholder="Ex.: PRD-006"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Categoria *</label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecione uma categoria</option>
                    <option value="Alimentos">Alimentos</option>
                    <option value="Medicamentos">Medicamentos</option>
                    <option value="Eletrônicos">Eletrônicos</option>
                    <option value="Matéria-prima">Matéria-prima</option>
                    <option value="Cosméticos">Cosméticos</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Descrição</label>
                  <input
                    value={form.description}
                    onChange={(e) =>
                      updateField("description", e.target.value)
                    }
                    placeholder="Descrição do produto"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            {/* Seção 2 */}
            <section>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <ClipboardList size={20} />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    02. Informações do lote
                  </h3>

                  <p className="text-xs text-slate-500">
                    Dados de produção, validade e volume.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className={labelClass}>Identificador do lote *</label>
                  <input
                    required
                    value={form.lot}
                    onChange={(e) => updateField("lot", e.target.value)}
                    placeholder="LOTE-2026-000"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Data de fabricação *</label>
                  <div className="relative">
                    <input
                      required
                      type="date"
                      value={form.manufacturingDate}
                      onChange={(e) =>
                        updateField("manufacturingDate", e.target.value)
                      }
                      className={inputClass}
                    />
                    <CalendarDays
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Data de validade</label>
                  <input
                    type="date"
                    min={form.manufacturingDate || undefined}
                    value={form.expirationDate}
                    onChange={(e) =>
                      updateField("expirationDate", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Quantidade *</label>
                  <input
                    required
                    min="0.01"
                    step="any"
                    type="number"
                    value={form.quantity}
                    onChange={(e) => updateField("quantity", e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Unidade de medida *</label>
                  <select
                    value={form.unit}
                    onChange={(e) => updateField("unit", e.target.value)}
                    className={inputClass}
                  >
                    <option value="kg">Quilogramas (kg)</option>
                    <option value="unidades">Unidades</option>
                    <option value="litros">Litros</option>
                    <option value="toneladas">Toneladas</option>
                    <option value="caixas">Caixas</option>
                  </select>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            {/* Seção 3 */}
            <section>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Warehouse size={20} />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    03. Origem e custódia inicial
                  </h3>

                  <p className="text-xs text-slate-500">
                    Defina a procedência e o primeiro responsável.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Organização fabricante *
                  </label>
                  <input
                    required
                    value={form.manufacturer}
                    onChange={(e) =>
                      updateField("manufacturer", e.target.value)
                    }
                    placeholder="Nome da organização"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Responsável pelo cadastro
                  </label>
                  <input
                    value={form.responsible}
                    onChange={(e) =>
                      updateField("responsible", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Localização de origem *</label>
                  <input
                    required
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="Cidade, estado ou endereço"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            {/* Aviso */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-blue-600"
              />

              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Registro e rastreabilidade
                </p>

                <p className="mt-1 text-xs leading-relaxed text-blue-700">
                  Após o cadastro, o produto poderá ser vinculado à cadeia de
                  custódia e ter seus eventos registrados na Blockchain.
                </p>
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row">
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <ShieldCheck size={17} />
              Cadastrar produto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}