import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Blocks, CheckCircle2 } from "lucide-react";
import { aceitarConviteUsuario } from "../../services/organization";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("O link do convite está incompleto.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setSubmitting(true);
    try {
      await aceitarConviteUsuario(token, password);
      setAccepted(true);
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Não foi possível aceitar o convite.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#315cf5] text-white">
            <Blocks size={22} />
          </span>
          <span className="text-xl font-bold text-slate-900">
            Trace<span className="text-[#315cf5]">Block</span>
          </span>
        </div>

        {accepted ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 text-emerald-600" size={40} />
            <h1 className="text-xl font-bold text-slate-900">Convite aceito</h1>
            <p className="mt-2 text-sm text-slate-600">
              Sua conta está pronta. Entre com seu e-mail e a senha criada.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="mt-6 w-full rounded-lg bg-[#315cf5] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2448c9]"
            >
              Ir para o login
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900">
              Aceitar convite
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Crie uma senha para ativar seu acesso à organização.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Senha
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-[#315cf5] focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Confirmar senha
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-[#315cf5] focus:ring-2 focus:ring-blue-100"
                />
              </label>
              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting || !token}
                className="w-full rounded-lg bg-[#315cf5] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2448c9] disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? "Ativando conta..." : "Criar senha e aceitar"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
