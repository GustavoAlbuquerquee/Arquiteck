import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { NovaSenhaForm } from "@/components/NovaSenhaForm";
import { AuthShell } from "@/components/marca/AuthShell";

// Página aberta pelo link de "Esqueci minha senha". O supabase-js lê o token
// da URL sozinho e cria uma sessão de recuperação; com ela, o usuário define
// a senha nova.
export function RedefinirSenha() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<"verificando" | "pronto" | "invalido">("verificando");

  useEffect(() => {
    // Link expirado/inválido: o Supabase devolve o erro na própria URL
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (hash.get("error") || query.get("error")) {
      setEstado("invalido");
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setEstado("pronto");
    });

    // A troca do token pela sessão pode já ter acontecido antes deste efeito
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setEstado("pronto");
    });

    // Sem token na URL e sem sessão, não há o que redefinir
    const timeout = setTimeout(
      () => setEstado((atual) => (atual === "verificando" ? "invalido" : atual)),
      5000,
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AuthShell
      etiqueta="Acesso · redefinir senha"
      titulo={estado === "pronto" ? "Escolha uma nova senha" : "Redefinir senha"}
      rodape={
        <p>
          Lembrou a senha?{" "}
          <Link to="/login" className="link">
            Voltar para o login
          </Link>
        </p>
      }
    >
      <div aria-live="polite">
        {estado === "verificando" && (
          <div className="flex items-center gap-3 py-4 text-primor-muted">
            <KeyRound aria-hidden="true" className="h-5 w-5 text-primor-primary-ink" />
            <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-primor-primary border-t-transparent" />
            <span>Verificando o link...</span>
          </div>
        )}

        {estado === "invalido" && (
          <div className="space-y-5">
            <div className="alerta alerta-erro">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p>
                Este link é inválido ou expirou. Peça um novo na tela de login, em "Esqueci minha senha".
              </p>
            </div>
            <Link to="/login" className="btn btn-outline w-full">
              Voltar para o login
            </Link>
          </div>
        )}
      </div>

      {estado === "pronto" && (
        <NovaSenhaForm onSucesso={() => setTimeout(() => navigate("/"), 1500)} />
      )}
    </AuthShell>
  );
}
