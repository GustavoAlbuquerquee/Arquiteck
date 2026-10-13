import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [linkEnviado, setLinkEnviado] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError("Email ou senha inválidos");
      setLoading(false);
    } else {
      navigate("/");
    }
  };

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    if (error) {
      setError(
        error.status === 429
          ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
          : "Não foi possível enviar o link. Tente novamente.",
      );
      return;
    }
    // Mesma mensagem exista ou não a conta, para não revelar quais e-mails existem
    setLinkEnviado(true);
  };

  const alternarRecuperacao = () => {
    setRecuperando((atual) => !atual);
    setError("");
    setLinkEnviado(false);
  };

  return (
    <div className="min-h-screen bg-primor-bg-light flex items-center justify-center p-4">
      <div className="w-[90%] md:w-full max-w-md">
        {/* Logo/Título */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primor-secondary mb-2">
            Arquiteck
          </h1>
          <p className="text-primor-primary font-semibold text-lg">
            Primor Móveis
          </p>
          <p className="text-primor-gray-dark mt-1">
            Sistema de Gestão de Vistorias
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-primor-bg rounded-2xl shadow-2xl p-8 border border-primor-gray-medium">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primor-primary/10 p-3 rounded-full">
              <LogIn className="w-8 h-8 text-primor-primary" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-primor-text-light mb-6">
            {recuperando ? "Recuperar senha" : "Entrar na sua conta"}
          </h2>

          {/* Alerta de Erro */}
          {error && (
            <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {recuperando && linkEnviado && (
            <div className="mb-4 bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm">
                Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam.
              </p>
            </div>
          )}

          {recuperando ? (
            <form onSubmit={handleRecuperar} className="space-y-4">
              <p className="text-sm text-primor-gray-dark">
                Informe o e-mail da sua conta para receber um link de redefinição.
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primor-gray-dark" />
                <input
                  type="email"
                  aria-label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 border-2 border-primor-gray-medium rounded-lg focus:border-primor-primary focus:ring-2 focus:ring-primor-primary/20 outline-none transition bg-primor-bg-light"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primor-primary hover:brightness-110 disabled:opacity-50 text-primor-text-dark font-semibold rounded-lg transition shadow-md"
              >
                {loading ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-primor-text-light mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primor-gray-dark" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 border-2 border-primor-gray-medium rounded-lg focus:border-primor-primary focus:ring-2 focus:ring-primor-primary/20 outline-none transition bg-primor-bg-light"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-primor-text-light mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primor-gray-dark" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 border-2 border-primor-gray-medium rounded-lg focus:border-primor-primary focus:ring-2 focus:ring-primor-primary/20 outline-none transition bg-primor-bg-light"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primor-primary hover:brightness-110 disabled:opacity-50 text-primor-text-dark font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primor-text-dark border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Entrar
                </>
              )}
            </button>
          </form>
          )}

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={alternarRecuperacao}
              className="text-sm text-primor-primary hover:brightness-110 font-semibold"
            >
              {recuperando ? "Voltar para o login" : "Esqueci minha senha"}
            </button>
          </div>

          {/* Link para Registro */}
          <div className="mt-6 text-center">
            <p className="text-primor-gray-dark text-sm">
              Não tem uma conta?{" "}
              <Link
                to="/register"
                className="text-primor-primary hover:brightness-110 font-semibold"
              >
                Criar conta
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-primor-gray-dark text-sm mt-6">
          © {new Date().getFullYear()} Arquiteck - Primor Móveis. Todos os
          direitos reservados.{" "}
        </p>
      </div>
    </div>
  );
}
