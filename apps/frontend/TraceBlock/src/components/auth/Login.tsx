
import { useState, type ReactNode } from "react";

type IconName = "shield" | "eye" | "lock" | "arrow";

const paths: Record<IconName, ReactNode> = {
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
};

function Icon({
  name,
  size = 18,
}: {
  name: IconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Logo() {
  return (
    <div className="flex min-w-[165px] items-center gap-[10px] text-[#60a5fa]">
      <svg
        className="h-[33px] w-[33px] shrink-0"
        viewBox="0 0 40 40"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="14" height="14" rx="4" fill="currentColor" />
        <rect
          x="22"
          y="22"
          width="14"
          height="14"
          rx="4"
          fill="currentColor"
          opacity=".62"
        />
        <path
          d="M17 11h4a8 8 0 0 1 8 8v3M23 29h-4a8 8 0 0 1-8-8v-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
      </svg>

      <div className="flex flex-col">
        <strong className="text-[17px] leading-[1.1] tracking-[-0.3px] text-white">
          TraceBlock
        </strong>
        <span className="mt-[3px] text-[8.5px] font-semibold uppercase tracking-[0.8px] text-[#8ba0bc]">
          Blockchain Provenance
        </span>
      </div>
    </div>
  );
}

interface LoginProps {
  login: () => void;
}

export default function Login({ login }: LoginProps) {
  const [show, setShow] = useState(false);

  return (
    <main className="grid min-h-screen grid-cols-[45%_55%] bg-white">

      {/* Painel esquerdo */}
      <section className="relative flex min-h-screen flex-col overflow-hidden bg-[#0b1730] px-[55px] py-[42px] text-white before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(135deg,transparent_45%,rgba(37,99,235,0.06))] before:content-['']">

        {/* Logo */}
        <div className="relative z-10">
          <Logo />
        </div>

        {/* Mensagem principal */}
        <div className="relative z-10 mt-auto w-full max-w-[540px]">
          <span className="text-[8.5px] font-bold uppercase tracking-[1.1px] text-[#60a5fa]">
            RASTREABILIDADE COM CONFIANÇA
          </span>

          <h1 className="my-3 max-w-[540px] text-[40px] font-bold leading-[1.12] tracking-[-1.4px] text-white">
            Transparência em cada etapa da cadeia.
          </h1>

          <p className="max-w-[500px] text-[14px] leading-[1.7] text-[#a9b7ca]">
            Registre, valide e acompanhe a origem de produtos com a
            segurança de uma rede Blockchain.
          </p>
        </div>

        {/* Ilustração Blockchain */}
        <div className="relative z-10 mx-auto mt-7 mb-auto w-full max-w-[400px]">
          <svg
            className="block h-auto w-full text-[#60a5fa]"
            viewBox="0 0 620 260"
          >
            <g fill="none" stroke="currentColor">
              <path
                d="M98 127h118M284 127h66M418 127h104"
                strokeWidth="3"
                strokeDasharray="7 8"
                opacity=".28"
              />

              <path
                d="M157 87v-27h160v36M384 95V59h81"
                strokeWidth="2"
                opacity=".2"
              />
            </g>

            {[
              [40, 90],
              [216, 90],
              [350, 90],
              [522, 90],
            ].map((p, i) => (
              <g key={i} transform={`translate(${p[0]} ${p[1]})`}>
                <rect
                  width="68"
                  height="68"
                  rx="14"
                  fill={i === 2 ? "#2563EB" : "#142B4D"}
                  stroke={i === 2 ? "#60A5FA" : "#2b4568"}
                />

                <path
                  d="m18 25 16-8 16 8-16 8-16-8Zm0 0v20l16 8 16-8V25M34 33v20"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  opacity=".85"
                />

                <circle
                  cx="68"
                  cy="34"
                  r="5"
                  fill={i < 3 ? "#38bdf8" : "#16a34a"}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Informação de segurança */}
        <div className="relative z-10 flex items-center gap-[11px] border-t border-white/10 pt-6 text-[#60a5fa]">
          <Icon name="shield" />

          <div className="flex flex-col gap-1">
            <strong className="text-[11px] text-[#dbe7f5]">
              Registros íntegros e auditáveis
            </strong>

            <span className="text-[9px] text-[#7086a3]">
              Cada operação é validada antes de integrar a cadeia de custódia.
            </span>
          </div>
        </div>
      </section>

      {/* Painel direito */}
      <section className="grid min-h-screen place-items-center px-10 py-[50px]">
        <div className="w-full max-w-[420px]">

          {/* Logo para dispositivos menores */}
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>

          <span className="text-[8.5px] font-bold uppercase tracking-[1.1px] text-[#2563eb]">
            ACESSO SEGURO
          </span>

          <h2 className="mt-[9px] mb-[5px] text-[25px] font-bold tracking-[-0.5px] text-[#0b1730]">
            Bem-vindo de volta
          </h2>

          <p className="mb-[26px] text-[11px] text-[#64748b]">
            Acesse sua plataforma de rastreabilidade.
          </p>

          {/* Campo de e-mail */}
          <div className="mb-[15px] flex flex-col gap-[6px]">
            <label className="text-[8.5px] font-semibold text-[#475569]">
              E-mail
            </label>

            <input
              type="email"
              defaultValue="carlos.lima@traceblock.com"
              placeholder="Digite seu e-mail"
              className="h-[43px] w-full rounded-[6px] border border-[#dbe2ea] bg-white px-[10px] text-[10px] text-[#172033] outline-none transition focus:border-[#60a5fa] focus:ring-[3px] focus:ring-[#eff6ff]"
            />
          </div>

          {/* Campo de senha */}
          <div className="mb-[15px] flex flex-col gap-[6px]">
            <label className="text-[8.5px] font-semibold text-[#475569]">
              Senha
            </label>

            <div className="relative">
              <input
                type={show ? "text" : "password"}
                defaultValue="traceblock2026"
                placeholder="Digite sua senha"
                className="h-[43px] w-full rounded-[6px] border border-[#dbe2ea] bg-white py-0 pr-10 pl-[10px] text-[10px] text-[#172033] outline-none transition focus:border-[#60a5fa] focus:ring-[3px] focus:ring-[#eff6ff]"
              />

              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                className="absolute top-[7px] right-2 grid h-[30px] w-[30px] place-items-center rounded text-[#94a3b8] transition hover:text-[#2563eb]"
              >
                <Icon name="eye" />
              </button>
            </div>
          </div>

          {/* Opções de acesso */}
          <div className="mb-[18px] -mt-[2px] flex items-center justify-between text-[9px]">
            <label className="flex items-center gap-[6px] text-[#64748b]">
              <input
                type="checkbox"
                defaultChecked
                className="accent-blue-600"
              />
              Lembrar de mim
            </label>

            <button
              type="button"
              className="text-[#2563eb] transition hover:text-[#1d4ed8]"
            >
              Esqueceu sua senha?
            </button>
          </div>

          {/* Botão de login */}
          <button
            type="button"
            onClick={login}
            className="inline-flex h-[43px] w-full items-center justify-center gap-2 rounded-[7px] border border-[#2563eb] bg-[#2563eb] px-[15px] text-[11px] font-semibold text-white shadow-[0_1px_2px_rgba(37,99,235,0.15)] transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            Entrar na plataforma
            <Icon name="arrow" size={16} />
          </button>

          {/* Aviso de segurança */}
          <div className="mt-[18px] flex items-start gap-2 rounded-[6px] bg-[#f8fafc] p-[11px] text-[8px] leading-[1.45] text-[#64748b]">
            <span className="shrink-0 text-[#2563eb]">
              <Icon name="lock" size={17} />
            </span>

            <span>
              Ambiente seguro. Todas as operações são autenticadas e
              rastreáveis.
            </span>
          </div>

          {/* Rodapé */}
          <small className="mt-[26px] block text-center text-[7.5px] leading-[1.6] text-[#94a3b8]">
            Projeto Integrador VI · Engenharia de Software
            <br />
            PUC-Campinas · 2026
          </small>
        </div>
      </section>
    </main>
  );
}
