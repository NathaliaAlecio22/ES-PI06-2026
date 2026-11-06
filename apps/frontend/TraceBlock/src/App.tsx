import { useState } from "react";
import Login from "./components/auth/Login";

export default function App() {
  const [logged, setLogged] = useState(false);

  if (!logged) {
    return <Login login={() => setLogged(true)} />;
  }

  return (
    <div>
      {/* Aqui entra o restante da sua aplicação */}
      <h1>Bem-vindo à plataforma!</h1>
    </div>
  );
}