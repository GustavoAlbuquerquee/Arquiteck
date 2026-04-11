import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";

const PRIMOR_MOVEIS_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validações
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, PRIMOR_MOVEIS_TENANT_ID);

    if (error) {
      setError(error.message || "Erro ao criar conta");
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      // Auto-login: redirecionar direto para o Dashboard
      setTimeout(() => {
        navigate("/");
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-primor-bg-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Título */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primor-secondary mb-2">Arquiteck</h1>
          <p className="text-primor-primary font-semibold text-lg">Primor Móveis</p>
          <p className="text-primor-gray-dark mt-1">Criar nova conta</p>
        </div>

        {/* Card de Registro */}
        <div className="bg-primor-bg rounded-2xl shadow-2xl p-8 border border-primor-gray-medium">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primor-primary/10 p-3 rounded-full">
              <UserPlus className="w-8 h-8 text-primor-primary" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-primor-text-light mb-6">
            Criar sua conta
          </h2>

          {/* Alerta de Erro */}
          {error && (
            <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Alerta de Sucesso */}
          {success && (
            <div className="mb-4 bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-700 text-sm font-semibold">
                  Conta criada com sucesso!
                </p>
                <p className="text-green-600 text-xs mt-1">
                  Redirecionando para o sistema...
                </p>
              </div>
            </div>
          )}

          {/* Formulário */}
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
                  disabled={loading || success}
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
                  disabled={loading || success}
                />
              </div>
              <p className="text-xs text-primor-gray-dark mt-1">
                Mínimo de 6 caracteres
              </p>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-sm font-medium text-primor-text-light mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primor-gray-dark" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 border-2 border-primor-gray-medium rounded-lg focus:border-primor-primary focus:ring-2 focus:ring-primor-primary/20 outline-none transition bg-primor-bg-light"
                  placeholder="••••••••"
                  required
                  disabled={loading || success}
                />
              </div>
            </div>

            {/* Info sobre Tenant */}
            <div className="bg-primor-primary/10 border border-primor-primary/30 rounded-lg p-3">
              <p className="text-xs text-primor-secondary">
                <strong>Empresa:</strong> Primor Móveis
              </p>
            </div>

            {/* Botão de Registro */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full h-12 bg-primor-primary hover:brightness-110 disabled:opacity-50 text-primor-text-dark font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primor-text-dark border-t-transparent rounded-full animate-spin" />
                  Criando conta...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Conta criada!
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Criar conta
                </>
              )}
            </button>
          </form>

          {/* Link para Login */}
          <div className="mt-6 text-center">
            <p className="text-primor-gray-dark text-sm">
              Já tem uma conta?{" "}
              <Link
                to="/login"
                className="text-primor-primary hover:brightness-110 font-semibold"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-primor-gray-dark text-sm mt-6">
          © {new Date().getFullYear()} Arquiteck - Primor Móveis. Todos os
          direitos reservados.
        </p>
      </div>
    </div>
  );
}
