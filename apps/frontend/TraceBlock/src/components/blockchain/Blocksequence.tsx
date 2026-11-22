import { Blocks } from "lucide-react";

import type { Block } from "./blockchain.types";

interface BlockSequenceProps {
  blocks: Block[];
}

export default function BlockSequence({
  blocks,
}: BlockSequenceProps) {
  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-[13px] font-semibold text-[#172033]">
          Sequência de blocos
        </h2>

        <p className="mt-1 text-[10px] text-slate-500">
          Últimos blocos registrados na rede
        </p>
      </div>

      <div className="mt-6 flex items-center justify-center overflow-x-auto pb-2">
        {blocks.length > 0 ? (
          blocks.map((block, index) => (
            <div
              key={block.hash}
              className="flex shrink-0 items-center"
            >
              <div
                className={`flex w-[115px] flex-col items-center rounded-lg border p-3 text-center transition-colors ${
                  block.active
                    ? "border-blue-300 bg-blue-50 shadow-[0_0_0_3px_#eff6ff]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <Blocks
                  size={20}
                  strokeWidth={1.7}
                  className={
                    block.active
                      ? "text-blue-600"
                      : "text-slate-500"
                  }
                />

                <span className="mt-2 text-[8px] text-slate-400">
                  Bloco
                </span>

                <strong className="mt-1 font-mono text-[10px] text-[#172033]">
                  #{block.number.toLocaleString("pt-BR")}
                </strong>

                <span className="mt-1 text-[8px] text-slate-400">
                  {new Date(block.timestamp).toLocaleTimeString(
                    "pt-BR",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </span>

                <span className="mt-1 text-[8px] text-slate-500">
                  {block.transactionsCount} transações
                </span>

                {block.active && (
                  <span className="mt-2 rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[7px] font-semibold text-blue-600">
                    Mais recente
                  </span>
                )}
              </div>

              {index !== blocks.length - 1 && (
                <div className="mx-2 flex shrink-0 items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">
            Nenhum bloco encontrado.
          </div>
        )}
      </div>
    </section>
  );
}