import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { NovaSenhaForm } from "@/components/NovaSenhaForm";

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
    <div className="min-h-screen bg-primor-bg-light flex items-center justify-center p-4">
      <div className="w-[90%] md:w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primor-secondary mb-2">Arquiteck</h1>
          <p className="text-primor-gray-dark mt-1">Redefinir senha</p>
        </div>

        <div className="bg-primor-bg rounded-2xl shadow-2xl p-8 border border-primor-gray-medium">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primor-primary/10 p-3 rounded-full">
              <KeyRound className="w-8 h-8 text-primor-primary" />
            </div>
          </div>

          {estado === "verificando" && (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 border-4 border-primor-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {estado === "invalido" && (
            <div className="space-y-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">
                  Este link é inválido ou expirou. Peça um novo na tela de login, em "Esqueci minha senha".
                </p>
              </div>
              <Link
                to="/login"
                className="block text-center text-primor-primary hover:brightness-110 font-semibold"
              >
                Voltar para o login
              </Link>
            </div>
          )}

          {estado === "pronto" && (
            <>
              <h2 className="text-2xl font-bold text-center text-primor-text-light mb-6">
                Escolha uma nova senha
              </h2>
              <NovaSenhaForm onSucesso={() => setTimeout(() => navigate("/"), 1500)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
