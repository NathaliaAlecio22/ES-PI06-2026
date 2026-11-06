
import { useState, type FormEvent } from "react";
import {
  Blocks,
  PackageOpen,
  Truck,
  Warehouse,
  PackageCheck,
  ShieldCheck,
  Check,
  Clock3,
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Eye,
  EyeOff,
  ChevronDown,
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

function AuthField({
  label,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#344054]">
      <span>
        {label}
        {required && <b className="text-[#dc4c4c]"> *</b>}
      </span>

      <input
        type={type}
        placeholder={placeholder}
        required={required}
        className="h-[46px] w-full rounded-[9px] border border-[#d7dce3] bg-white px-[13px] text-[13px] font-normal text-[#111827] outline-none transition focus:border-[#315cf5] focus:shadow-[0_0_0_3px_rgba(49,92,245,0.1)] placeholder:text-[#9ca5b3]"
      />
    </label>
  );
}

export default function Cadastro() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitRegister = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
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
              <span className="grid size-[46px] place-items-center rounded-[12px] border border-[#44516a] bg-[#172033] text-[#9cb0ff]">
                <Icon size={20} />
              </span>
              <small className="mt-2 block text-[10px] text-[#8895a9]">{label}</small>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-auto flex items-center gap-3 text-[#8ea4fb]">
          <ShieldCheck size={18} />
          <span className="flex flex-col gap-[3px]">
            <b className="text-[12px] text-[#e7eaf0]">Rede íntegra e auditável</b>
            <small className="text-[10px] text-[#7f8999]">
              Todos os registros protegidos por Blockchain
            </small>
          </span>
        </div>
      </section>

      {/* PAINEL DIREITO */}
      <section className="flex min-h-screen flex-col items-center justify-center bg-white px-[6%] py-12 max-[900px]:px-7 max-[620px]:justify-start max-[620px]:px-5 max-[620px]:py-7">

        <div className="w-full max-w-[700px]">

          <div className="mb-[35px] hidden max-[900px]:block">
            <AuthBrand darkText />
          </div>

          {submitted ? (
            <div className="text-center">
              <span className="mx-auto mb-[26px] grid size-16 place-items-center rounded-full bg-[#e9f8f1] text-[#16a36a] shadow-[0_0_0_9px_#f4fbf7]">
                <Check size={30} />
              </span>

              <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#315cf5]">
                Cadastro recebido
              </span>

              <h2 className="mt-3 mb-2 text-[29px] font-bold leading-[1.2] tracking-[-1px] text-[#111827]">
                Solicitação de cadastro enviada
              </h2>

              <p className="mx-auto mb-[25px] text-[14px] leading-[1.7] text-[#64748b]">
                Suas informações foram recebidas. Aguarde a aprovação do
                administrador para acessar a plataforma.
              </p>

              <div className="mb-6 flex items-start gap-[11px] rounded-[9px] border border-[#dbe3ff] bg-[#f7f9ff] p-[14px] text-left text-[#315cf5]">
                <Clock3 size={19} className="mt-0.5 shrink-0" />
                <span className="flex flex-col gap-1">
                  <b className="text-[11px] text-[#273451]">O que acontece agora?</b>
                  <small className="text-[10px] leading-[1.5] text-[#66728b]">
                    Nossa equipe validará os dados da organização. Você receberá
                    um retorno por e-mail.
                  </small>
                </span>
              </div>

              <button
              onClick={() => navigate("/login")}
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[8px] bg-[#315cf5] px-4 text-[12px] font-semibold text-white transition hover:bg-[#264bd7]"
              >
                <ArrowLeft size={16} />
                Voltar para o login
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mb-[27px] flex items-center gap-[5px] text-[12px] font-semibold text-[#657084] transition hover:text-[#315cf5]"
              >
                <ArrowLeft size={15} />
                Voltar para o login
              </button>

              <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#315cf5]">
                Nova organização
              </span>

              <h2 className="mt-[10px] mb-[9px] text-[29px] font-bold leading-[1.2] tracking-[-1px] text-[#111827] max-[620px]:text-[25px]">
                Crie sua conta
              </h2>

              <p className="text-[14px] leading-[1.6] text-[#64748b]">
                Cadastre sua organização e comece a acompanhar seus produtos
                com transparência.
              </p>

              <form onSubmit={submitRegister} className="mt-6 flex flex-col gap-[25px]">

                {/* INFORMAÇÕES PESSOAIS */}
                <fieldset className="m-0 min-w-0 border-0 p-0">
                  <legend className="mb-[15px] flex w-full items-center gap-[9px] text-[12px] font-bold text-[#263044]">
                    <span className="grid size-[22px] place-items-center rounded-full bg-[#eef2ff] text-[10px] text-[#315cf5]">1</span>
                    Informações pessoais
                  </legend>

                  <div className="grid grid-cols-2 gap-4 max-[620px]:grid-cols-1">
                    <AuthField label="Nome completo" placeholder="Seu nome completo" required />
                    <AuthField label="E-mail corporativo" placeholder="nome@empresa.com.br" type="email" required />

                    <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#344054]">
                      Senha *
                      <div className="flex h-[46px] items-center gap-[10px] rounded-[9px] border border-[#d7dce3] px-[13px] focus-within:border-[#315cf5] focus-within:shadow-[0_0_0_3px_rgba(49,92,245,0.1)]">
                        <LockKeyhole size={17} className="shrink-0 text-[#8b95a4]" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo de 8 caracteres"
                          required
                          minLength={8}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full min-w-0 border-0 bg-transparent text-[13px] font-normal outline-none placeholder:text-[#9ca5b3]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[#7b8797] hover:text-[#315cf5]"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {password && (
                        <div className="flex items-center gap-1">
                          {[3, 7, 10].map((limit) => (
                            <i
                              key={limit}
                              className={`h-[3px] flex-1 rounded-sm ${
                                password.length > limit ? "bg-[#16a36a]" : "bg-[#e5e7eb]"
                              }`}
                            />
                          ))}
                          <small className="ml-[6px] text-[9px] font-medium text-[#64748b]">
                            {password.length > 10 ? "Senha forte" : password.length > 7 ? "Senha média" : "Senha fraca"}
                          </small>
                        </div>
                      )}
                    </label>

                    <AuthField label="Confirmar senha" placeholder="Repita sua senha" type="password" required />
                    <AuthField label="Telefone" placeholder="(00) 00000-0000" />
                  </div>
                </fieldset>

                {/* INFORMAÇÕES DA ORGANIZAÇÃO */}
                <fieldset className="m-0 min-w-0 border-0 border-t border-[#edf0f3] pt-[19px]">
                  <legend className="mb-[15px] flex w-full items-center gap-[9px] text-[12px] font-bold text-[#263044]">
                    <span className="grid size-[22px] place-items-center rounded-full bg-[#eef2ff] text-[10px] text-[#315cf5]">2</span>
                    Informações da organização
                  </legend>

                  <div className="grid grid-cols-2 gap-4 max-[620px]:grid-cols-1">
                    <AuthField label="Nome da organização" placeholder="Razão social" required />
                    <AuthField label="CNPJ" placeholder="00.000.000/0000-00" required />

                    <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#344054]">
                      Tipo de participante *
                      <div className="relative flex h-[46px] items-center rounded-[9px] border border-[#d7dce3] px-[13px] focus-within:border-[#315cf5]">
                        <select required defaultValue="" className="w-full appearance-none bg-transparent pr-7 text-[13px] font-normal text-[#111827] outline-none">
                          <option value="" disabled>Selecione o tipo</option>
                          <option>Fabricante</option>
                          <option>Distribuidor</option>
                          <option>Transportadora</option>
                          <option>Centro de armazenamento</option>
                          <option>Varejista</option>
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-[13px]" />
                      </div>
                    </label>

                    <AuthField label="Cargo ou função" placeholder="Ex.: Gerente de operações" required />
                  </div>
                </fieldset>

                {/* TERMOS */}
                <label className="flex items-start gap-2 text-[12px] font-medium leading-[1.5] text-[#566174]">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    required
                    className="mt-[2px] size-[15px] shrink-0 accent-[#315cf5]"
                  />
                  <span>
                    Li e aceito os{" "}
                    <a href="#" className="font-semibold text-[#315cf5]">Termos de Uso</a>
                    {" "}e a{" "}
                    <a href="#" className="font-semibold text-[#315cf5]">Política de Privacidade</a>.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!accepted}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[8px] bg-[#315cf5] px-4 text-[12px] font-semibold text-white transition hover:bg-[#264bd7] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Criar conta
                  <ArrowRight size={16} />
                </button>
              </form>

              <p className="mt-[26px] text-center text-[12px] text-[#64748b]">
                Já possui uma conta?{" "}
                <button
                onClick={() => navigate('/login')}
                  type="button"
                  className="font-semibold text-[#315cf5] hover:text-[#264bd7]"
                >
                  Entrar
                </button>
              </p>
            </>
          )}
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
