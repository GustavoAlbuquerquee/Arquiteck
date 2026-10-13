import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  User,
  Calendar,
} from "lucide-react";

type Status =
  | "orcamento"
  | "pre_producao"
  | "producao"
  | "instalacao"
  | "concluido";

interface Projeto {
  id: string;
  titulo_ambiente: string;
  status: Status;
  created_at: string | null;
  clients: { nome: string; telefone: string | null } | null;
}

const COLUNAS: { status: Status; label: string }[] = [
  { status: "orcamento", label: "Orçamento" },
  { status: "pre_producao", label: "Pré-Produção" },
  { status: "producao", label: "Produção" },
  { status: "instalacao", label: "Instalação" },
  { status: "concluido", label: "Concluído" },
];

const STATUS_ORDER = COLUNAS.map((c) => c.status);

export function Producao() {
  const { user } = useAuth();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadProjetos();
  }, [user]);

  const loadProjetos = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, titulo_ambiente, status, created_at, clients(nome, telefone)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProjetos((data as Projeto[]) || []);
    } catch (err) {
      console.error("Erro ao carregar projetos:", err);
    } finally {
      setLoading(false);
    }
  };

  const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL as string;

  const notifyStatusChange = async (projeto: Projeto, novoStatus: Status) => {
    const telefone = projeto.clients?.telefone;
    if (!telefone || !N8N_WEBHOOK_URL) return;
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefone,
          cliente_nome: projeto.clients?.nome ?? "",
          ambiente: projeto.titulo_ambiente,
          status_anterior:
            COLUNAS.find((c) => c.status === projeto.status)?.label ??
            projeto.status,
          status_novo:
            COLUNAS.find((c) => c.status === novoStatus)?.label ?? novoStatus,
          projeto_id: projeto.id,
        }),
      });
    } catch (err) {
      console.warn("Aviso: falha ao notificar n8n:", err);
    }
  };

  const moverStatus = async (
    projeto: Projeto,
    direcao: "avancar" | "voltar",
  ) => {
    const idx = STATUS_ORDER.indexOf(projeto.status);
    const novoIdx = direcao === "avancar" ? idx + 1 : idx - 1;
    if (novoIdx < 0 || novoIdx >= STATUS_ORDER.length) return;

    const novoStatus = STATUS_ORDER[novoIdx];
    setUpdating(projeto.id);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: novoStatus })
        .eq("id", projeto.id);
      if (error) throw error;
      setProjetos((prev) =>
        prev.map((p) =>
          p.id === projeto.id ? { ...p, status: novoStatus } : p,
        ),
      );
      // Dispara notificacao WhatsApp em background (nao bloqueia UI)
      notifyStatusChange(projeto, novoStatus);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  if (loading) {
    return (
      <div role="status" aria-label="Carregando projetos" className="space-y-8">
        <div className="space-y-3">
          <div className="esqueleto h-3 w-32" />
          <div className="esqueleto h-10 w-80 max-w-full" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="esqueleto h-80 w-[17.5rem] flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="entrada">
        <p className="etiqueta">Chão de fábrica</p>
        <h1 className="titulo-pagina mt-2">Pipeline de produção</h1>
        <p className="mt-2 text-primor-muted">
          Acompanhe o andamento dos projetos por etapa
        </p>
        <div aria-hidden="true" className="regua mt-8" />
      </header>

      {/* Board */}
      <div
        role="region"
        aria-label="Etapas de produção"
        tabIndex={0}
        className="-mx-4 snap-x snap-mandatory overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0"
      >
        <ol className="flex min-w-max gap-4">
          {COLUNAS.map((coluna, colunaIdx) => {
            const cards = projetos.filter((p) => p.status === coluna.status);
            const ultima = colunaIdx === COLUNAS.length - 1;
            return (
              <li
                key={coluna.status}
                aria-labelledby={`coluna-${coluna.status}`}
                className="flex w-[17.5rem] flex-shrink-0 snap-start flex-col rounded-lg bg-primor-paper-deep/70"
              >
                {/* Header da coluna: etiqueta de gaveta */}
                <div className="flex items-center justify-between gap-2 border-b border-primor-line px-4 py-3">
                  <h2 id={`coluna-${coluna.status}`} className="flex items-baseline gap-2">
                    <span aria-hidden="true" className="font-mono text-xs text-primor-muted tabular">
                      {String(colunaIdx + 1).padStart(2, "0")}
                    </span>
                    <span className="font-semibold text-primor-secondary">{coluna.label}</span>
                  </h2>
                  <span
                    className={`min-w-[1.75rem] rounded-sm px-1.5 py-0.5 text-center font-mono text-xs font-medium tabular ${
                      ultima ? "bg-[#eef7f1] text-[#05603a]" : "bg-white text-primor-secondary"
                    }`}
                  >
                    <span className="sr-only">Projetos nesta etapa: </span>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <ul className="min-h-[24rem] flex-1 space-y-2.5 p-2.5">
                  {cards.length === 0 && (
                    <li className="flex h-24 items-center justify-center rounded-md border border-dashed border-primor-line-strong/60 text-sm text-primor-muted">
                      Nenhum projeto
                    </li>
                  )}
                  {cards.map((projeto) => {
                    const idx = STATUS_ORDER.indexOf(projeto.status);
                    const isUpdating = updating === projeto.id;
                    const nome = projeto.clients?.nome ?? projeto.titulo_ambiente;
                    return (
                      <li key={projeto.id} className="panel fita space-y-3 py-3 pl-4 pr-3">
                        <div className="flex items-start gap-2">
                          <User aria-hidden="true" strokeWidth={1.75} className="mt-0.5 h-4 w-4 flex-shrink-0 text-primor-muted" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-primor-secondary">
                              {projeto.clients?.nome ?? "—"}
                            </p>
                            <p className="truncate text-sm text-primor-muted">
                              {projeto.titulo_ambiente}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-xs text-primor-muted tabular">
                          <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
                          {formatDate(projeto.created_at)}
                        </div>
                        {/* Controles de navegação */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => moverStatus(projeto, "voltar")}
                            disabled={idx === 0 || isUpdating}
                            aria-label={`Voltar ${nome} para a etapa anterior`}
                            className="btn btn-outline btn-sm px-2 disabled:opacity-40"
                          >
                            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                            Voltar
                          </button>
                          <button
                            type="button"
                            onClick={() => moverStatus(projeto, "avancar")}
                            disabled={
                              idx === STATUS_ORDER.length - 1 || isUpdating
                            }
                            aria-label={`Avançar ${nome} para a próxima etapa`}
                            className="btn btn-secondary btn-sm px-2 disabled:opacity-40"
                          >
                            {isUpdating ? (
                              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <span>Avançar</span>
                                <ChevronRight aria-hidden="true" className="h-4 w-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
