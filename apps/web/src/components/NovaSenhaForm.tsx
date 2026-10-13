import { useState } from "react";
import { Lock, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

const TAMANHO_MINIMO = 8;

function traduzirErro(err: { code?: string; message?: string }) {
  if (err.code === "same_password") return "A nova senha precisa ser diferente da atual.";
  if (err.code === "weak_password") return "Senha fraca. Use letras e números, com pelo menos 8 caracteres.";
  if (err.code === "session_not_found" || err.code === "session_expired")
    return "Sua sessão expirou. Entre de novo ou peça um novo link de redefinição.";
  return err.message || "Não foi possível trocar a senha. Tente novamente.";
}

/**
 * Define uma nova senha para o usuário da sessão atual (logado normalmente ou
 * pelo link de redefinição enviado por e-mail).
 */
export function NovaSenhaForm({ onSucesso }: { onSucesso?: () => void }) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso(false);

    if (senha.length < TAMANHO_MINIMO) {
      setErro(`A senha precisa ter pelo menos ${TAMANHO_MINIMO} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não conferem.");
      return;
    }

    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) {
      setErro(traduzirErro(error));
      return;
    }
    setSenha("");
    setConfirmacao("");
    setSucesso(true);
    onSucesso?.();
  };

  const inputClass = "field field-icon";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div aria-live="polite" className="space-y-3">
        {erro && (
          <div className="alerta alerta-erro animate-fade-in">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>{erro}</p>
          </div>
        )}
        {sucesso && (
          <div className="alerta alerta-sucesso animate-fade-in">
            <CheckCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>Senha alterada com sucesso.</p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="nova-senha" className="field-label">
          Nova senha
        </label>
        <div className="relative">
          <Lock aria-hidden="true" className="field-icon-slot" />
          <input
            id="nova-senha"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={inputClass}
            placeholder={`Mínimo de ${TAMANHO_MINIMO} caracteres`}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="confirmar-senha" className="field-label">
          Confirmar nova senha
        </label>
        <div className="relative">
          <Lock aria-hidden="true" className="field-icon-slot" />
          <input
            id="confirmar-senha"
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            className={inputClass}
            placeholder="Repita a nova senha"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={salvando}
        className="btn btn-primary w-full md:w-auto"
      >
        {salvando ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
