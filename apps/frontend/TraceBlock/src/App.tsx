
import Login from "./components/auth/Login";
import Cadastro from "./components/auth/Cadastro";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ForgotPassword from "./components/auth/ForgotPassword";
import { HomePage } from "./pages/HomePage";

export default function App() {
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}
