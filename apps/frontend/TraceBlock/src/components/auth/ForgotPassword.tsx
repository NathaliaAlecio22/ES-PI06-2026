
import { useState, type FormEvent } from "react";
import {
  Blocks,
  ArrowLeft,
  ArrowRight,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type Step = 1 | 2 | 3 | 4;



export default function ForgotPasswor(){
    const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");

  const passwordStrength =
    password.length >= 12
      ? 3
      : password.length >= 8
        ? 2
        : password.length >= 4
          ? 1
          : 0;

  const handleEmailSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // FUTURO BACKEND:
    // Enviar o email para a API solicitar o código de recuperação.

    setStep(2);
  };

  const handleCodeSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError("Informe o código de 6 dígitos.");
      return;
    }

    // FUTURO BACKEND:
    // Validar o código enviado por email.

    setStep(3);
  };

  const handlePasswordSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha deve possuir pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    // FUTURO BACKEND:
    // Enviar código, email e nova senha para a API.
    // A API deverá validar o código e atualizar a senha.

    setStep(4);
  };

  const handleResendCode = () => {
    setError("");

    // FUTURO BACKEND:
    // Solicitar um novo código para o email informado.
  };

  return (
    <main className="grid min-h-screen grid-cols-[minmax(480px,0.92fr)_minmax(580px,1.08fr)] bg-white max-[900px]:grid-cols-1">

      {/* PAINEL ESQUERDO */}
      <section className="relative hidden min-h-screen flex-col overflow-hidden bg-[#111827] px-14 py-11 text-white min-[901px]:flex">

        <div className="pointer-events-none absolute -right-[20%] -bottom-[45%] left-[20%] h-[70%] rounded-[50%] border border-[rgba(96,119,194,0.15)]" />

        {/* LOGO */}
        <div className="relative z-10 flex items-center gap-[10px] text-[20px] font-bold tracking-[-0.6px]">
          <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-[#315cf5] text-white shadow-[0_4px_16px_rgba(49,92,245,0.28)]">
            <Blocks size={21} strokeWidth={2.2} />
          </span>

          <span>
            Trace<span className="text-[#829cff]">Block</span>
          </span>
        </div>

        {/* TEXTO */}
        <div className="relative z-10 mt-[clamp(70px,12vh,120px)] max-w-[580px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#aebdfc]">
            Segurança da conta
          </span>

          <h1 className="my-[18px] text-[clamp(34px,3vw,50px)] font-bold leading-[1.12] tracking-[-2px]">
            Sua segurança.
            <br />
            Sua identidade.
            <br />
            Seu controle.
          </h1>

          <p className="max-w-[530px] text-[16px] leading-[1.7] text-[#aab3c2]">
            Recupere seu acesso com segurança e volte a acompanhar
            seus produtos e organizações na plataforma TraceBlock.
          </p>
        </div>

        {/* SEGURANÇA */}
        <div className="relative z-10 mt-[55px] flex flex-col gap-4">

          <div className="flex items-center gap-3 rounded-[12px] border border-[#303c52] bg-[#172033] p-4">
            <span className="grid size-[42px] shrink-0 place-items-center rounded-[10px] bg-[#263b68] text-[#9cb0ff]">
              <Mail size={19} />
            </span>

            <div>
              <b className="block text-[12px] text-[#e7eaf0]">
                Verificação por e-mail
              </b>
              <small className="text-[10px] text-[#8895a9]">
                Confirme sua identidade antes de alterar a senha.
              </small>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-[12px] border border-[#303c52] bg-[#172033] p-4">
            <span className="grid size-[42px] shrink-0 place-items-center rounded-[10px] bg-[#263b68] text-[#9cb0ff]">
              <ShieldCheck size={19} />
            </span>

            <div>
              <b className="block text-[12px] text-[#e7eaf0]">
                Proteção da conta
              </b>
              <small className="text-[10px] text-[#8895a9]">
                Processo de recuperação em etapas.
              </small>
            </div>
          </div>
        </div>

        {/* RODAPÉ ESQUERDO */}
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

        <div className="w-full max-w-[430px]">

          {/* LOGO MOBILE */}
          <div className="mb-[45px] hidden max-[900px]:block">
            <div className="flex items-center gap-[10px] text-[20px] font-bold tracking-[-0.6px]">
              <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-[#315cf5] text-white">
                <Blocks size={21} />
              </span>

              <span className="text-[#111827]">
                Trace<span className="text-[#829cff]">Block</span>
              </span>
            </div>
          </div>

          {/* VOLTAR */}
          {step !== 4 && (
            <button
              type="button"
              onClick={() => {
                setError("");

                if (step === 1) {
                  navigate('/login')
                } else {
                  setStep((step - 1) as Step);
                }
              }}
              className="mb-[30px] flex items-center gap-2 text-[12px] font-semibold text-[#657084] transition hover:text-[#315cf5]"
            >
              <ArrowLeft size={15} />
              {step === 1 ? "Voltar para o login" : "Voltar"}
            </button>
          )}

          {/* INDICADOR DE ETAPAS */}
          {step !== 4 && (
            <div className="mb-[30px]">

              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#64748b]">
                  Recuperação de senha
                </span>

                <span className="text-[11px] font-semibold text-[#315cf5]">
                  Etapa {step} de 3
                </span>
              </div>

              <div className="flex gap-2">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className={`h-[4px] flex-1 rounded-full transition ${
                      step >= item
                        ? "bg-[#315cf5]"
                        : "bg-[#e9edf3]"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ETAPA 1 - EMAIL */}
          {step === 1 && (
            <>
              <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#315cf5]">
                Recuperar acesso
              </span>

              <h2 className="mt-[10px] mb-[9px] text-[29px] font-bold leading-[1.2] tracking-[-1px] text-[#111827] max-[620px]:text-[25px]">
                Esqueceu sua senha?
              </h2>

              <p className="mb-[30px] text-[14px] leading-[1.7] text-[#64748b]">
                Não se preocupe. Informe o e-mail associado à sua
                conta e enviaremos um código para recuperar seu acesso.
              </p>

              <form
                onSubmit={handleEmailSubmit}
                className="flex flex-col gap-5"
              >
                <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#344054]">
                  E-mail corporativo

                  <div className="flex h-[48px] items-center gap-3 rounded-[9px] border border-[#d7dce3] px-[13px] transition focus-within:border-[#315cf5] focus-within:shadow-[0_0_0_3px_rgba(49,92,245,0.1)]">
                    <Mail size={17} className="shrink-0 text-[#8b95a4]" />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@empresa.com.br"
                      required
                      className="w-full min-w-0 border-0 bg-transparent text-[13px] font-normal text-[#111827] outline-none placeholder:text-[#9ca5b3]"
                    />
                  </div>
                </label>

                {error && (
                  <p className="text-[12px] text-red-600">{error}</p>
                )}

                <button
                  type="submit"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[9px] bg-[#315cf5] px-4 text-[12px] font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-[#264bd7]"
                >
                  Enviar código
                  <ArrowRight size={16} />
                </button>
              </form>

              <div className="mt-[25px] flex items-start gap-3 rounded-[10px] border border-[#e3e9f5] bg-[#f8faff] p-4">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#315cf5]" />

                <p className="text-[11px] leading-[1.7] text-[#64748b]">
                  Por segurança, o código de recuperação deverá
                  ser enviado somente para o e-mail cadastrado.
                </p>
              </div>
            </>
          )}

          {/* ETAPA 2 - CODIGO */}
          {step === 2 && (
            <>
              <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#315cf5]">
                Verificação de identidade
              </span>

              <h2 className="mt-[10px] mb-[9px] text-[29px] font-bold leading-[1.2] tracking-[-1px] text-[#111827] max-[620px]:text-[25px]">
                Verifique seu e-mail
              </h2>

              <p className="mb-[30px] text-[14px] leading-[1.7] text-[#64748b]">
                Informe o código de 6 dígitos enviado para:
              </p>

              <div className="mb-[25px] flex items-center gap-3 rounded-[10px] border border-[#e3e9f5] bg-[#f8faff] p-4">
                <span className="grid size-[40px] shrink-0 place-items-center rounded-[9px] bg-[#e9efff] text-[#315cf5]">
                  <Mail size={18} />
                </span>

                <div className="min-w-0">
                  <span className="block text-[11px] text-[#64748b]">
                    Código enviado para
                  </span>

                  <b className="block truncate text-[12px] text-[#263044]">
                    {email}
                  </b>
                </div>
              </div>

              <form
                onSubmit={handleCodeSubmit}
                className="flex flex-col gap-5"
              >
                <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#344054]">
                  Código de verificação

                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    required
                    className="h-[54px] w-full rounded-[9px] border border-[#d7dce3] bg-white px-4 text-center text-[22px] font-bold tracking-[0.35em] text-[#111827] outline-none transition placeholder:text-[#c3cad4] focus:border-[#315cf5] focus:shadow-[0_0_0_3px_rgba(49,92,245,0.1)]"
                  />
                </label>

                {error && (
                  <p className="text-[12px] text-red-600">{error}</p>
                )}

                <button
                  type="submit"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[9px] bg-[#315cf5] px-4 text-[12px] font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-[#264bd7]"
                >
                  Verificar código
                  <ArrowRight size={16} />
                </button>
              </form>

              <div className="mt-[25px] text-center">
                <p className="text-[12px] text-[#64748b]">
                  Não recebeu o código?
                </p>

                <button
                  type="button"
                  onClick={handleResendCode}
                  className="mt-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[#315cf5] hover:text-[#264bd7]"
                >
                  <RefreshCw size={14} />
                  Reenviar código
                </button>
              </div>

              <p className="mt-5 text-center text-[10px] leading-[1.6] text-[#98a1af]">
                Verifique também a pasta de spam do seu e-mail.
              </p>
            </>
          )}

          {/* ETAPA 3 - NOVA SENHA */}
          {step === 3 && (
            <>
              <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#315cf5]">
                Redefinição de senha
              </span>

              <h2 className="mt-[10px] mb-[9px] text-[29px] font-bold leading-[1.2] tracking-[-1px] text-[#111827] max-[620px]:text-[25px]">
                Crie uma nova senha
              </h2>

              <p className="mb-[30px] text-[14px] leading-[1.7] text-[#64748b]">
                Escolha uma senha segura para proteger sua conta.
              </p>

              <form
                onSubmit={handlePasswordSubmit}
                className="flex flex-col gap-5"
              >
                {/* NOVA SENHA */}
                <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#344054]">
                  Nova senha

                  <div className="flex h-[48px] items-center gap-3 rounded-[9px] border border-[#d7dce3] px-[13px] transition focus-within:border-[#315cf5] focus-within:shadow-[0_0_0_3px_rgba(49,92,245,0.1)]">
                    <LockKeyhole size={17} className="shrink-0 text-[#8b95a4]" />

                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo de 8 caracteres"
                      minLength={8}
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

                  {/* FORÇA DA SENHA */}
                  {password && (
                    <div className="mt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((item) => (
                          <div
                            key={item}
                            className={`h-[4px] flex-1 rounded-full ${
                              passwordStrength >= item
                                ? passwordStrength === 3
                                  ? "bg-[#16a36a]"
                                  : "bg-[#315cf5]"
                                : "bg-[#e5e7eb]"
                            }`}
                          />
                        ))}
                      </div>

                      <p className="mt-2 text-[10px] font-medium text-[#64748b]">
                        {passwordStrength === 3
                          ? "Senha forte"
                          : passwordStrength === 2
                            ? "Senha média"
                            : "Senha fraca"}
                      </p>
                    </div>
                  )}
                </label>

                {/* CONFIRMAR SENHA */}
                <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#344054]">
                  Confirmar nova senha

                  <div className="flex h-[48px] items-center gap-3 rounded-[9px] border border-[#d7dce3] px-[13px] transition focus-within:border-[#315cf5] focus-within:shadow-[0_0_0_3px_rgba(49,92,245,0.1)]">
                    <LockKeyhole size={17} className="shrink-0 text-[#8b95a4]" />

                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Digite a senha novamente"
                      minLength={8}
                      required
                      className="w-full min-w-0 border-0 bg-transparent text-[13px] font-normal outline-none placeholder:text-[#9ca5b3]"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Ocultar confirmação"
                          : "Exibir confirmação"
                      }
                      className="text-[#7b8797] hover:text-[#315cf5]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {confirmPassword && (
                    <p
                      className={`text-[10px] font-medium ${
                        password === confirmPassword
                          ? "text-[#16a36a]"
                          : "text-[#dc4c4c]"
                      }`}
                    >
                      {password === confirmPassword
                        ? "As senhas coincidem"
                        : "As senhas não coincidem"}
                    </p>
                  )}
                </label>

                {error && (
                  <p className="text-[12px] text-red-600">{error}</p>
                )}

                <button
                  type="submit"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[9px] bg-[#315cf5] px-4 text-[12px] font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-[#264bd7]"
                >
                  Redefinir senha
                  <ArrowRight size={16} />
                </button>
              </form>

              <div className="mt-[25px] flex items-start gap-3 rounded-[10px] border border-[#e3e9f5] bg-[#f8faff] p-4">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#315cf5]" />

                <p className="text-[11px] leading-[1.7] text-[#64748b]">
                  Utilize uma senha exclusiva com pelo menos 8 caracteres.
                  Evite compartilhar sua senha com outras pessoas.
                </p>
              </div>
            </>
          )}

          {/* ETAPA 4 - SUCESSO */}
          {step === 4 && (
            <div className="text-center">

              <span className="mx-auto mb-[26px] grid size-16 place-items-center rounded-full bg-[#e9f8f1] text-[#16a36a] shadow-[0_0_0_9px_#f4fbf7]">
                <Check size={30} />
              </span>

              <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#16a36a]">
                Processo concluído
              </span>

              <h2 className="mt-3 mb-3 text-[29px] font-bold leading-[1.2] tracking-[-1px] text-[#111827]">
                Senha redefinida!
              </h2>

              <p className="mb-[25px] text-[14px] leading-[1.7] text-[#64748b]">
                Sua nova senha foi definida. Agora você pode
                acessar sua conta TraceBlock utilizando suas
                novas credenciais.
              </p>

              <div className="mb-[25px] flex items-start gap-3 rounded-[10px] border border-[#d9f0e5] bg-[#f4fbf7] p-4 text-left">
                <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#16a36a]" />

                <div>
                  <b className="block text-[11px] text-[#273b32]">
                    Sua conta está pronta
                  </b>

                  <p className="mt-1 text-[10px] leading-[1.7] text-[#647b6e]">
                    Utilize sua nova senha para entrar na plataforma.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[9px] bg-[#315cf5] px-4 text-[12px] font-semibold text-white transition hover:bg-[#264bd7]"
              >
                Voltar para o login
                <ArrowRight size={16} />
              </button>
            </div>
          )}

        </div>

        {/* RODAPÉ */}
        <footer className="mt-[42px] flex flex-wrap justify-center gap-5 text-[10px] text-[#98a1af]">
          <span>© 2025 TraceBlock</span>
          <span>Política de Privacidade</span>
          <span>Termos de Uso</span>
        </footer>
      </section>
    </main>
  );
}
