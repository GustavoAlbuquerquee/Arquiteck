import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  X,
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
  // Estação selecionada no painel do topo (só filtra a lista na tela)
  const [filtro, setFiltroEstado] = useState<Status | null>(null);
  // Projetos movidos com o filtro ativo continuam visíveis até trocar o filtro,
  // para a ripa animar até a nova estação em vez de a faixa sumir da lista
  const [mantidos, setMantidos] = useState<string[]>([]);
  const setFiltro = (novo: Status | null) => {
    setFiltroEstado(novo);
    setMantidos([]);
  };
  const mover = (projeto: Projeto, direcao: "avancar" | "voltar") => {
    if (filtro) setMantidos((atual) => [...atual, projeto.id]);
    moverStatus(projeto, direcao);
  };

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

  // Há quantos dias o projeto foi criado (o banco não guarda a data de cada etapa)
  const tempoDesde = (d: string | null) => {
    if (!d) return null;
    const dias = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));
    if (dias === 0) return "criado hoje";
    return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
  };

  if (loading) {
    // Esqueleto no formato da linha de produção: painel de estações + faixas
    return (
      <div role="status" aria-label="Carregando projetos" className="space-y-8">
        <div className="space-y-3">
          <div className="esqueleto h-3 w-32" />
          <div className="esqueleto h-10 w-80 max-w-full" />
        </div>
        <div className="esqueleto h-40 w-full" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel flex flex-col gap-4 p-5 xl:flex-row xl:items-center">
              <div className="w-56 max-w-full space-y-2">
                <div className="esqueleto h-4 w-40" />
                <div className="esqueleto h-3 w-28" />
              </div>
              <div className="esqueleto h-3 w-full xl:w-auto xl:flex-1" />
              <div className="esqueleto h-11 w-full xl:w-64" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const contagem = (status: Status) => projetos.filter((p) => p.status === status).length;
  const visiveis = filtro
    ? projetos.filter((p) => p.status === filtro || mantidos.includes(p.id))
    : projetos;
  const rotuloFiltro = COLUNAS.find((c) => c.status === filtro)?.label;

  return (
    <div className="space-y-8">
      <header className="entrada">
        <p className="etiqueta">Chão de fábrica</p>
        <h1 className="titulo-pagina mt-2">Linha de produção</h1>
        <p className="mt-2 text-primor-muted">
          Acompanhe o andamento dos projetos por etapa
        </p>
      </header>

      {/* Estações: marcos numa trena contínua. Cada uma filtra a lista. */}
      <section
        aria-labelledby="titulo-estacoes"
        className="panel entrada px-3 pb-4 pt-5 sm:px-6"
        style={{ ["--i" as string]: 1 }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
          <div>
            <h2 id="titulo-estacoes" className="etiqueta">
              Estações da linha
            </h2>
            <p className="mt-0.5 text-sm text-primor-muted">
              Toque numa estação para ver só os projetos dela
            </p>
          </div>
          {filtro && (
            <button
              type="button"
              onClick={() => setFiltro(null)}
              className="btn btn-quiet btn-sm -mr-2 text-primor-primary-ink"
            >
              <X aria-hidden="true" className="h-4 w-4" />
              Limpar filtro
            </button>
          )}
        </div>

        <div className="relative">
          {/* A fita da trena passa pelo centro de cada marco (10%, 30%, ... 90%) */}
          <div
            aria-hidden="true"
            className="trena absolute left-[10%] right-[10%] top-[1.375rem] h-2 -translate-y-1/2 rounded-[2px]"
          />
          <ol className="relative grid grid-cols-5">
            {COLUNAS.map((coluna, i) => {
              const total = contagem(coluna.status);
              const ativa = filtro === coluna.status;
              const ultima = i === COLUNAS.length - 1;
              return (
                <li key={coluna.status} className="flex justify-center">
                  <button
                    type="button"
                    aria-pressed={ativa}
                    onClick={() => setFiltro(ativa ? null : coluna.status)}
                    className="group flex min-h-[44px] w-full flex-col items-center rounded-md px-0.5 pb-2 pt-3 text-center"
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-5 w-5 rounded-full border-2 transition-[background-color,box-shadow] duration-200 ${
                        ativa
                          ? "border-primor-secondary bg-primor-secondary shadow-[0_0_0_4px_rgba(240,160,45,0.55)]"
                          : total > 0
                            ? ultima
                              ? "border-[#067647] bg-[#067647]"
                              : "border-primor-secondary bg-white group-hover:bg-primor-paper-deep"
                            : "border-primor-line-strong bg-white group-hover:bg-primor-paper-deep"
                      }`}
                    />
                    <span aria-hidden="true" className="mt-2 font-mono text-[11px] text-primor-muted tabular">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`mt-0.5 block min-h-[2rem] text-xs leading-tight sm:min-h-0 sm:text-sm ${
                        ativa
                          ? "font-semibold text-primor-secondary underline decoration-primor-primary decoration-2 underline-offset-4"
                          : "font-medium text-primor-secondary group-hover:underline group-hover:decoration-primor-line-strong group-hover:underline-offset-4"
                      }`}
                    >
                      {coluna.label}
                    </span>
                    <span className="mt-1 font-mono text-2xl font-medium text-primor-secondary tabular sm:text-3xl">
                      <span className="sr-only">, </span>
                      {total}
                      <span className="sr-only"> {total === 1 ? "projeto" : "projetos"}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Lista: cada projeto é uma faixa com a sua posição na trena */}
      <section aria-labelledby="titulo-projetos" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-projetos" className="titulo-secao">
            {rotuloFiltro ? `Em ${rotuloFiltro}` : "Todos os projetos"}
          </h2>
          <p aria-live="polite" className="font-mono text-sm text-primor-muted tabular">
            {visiveis.length} {visiveis.length === 1 ? "projeto" : "projetos"}
          </p>
        </div>

        {visiveis.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border-[1.5px] border-dashed border-primor-line-strong bg-primor-bg-light px-6 py-12 text-center">
            <div aria-hidden="true" className="regua w-40" />
            <p className="mt-5 font-display text-lg font-semibold text-primor-secondary">
              {filtro ? "Nenhum projeto nesta estação" : "Nenhum projeto na linha ainda"}
            </p>
            {filtro && (
              <button
                type="button"
                onClick={() => setFiltro(null)}
                className="btn btn-outline mt-5"
              >
                Ver todas as estações
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {visiveis.map((projeto) => {
              const idx = STATUS_ORDER.indexOf(projeto.status);
              const isUpdating = updating === projeto.id;
              const nome = projeto.clients?.nome ?? projeto.titulo_ambiente;
              const anterior = idx > 0 ? COLUNAS[idx - 1].label : null;
              const proxima = idx < COLUNAS.length - 1 ? COLUNAS[idx + 1].label : null;
              const etapaAtual = COLUNAS[idx]?.label ?? projeto.status;
              const concluido = idx === COLUNAS.length - 1;
              const posicao = 10 + Math.max(idx, 0) * 20; // centro da estação, em %
              const tempo = tempoDesde(projeto.created_at);

              return (
                <li
                  key={projeto.id}
                  className="panel fita grid grid-cols-1 gap-x-8 overflow-hidden gap-y-4 py-4 pl-6 pr-4 sm:pr-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center xl:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto] xl:py-5"
                >
                  {/* Cliente, ambiente e data */}
                  <div className="min-w-0 md:col-start-1 md:row-start-1">
                    <p className="break-words font-display text-lg font-semibold leading-snug text-primor-secondary">
                      {projeto.clients?.nome ?? "—"}
                    </p>
                    <p className="truncate text-sm text-primor-muted">{projeto.titulo_ambiente}</p>
                    <p className="mt-1 font-mono text-xs text-primor-muted tabular">
                      {formatDate(projeto.created_at)}
                      {tempo && <> · {tempo}</>}
                    </p>
                  </div>

                  {/* Trena do projeto: a ripa vai até a estação atual */}
                  <div className="md:col-span-2 md:row-start-2 xl:col-span-1 xl:col-start-2 xl:row-start-1">
                    <p className="sr-only">
                      Etapa atual: {etapaAtual}, {idx + 1} de {COLUNAS.length}.
                    </p>
                    <div aria-hidden="true" className="mb-2 flex items-baseline justify-between md:hidden xl:flex 2xl:hidden">
                      <span className="font-mono text-[11px] text-primor-muted tabular">
                        {String(idx + 1).padStart(2, "0")}/{String(COLUNAS.length).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-semibold text-primor-secondary">{etapaAtual}</span>
                    </div>
                    <div aria-hidden="true" className="relative h-3 overflow-x-clip">
                      {/* trilho */}
                      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primor-line" />
                      {/* ripa âmbar, revelada até a estação atual */}
                      <div
                        className={`absolute inset-0 rounded-[2px] transition-[clip-path] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none ${
                          concluido ? "bg-[#067647]" : "trena"
                        }`}
                        style={{ clipPath: `inset(0 ${100 - posicao}% 0 0 round 2px)` }}
                      />
                      {/* marcos das estações */}
                      {COLUNAS.map((c, i) => (
                        <span
                          key={c.status}
                          className={`absolute top-1/2 h-4 w-px -translate-y-1/2 ${
                            i <= idx ? "bg-primor-secondary/60" : "bg-primor-line-strong"
                          }`}
                          style={{ left: `${10 + i * 20}%` }}
                        />
                      ))}
                      {/* marcador da estação atual */}
                      <div
                        className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
                        style={{ transform: `translateX(${posicao}%)` }}
                      >
                        <span
                          className={`absolute left-0 top-1/2 block h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-chapa ${
                            concluido ? "bg-[#067647]" : "bg-primor-secondary"
                          }`}
                        />
                      </div>
                    </div>
                    {/* nomes das estações sob a trena (telas largas) */}
                    <div aria-hidden="true" className="mt-2 hidden grid-cols-5 md:grid xl:hidden 2xl:grid">
                      {COLUNAS.map((c, i) => (
                        <span
                          key={c.status}
                          className={`truncate px-0.5 text-center text-[11px] ${
                            i === idx ? "font-semibold text-primor-secondary" : "text-primor-muted"
                          }`}
                        >
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Controles de navegação */}
                  <div className="grid grid-cols-2 gap-2 md:col-start-2 md:row-start-1 md:w-[17rem] xl:col-start-3 xl:w-[16rem]">
                    <button
                      type="button"
                      onClick={() => mover(projeto, "voltar")}
                      disabled={idx === 0 || isUpdating}
                      className="btn btn-outline btn-sm flex-col !gap-0 px-2 py-1 leading-tight disabled:opacity-40"
                    >
                      <span className="inline-flex items-center gap-1">
                        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                        Voltar
                      </span>
                      {anterior ? (
                        <span className="text-[11px] font-medium text-primor-muted">
                          <span className="sr-only"> {nome}</span> para {anterior}
                        </span>
                      ) : (
                        <span className="sr-only"> (primeira estação)</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => mover(projeto, "avancar")}
                      disabled={
                        idx === STATUS_ORDER.length - 1 || isUpdating
                      }
                      className="btn btn-secondary btn-sm flex-col !gap-0 px-2 py-1 leading-tight disabled:opacity-40"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                          <span className="sr-only">Atualizando etapa</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1">
                            Avançar
                            <ChevronRight aria-hidden="true" className="h-4 w-4" />
                          </span>
                          {proxima ? (
                            <span className="text-[11px] font-medium text-white/85">
                              <span className="sr-only"> {nome}</span> para {proxima}
                            </span>
                          ) : (
                            <span className="sr-only"> (projeto concluído)</span>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
