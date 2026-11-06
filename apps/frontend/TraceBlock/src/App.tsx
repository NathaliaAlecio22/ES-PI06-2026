
import { useState } from "react";
import Login from "./components/auth/Login";
import Cadastro from "./components/auth/Logout";

export default function App() {
  const [view, setView] = useState<"login" | "cadastro">("login");

  return view === "login" ? (
    <Login
      onLogin={() => {
        console.log("Login enviado");
      }}
      onRegister={() => setView("cadastro")}
    />
  ) : (
    <Cadastro
      onLogin={() => setView("login")}
    />
  );
}
