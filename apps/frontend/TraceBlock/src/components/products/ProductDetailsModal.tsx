import {
  X,
  Package,
  CalendarDays,
  MapPin,
  Building2,
  UserRound,
  Hash,
  Scale,
  ShieldCheck,
} from "lucide-react";

import type { Product } from "./Products.types";

interface ProductDetailsModalProps {
  product: Product;
  close: () => void;
}

export default function ProductDetailsModal({
  product,
  close,
}: ProductDetailsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Package size={24} />
            </div>

            <div>
              <span className="font-mono text-xs font-semibold text-blue-600">
                {product.code} · {product.lot}
              </span>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {product.name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {product.category}
              </p>
            </div>
          </div>

          <button
            onClick={close}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[65vh] space-y-6 overflow-y-auto p-6">
          {/* Status */}
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div>
              <p className="text-xs font-medium text-blue-700">
                Situação atual do lote
              </p>

              <p className="mt-1 font-semibold text-blue-900">
                {product.status}
              </p>
            </div>

            <ShieldCheck size={25} className="text-blue-600" />
          </div>

          {/* Informações gerais */}
          <section>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Informações gerais
            </h3>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <InfoItem
                icon={Hash}
                label="Código de identificação"
                value={product.code}
              />

              <InfoItem
                icon={Package}
                label="Número do lote"
                value={product.lot}
              />

              <InfoItem
                icon={Building2}
                label="Categoria"
                value={product.category}
              />

              <InfoItem
                icon={Scale}
                label="Quantidade"
                value={product.quantity || "Não informado"}
              />

              <InfoItem
                icon={CalendarDays}
                label="Data de fabricação"
                value={product.date}
              />

              <InfoItem
                icon={CalendarDays}
                label="Validade"
                value={product.expirationDate || "Não informada"}
              />
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Origem e custódia */}
          <section>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Origem e custódia
            </h3>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <InfoItem
                icon={Building2}
                label="Fabricante"
                value={product.manufacturer || "Não informado"}
              />

              <InfoItem
                icon={UserRound}
                label="Responsável atual"
                value={product.owner}
              />

              <InfoItem
                icon={MapPin}
                label="Localização atual"
                value={product.location}
              />

              <InfoItem
                icon={UserRound}
                label="Responsável pelo cadastro"
                value={product.responsible || "Não informado"}
              />
            </div>
          </section>

          {product.description && (
            <>
              <div className="border-t border-slate-100" />

              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Descrição
                </h3>

                <p className="text-sm leading-relaxed text-slate-600">
                  {product.description}
                </p>
              </section>
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button
            onClick={close}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
        <Icon size={17} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>

        <p className="mt-1 break-words text-sm font-medium text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}