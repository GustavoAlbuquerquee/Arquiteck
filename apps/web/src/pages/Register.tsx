import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "@/lib/supabase/register";
import { supabase } from "@/lib/supabase";
import { UserPlus, Mail, Lock, AlertCircle, CheckCircle, Building2, User } from "lucide-react";
import { AuthShell } from "@/components/marca/AuthShell";

export function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validações
    if (!nomeCompleto.trim()) {
      setError("Nome completo é obrigatório");
      return;
    }

    if (!nomeEmpresa.trim()) {
      setError("Nome da empresa é obrigatório");
      return;
    }

    if (!cnpj.trim()) {
      setError("CNPJ é obrigatório");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      // Chamar Edge Function que cria tudo de uma vez
      await registerUser(email, password, nomeCompleto, nomeEmpresa, cnpj);

      // Fazer login após registro
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Erro ao fazer login");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err: any) {
      console.error('Erro no registro:', err);
      setError(err.message || "Erro inesperado ao criar conta");
      setLoading(false);
    }
  };

  const bloqueado = loading || success;

  return (
    <AuthShell
      etiqueta="Cadastro · nova marcenaria"
      titulo="Criar sua conta"
      descricao="Cadastre a empresa e o primeiro acesso. Depois você convida a equipe em Configurações."
      rodape={
        <p>
          Já tem uma conta?{" "}
          <Link to="/login" className="link">
            Fazer login
          </Link>
        </p>
      }
    >
      <div aria-live="polite" className="space-y-3">
        {/* Alerta de Erro */}
        {error && (
          <div className="alerta alerta-erro animate-fade-in">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Alerta de Sucesso */}
        {success && (
          <div className="alerta alerta-sucesso animate-fade-in">
            <CheckCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Conta criada.</p>
              <p className="mt-0.5">Redirecionando para o sistema...</p>
            </div>
          </div>
        )}
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-8">
        <fieldset className="space-y-5">
          <legend className="etiqueta mb-4 flex w-full items-center gap-3">
            <span>01 · Você e a empresa</span>
            <span aria-hidden="true" className="h-px flex-1 bg-primor-line" />
          </legend>

          {/* Nome Completo */}
          <div>
            <label htmlFor="cadastro-nome" className="field-label">
              Nome completo <span aria-hidden="true" className="text-primor-primary-ink">*</span>
            </label>
            <div className="relative">
              <User aria-hidden="true" className="field-icon-slot" />
              <input
                id="cadastro-nome"
                type="text"
                autoComplete="name"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                className="field field-icon"
                placeholder="Mariana Teixeira"
                required
                disabled={bloqueado}
              />
            </div>
          </div>

          {/* Nome da Empresa */}
          <div>
            <label htmlFor="cadastro-empresa" className="field-label">
              Nome da empresa <span aria-hidden="true" className="text-primor-primary-ink">*</span>
            </label>
            <div className="relative">
              <Building2 aria-hidden="true" className="field-icon-slot" />
              <input
                id="cadastro-empresa"
                type="text"
                autoComplete="organization"
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                className="field field-icon"
                placeholder="Primor Móveis"
                required
                disabled={bloqueado}
              />
            </div>
          </div>

          {/* CNPJ */}
          <div>
            <label htmlFor="cadastro-cnpj" className="field-label">
              CNPJ <span aria-hidden="true" className="text-primor-primary-ink">*</span>
            </label>
            <div className="relative">
              <Building2 aria-hidden="true" className="field-icon-slot" />
              <input
                id="cadastro-cnpj"
                type="text"
                inputMode="numeric"
                value={cnpj}
                onChange={handleCNPJChange}
                className="field field-icon font-mono tabular"
                placeholder="12.345.678/0001-90"
                maxLength={18}
                required
                disabled={bloqueado}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="etiqueta mb-4 flex w-full items-center gap-3">
            <span>02 · Acesso</span>
            <span aria-hidden="true" className="h-px flex-1 bg-primor-line" />
          </legend>

          {/* Email */}
          <div>
            <label htmlFor="cadastro-email" className="field-label">
              Email
            </label>
            <div className="relative">
              <Mail aria-hidden="true" className="field-icon-slot" />
              <input
                id="cadastro-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field field-icon"
                placeholder="seu@email.com"
                required
                disabled={bloqueado}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Senha */}
            <div>
              <label htmlFor="cadastro-senha" className="field-label">
                Senha
              </label>
              <div className="relative">
                <Lock aria-hidden="true" className="field-icon-slot" />
                <input
                  id="cadastro-senha"
                  type="password"
                  autoComplete="new-password"
                  aria-describedby="cadastro-senha-dica"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field field-icon"
                  placeholder="••••••••"
                  required
                  disabled={bloqueado}
                />
              </div>
              <p id="cadastro-senha-dica" className="field-hint">
                Mínimo de 6 caracteres
              </p>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label htmlFor="cadastro-confirmar" className="field-label">
                Confirmar senha
              </label>
              <div className="relative">
                <Lock aria-hidden="true" className="field-icon-slot" />
                <input
                  id="cadastro-confirmar"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="field field-icon"
                  placeholder="••••••••"
                  required
                  disabled={bloqueado}
                />
              </div>
            </div>
          </div>
        </fieldset>

        {/* Botão de Registro */}
        <button type="submit" disabled={bloqueado} className="btn btn-primary btn-lg w-full">
          {loading ? (
            <>
              <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-primor-secondary border-t-transparent" />
              Criando conta...
            </>
          ) : success ? (
            <>
              <CheckCircle aria-hidden="true" className="h-5 w-5" />
              Conta criada
            </>
          ) : (
            <>
              <UserPlus aria-hidden="true" className="h-5 w-5" />
              Criar conta
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
