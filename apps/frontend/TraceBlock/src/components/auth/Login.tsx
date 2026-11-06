
import { useState, type FormEvent, type ReactNode } from "react";
import {
  Blocks,
  PackageOpen,
  Truck,
  Warehouse,
  PackageCheck,
  ShieldCheck,
  ArrowRight,
  LockKeyhole,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";

import { useNavigate } from "react-router-dom";



function AuthBrand({ darkText = false }: { darkText?: boolean }) {
  return (
    <div className="flex items-center gap-[10px] text-[20px] font-bold tracking-[-0.6px]">
      <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-[#315cf5] text-white shadow-[0_4px_16px_rgba(49,92,245,0.28)]">
        <Blocks size={21} strokeWidth={2.2} />
      </span>

      <span className={darkText ? "text-[#111827]" : "text-white"}>
        Trace<span className="text-[#829cff]">Block</span>
      </span>
    </div>
  );
}

function AuthButton({
  children,
  icon: Icon,
  type = "button",
}: {
  children: ReactNode;
  icon?: LucideIcon;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[8px] bg-[#315cf5] px-4 text-[12px] font-semibold text-white shadow-sm transition duration-[180ms] hover:-translate-y-px hover:bg-[#264bd7]"
    >
      {children}
      {Icon && <Icon size={16} />}
    </button>
  );
}

export default function Login() {
    const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const submitLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <main className="grid min-h-screen grid-cols-[minmax(480px,0.92fr)_minmax(580px,1.08fr)] bg-white max-[900px]:grid-cols-1">

      {/* PAINEL ESQUERDO */}
      <section className="relative hidden min-h-screen flex-col overflow-hidden bg-[#111827] px-14 py-11 text-white min-[901px]:flex">

        <div className="pointer-events-none absolute -right-[20%] -bottom-[45%] left-[20%] h-[70%] rounded-[50%] border border-[rgba(96,119,194,0.15)]" />

        <div className="relative z-10">
          <AuthBrand />
        </div>

        <div className="relative z-10 mt-[clamp(70px,12vh,120px)] max-w-[580px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#aebdfc]">
            Rastreabilidade empresarial
          </span>

          <h1 className="my-[18px] text-[clamp(34px,3vw,50px)] font-bold leading-[1.12] tracking-[-2px]">
            Transparência em cada etapa.
            <br />
            Confiança em toda a cadeia.
          </h1>

          <p className="max-w-[530px] text-[16px] leading-[1.7] text-[#aab3c2]">
            Conectamos produtos, organizações e movimentações em um histórico
            seguro e verificável.
          </p>
        </div>

        <div className="relative z-10 mt-[52px] h-[210px] w-[95%] max-w-[620px]">
          <div className="absolute top-[52%] left-[7%] h-px w-[84%] -rotate-[8deg] bg-gradient-to-r from-[#315cf5] to-[#8099f5] opacity-75" />

          {[
            { icon: PackageOpen, label: "Origem", x: "4%", y: "52%" },
            { icon: Truck, label: "Transporte", x: "36%", y: "19%" },
            { icon: Warehouse, label: "Armazém", x: "67%", y: "52%" },
            { icon: PackageCheck, label: "Destino", x: "87%", y: "14%" },
          ].map(({ icon: Icon, label, x, y }) => (
            <div key={label} className="absolute text-center" style={{ left: x, top: y }}>
              <span className="grid size-[46px] place-items-center rounded-[12px] border border-[#44516a] bg-[#172033] text-[#9cb0ff] shadow-[0_0_0_6px_rgba(49,92,245,0.06)]">
                <Icon size={20} />
              </span>

              <small className="mt-2 block text-[10px] text-[#8895a9]">
                {label}
              </small>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-auto flex items-center gap-3 text-[#8ea4fb]">
          <ShieldCheck size={18} />

          <span className="flex flex-col gap-[3px]">
            <b className="text-[12px] text-[#e7eaf0]">
              Rede íntegra e auditável
            </b>
            <small className="text-[10px] text-[#7f8999]">
              Todos os registros protegidos por Blockchain
            </small>
          </span>
        </div>
      </section>

      {/* PAINEL DIREITO */}
      <section className="flex min-h-screen flex-col items-center justify-center bg-white px-[6%] py-12 max-[900px]:px-7 max-[620px]:justify-start max-[620px]:px-5 max-[620px]:py-7">

        <div className="w-full max-w-[420px]">

          <div className="mb-[45px] hidden max-[900px]:block">
            <AuthBrand darkText />
          </div>

          <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#315cf5]">
            Portal TraceBlock
          </span>

          <h2 className="mt-[10px] mb-[9px] text-[29px] font-bold leading-[1.2] tracking-[-1px] text-[#111827] max-[620px]:text-[25px]">
            Bem-vindo de volta
          </h2>

          <p className="mb-[30px] text-[14px] leading-[1.6] text-[#64748b]">
            Acesse sua conta para continuar acompanhando sua cadeia de
            suprimentos.
          </p>

          <form onSubmit={submitLogin} className="flex flex-col gap-[19px]">

            <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#344054]">
              E-mail corporativo *

              <input
                type="email"
                placeholder="nome@empresa.com.br"
                required
                className="h-[46px] rounded-[9px] border border-[#d7dce3] px-[13px] text-[13px] font-normal outline-none transition focus:border-[#315cf5] focus:shadow-[0_0_0_3px_rgba(49,92,245,0.1)]"
              />
            </label>

            <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#344054]">
              Senha *

              <div className="flex h-[46px] items-center gap-[10px] rounded-[9px] border border-[#d7dce3] px-[13px] transition focus-within:border-[#315cf5] focus-within:shadow-[0_0_0_3px_rgba(49,92,245,0.1)]">
                <LockKeyhole size={17} className="shrink-0 text-[#8b95a4]" />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  required
                  className="w-full min-w-0 border-0 bg-transparent text-[13px] font-normal outline-none placeholder:text-[#9ca5b3]"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                  className="text-[#7b8797] hover:text-[#315cf5]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[12px] font-medium text-[#566174]">
                <input type="checkbox" className="size-[15px] accent-[#315cf5]" />
                Lembrar de mim
              </label>

              <button
              onClick={() => navigate("/forgot-password")}
                type="button"
                className="text-[12px] font-semibold text-[#315cf5] hover:text-[#264bd7]"
              >
                Esqueceu sua senha?
              </button>
            </div>

            <AuthButton type="submit" icon={ArrowRight}>
              Entrar na plataforma
            </AuthButton>
          </form>

          <p className="mt-[26px] text-center text-[12px] text-[#64748b]">
            Ainda não possui uma conta?{" "}
            <button
            onClick={() => navigate('/cadastro')}
              type="button"
              className="font-semibold text-[#315cf5] hover:text-[#264bd7]"
            >
              Solicitar acesso
            </button>
          </p>

          <p className="mt-[18px] border-t border-[#eef0f3] pt-[18px] text-center text-[10px] text-[#98a1af]">
            Para visualizar o ambiente, preencha os campos e entre.
          </p>
        </div>

        <footer className="mt-[42px] flex flex-wrap justify-center gap-5 text-[10px] text-[#98a1af]">
          <span>© 2025 TraceBlock</span>
          <span>Política de Privacidade</span>
          <span>Termos de Uso</span>
        </footer>
      </section>
    </main>
  );
}
