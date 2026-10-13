import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "@/components/marca/AuthShell";

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
    <AuthShell
      etiqueta={recuperando ? "Acesso · recuperação" : "Acesso"}
      titulo={recuperando ? "Recuperar senha" : "Entrar na sua conta"}
      descricao={
        recuperando
          ? "Informe o e-mail da sua conta para receber um link de redefinição."
          : "Vistorias, briefings e o andamento de cada cliente da marcenaria."
      }
      rodape={
        <p>
          Não tem uma conta?{" "}
          <Link to="/register" className="link">
            Criar conta
          </Link>
        </p>
      }
    >
      <div aria-live="polite" className="space-y-3">
        {error && (
          <div className="alerta alerta-erro animate-fade-in">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {recuperando && linkEnviado && (
          <div className="alerta alerta-sucesso animate-fade-in">
            <CheckCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>
              Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam.
            </p>
          </div>
        )}
      </div>

      {recuperando ? (
        <form onSubmit={handleRecuperar} className="mt-5 space-y-5">
          <div>
            <label htmlFor="recuperar-email" className="field-label">
              Email
            </label>
            <div className="relative">
              <Mail aria-hidden="true" className="field-icon-slot" />
              <input
                id="recuperar-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field field-icon"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="field-label">
              Email
            </label>
            <div className="relative">
              <Mail aria-hidden="true" className="field-icon-slot" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field field-icon"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label htmlFor="login-senha" className="field-label">
              Senha
            </label>
            <div className="relative">
              <Lock aria-hidden="true" className="field-icon-slot" />
              <input
                id="login-senha"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field field-icon"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Botão de Login */}
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
            {loading ? (
              <>
                <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-primor-on-primary border-t-transparent" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn aria-hidden="true" className="h-5 w-5" />
                Entrar
              </>
            )}
          </button>
        </form>
      )}

      <div className="mt-4 flex justify-center">
        <button type="button" onClick={alternarRecuperacao} className="btn btn-quiet btn-sm text-primor-primary-ink">
          {recuperando ? "Voltar para o login" : "Esqueci minha senha"}
        </button>
      </div>
    </AuthShell>
  );
}
