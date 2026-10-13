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

  const inputClass =
    "w-full h-12 pl-10 pr-4 border-2 border-primor-gray-medium rounded-lg focus:border-primor-primary focus:ring-2 focus:ring-primor-primary/20 outline-none transition bg-primor-bg-light";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {erro && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{erro}</p>
        </div>
      )}
      {sucesso && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700 text-sm">Senha alterada com sucesso.</p>
        </div>
      )}

      <div>
        <label htmlFor="nova-senha" className="block text-sm font-medium text-primor-text-light mb-2">
          Nova senha
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primor-gray-dark" />
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
        <label htmlFor="confirmar-senha" className="block text-sm font-medium text-primor-text-light mb-2">
          Confirmar nova senha
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primor-gray-dark" />
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
        className="w-full md:w-auto px-6 h-12 bg-primor-primary hover:brightness-110 disabled:opacity-50 text-primor-text-dark font-semibold rounded-lg transition shadow-md"
      >
        {salvando ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
