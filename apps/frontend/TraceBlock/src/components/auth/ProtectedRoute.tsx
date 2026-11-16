
import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import {
  buscarUsuarioAutenticado,
  isAuthenticated,
} from "../../services/auth";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const [validando, setValidando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function validarSessao() {
      if (!isAuthenticated()) {
        if (ativo) {
          setAutorizado(false);
          setValidando(false);
        }
        return;
      }

      try {
        await buscarUsuarioAutenticado();

        if (ativo) {
          setAutorizado(true);
        }
      } catch {
        if (ativo) {
          setAutorizado(false);
        }
      } finally {
        if (ativo) {
          setValidando(false);
        }
      }
    }

    validarSessao();

    return () => {
      ativo = false;
    };
  }, []);

  if (validando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <div className="text-center">
          <div className="mx-auto size-8 animate-spin rounded-full border-4 border-[#dbe4ff] border-t-[#315cf5]" />
          <p className="mt-3 text-sm text-gray-500">
            Verificando autenticação...
          </p>
        </div>
      </div>
    );
  }

  if (!autorizado) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
