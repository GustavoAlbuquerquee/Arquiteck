import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { caminhoNoBucket } from "@/lib/supabase/storage";
import { useUrlsAssinadas } from "@/lib/useUrlsAssinadas";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  Home,
  FileText,
  FolderOpen,
  Plus,
  Eye,
  FileDown,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import { classeSeloEtapa } from "@/components/marca/Etapas";
import { useNavigate, useSearchParams } from "react-router-dom";
import html2pdf from "html2pdf.js";
import { formatarData } from "@/lib/date";

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
}

interface Checklist {
  id: string;
  tipo_etapa: string;
  payload: any;
  created_at: string | null;
}

interface Projeto {
  id: string;
  titulo_ambiente: string;
  status: string | null;
  data_prevista_instalacao: string | null;
  created_at: string | null;
  clients: Cliente;
  checklists: Checklist[];
}

interface Tenant {
  nome_fantasia: string;
  telefone: string | null;
  logo_url: string | null;
}

export function Historico() {
  const { user } = useAuth();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);
  const [showModal, setShowModal] = useState(false);
  // Fotos e assinaturas ficam no bucket privado: exibidas por URL assinada
  const urlDaImagem = useUrlsAssinadas(
    (selectedProjeto?.checklists ?? []).flatMap((c) => {
      const p = c.payload ?? {};
      return [p.assinatura_url, p.assinatura, ...(p.fotosAmbiente ?? []), ...(p.fotos ?? [])];
    }),
  );
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'membro' | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      loadProjetos();
      loadTenant();
    }
  }, [user]);

  // Auto-abre o projeto quando vem do deep link do Dashboard
  useEffect(() => {
    const urlProjetoId = searchParams.get('projetoId');
    if (!urlProjetoId || loading || projetos.length === 0) return;
    const projeto = projetos.find(p => p.id === urlProjetoId);
    if (projeto) {
      setSelectedProjeto(projeto);
      setShowModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [projetos, loading]);

  const loadTenant = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user!.id)
      .maybeSingle();
    if (!profile) return;
    setUserRole(profile.role as 'admin' | 'membro');
    const { data } = await supabase.from('tenants').select('nome_fantasia, telefone, logo_url').eq('id', profile.tenant_id).maybeSingle();
    if (data) setTenant(data as Tenant);
  };

  const loadProjetos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          clients (*),
          checklists (*)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjetos(data || []);
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhes = (projeto: Projeto) => {
    setSelectedProjeto(projeto);
    setShowModal(true);
  };

  const handleDownloadPDF = async () => {
    if (!pdfRef.current || !selectedProjeto) return;

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const opt: any = {
        margin: [10, 10, 10, 10],
        filename: `briefing-${selectedProjeto.clients.nome.replace(/\s+/g, "-")}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt).from(pdfRef.current).save();
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Tente novamente.");
    }
  };

  const handleEdit = () => {
    if (selectedProjeto) {
      navigate(`/nova-visita?edit=${selectedProjeto.id}`);
      setShowModal(false);
    }
  };

  const [briefingToDelete, setBriefingToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!briefingToDelete || userRole !== 'admin') return;
    try {
      const projeto = projetos.find((p) => p.id === briefingToDelete);

      // Fotos e assinaturas de todos os checklists do projeto, para apagar do
      // Storage depois (antes ficavam órfãs no bucket)
      const arquivos = (projeto?.checklists ?? [])
        .flatMap((c) => {
          const p = c.payload ?? {};
          return [p.assinatura_url, p.assinatura, ...(p.fotosAmbiente ?? []), ...(p.fotos ?? [])];
        })
        .filter((url): url is string => typeof url === 'string')
        .map((valor) => caminhoNoBucket(valor, 'vistorias'))
        .filter((path): path is string => !!path);

      // Cada briefing cria o próprio cliente. Se ele não tiver outros projetos,
      // apaga o cliente (o banco apaga projeto e checklists em cascata);
      // senão, só o projeto.
      let apagarCliente = false;
      const clienteId = projeto?.clients?.id;
      if (clienteId) {
        const { count, error: countError } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clienteId);
        if (countError) throw countError;
        apagarCliente = count === 1;
      }

      const { data, error } = apagarCliente
        ? await supabase.from('clients').delete().eq('id', clienteId!).select('id')
        : await supabase.from('projects').delete().eq('id', briefingToDelete).select('id');
      if (error) throw error;
      // A RLS não retorna erro quando bloqueia: apenas nenhuma linha é removida
      if (!data || data.length === 0) throw new Error('sem permissão para excluir este projeto.');

      if (arquivos.length > 0) {
        // Falhar aqui não desfaz a exclusão; os arquivos só ficam no bucket
        const { error: storageError } = await supabase.storage.from('vistorias').remove(arquivos);
        if (storageError) console.error('Erro ao apagar arquivos do briefing:', storageError);
      }

      setBriefingToDelete(null);
      loadProjetos();
      setShowModal(false);
    } catch (error: any) {
      console.error('Erro ao excluir projeto:', error);
      alert('Erro ao excluir projeto: ' + error.message);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Data não informada";
    return formatarData(dateString);
  };

  const getStatusColor = (status: string | null) => classeSeloEtapa(status);

  const getStatusLabel = (status: string | null) => {
    if (!status) return "Sem Status";
    const labels: Record<string, string> = {
      orcamento: "Orçamento",
      pre_producao: "Pré-Produção",
      producao: "Produção",
      instalacao: "Instalação",
      concluido: "Concluído",
    };
    return labels[status] || status;
  };

  // Loading State
  if (loading) {
    return (
      <div role="status" aria-label="Carregando briefings" className="space-y-8">
        <div className="space-y-3">
          <div className="esqueleto h-3 w-32" />
          <div className="esqueleto h-10 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="esqueleto h-56 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  if (projetos.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-lg border border-primor-line bg-primor-surface shadow-chapa">
            <FolderOpen aria-hidden="true" strokeWidth={1.5} className="h-12 w-12 text-primor-line-strong" />
            <div aria-hidden="true" className="regua absolute -bottom-5 left-0" />
          </div>
          <h1 className="titulo-secao mt-10">Nenhum briefing encontrado</h1>
          <p className="mb-7 mt-2 text-primor-muted">
            Que tal registrar sua primeira visita?
          </p>
          <button
            type="button"
            onClick={() => navigate("/nova-visita")}
            className="btn btn-primary btn-lg"
          >
            <Plus aria-hidden="true" className="h-5 w-5" />
            Criar primeiro briefing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Cabeçalho */}
      <header className="entrada mb-8">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="etiqueta">Arquivo de clientes</p>
            <h1 className="titulo-pagina mt-2">Histórico de briefings</h1>
            <p className="mt-2 text-primor-muted">
              <span className="font-mono tabular">{projetos.length}</span>{" "}
              {projetos.length === 1
                ? "briefing encontrado"
                : "briefings encontrados"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/nova-visita")}
            className="btn btn-primary btn-lg w-full md:w-auto"
          >
            <Plus aria-hidden="true" className="h-5 w-5" />
            Novo briefing
          </button>
        </div>
        <div aria-hidden="true" className="regua mt-8" />
      </header>

      {/* Lista de Projetos: cada briefing como uma ficha de peça */}
      <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {projetos.map((projeto, i) => (
          <li
            key={projeto.id}
            className="panel fita entrada group flex flex-col transition-shadow hover:shadow-chapa-lg"
            style={{ ["--i" as string]: Math.min(i, 8) }}
          >
            {/* Etiqueta: status e data de criação */}
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-primor-line py-3 pl-6 pr-5">
              <span
                className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold ${getStatusColor(
                  projeto.status,
                )}`}
              >
                {getStatusLabel(projeto.status)}
              </span>
              <span className="font-mono text-xs text-primor-muted tabular">
                {formatDate(projeto.created_at)}
              </span>
            </div>

            {/* Informações Principais */}
            <div className="flex-1 py-5 pl-6 pr-5">
              <h2 className="font-display text-xl font-semibold leading-snug text-primor-secondary">
                {projeto.clients.nome}
              </h2>
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <div className="flex items-start gap-2.5">
                  <Home aria-hidden="true" strokeWidth={1.75} className="mt-0.5 h-4 w-4 flex-shrink-0 text-primor-muted" />
                  <div className="min-w-0">
                    <dt className="etiqueta">Ambiente</dt>
                    <dd className="mt-0.5 font-medium text-primor-secondary">
                      {projeto.titulo_ambiente}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar aria-hidden="true" strokeWidth={1.75} className="mt-0.5 h-4 w-4 flex-shrink-0 text-primor-muted" />
                  <div>
                    <dt className="etiqueta">Data do atendimento</dt>
                    <dd className="mt-0.5 font-mono text-sm font-medium text-primor-secondary tabular">
                      {formatDate(projeto.data_prevista_instalacao)}
                    </dd>
                  </div>
                </div>

                {projeto.checklists.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <FileText aria-hidden="true" strokeWidth={1.75} className="mt-0.5 h-4 w-4 flex-shrink-0 text-primor-muted" />
                    <div>
                      <dt className="etiqueta">Checklists</dt>
                      <dd className="mt-0.5 font-medium text-primor-secondary">
                        {projeto.checklists.length}{" "}
                        {projeto.checklists.length === 1
                          ? "checklist"
                          : "checklists"}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>

            {/* Botão Ver Detalhes */}
            <div className="pb-5 pl-6 pr-5">
              <button
                type="button"
                onClick={() => handleVerDetalhes(projeto)}
                className="btn btn-outline w-full group-hover:border-primor-secondary"
              >
                <Eye aria-hidden="true" className="h-5 w-5" />
                Ver detalhes
                <span className="sr-only"> de {projeto.clients.nome}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Modal de Detalhes */}
      {showModal && selectedProjeto && (
        <div className="fixed inset-0 z-modal flex items-end justify-center bg-primor-veu/60 p-0 animate-fade-in sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-detalhes"
            className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl bg-primor-bg shadow-chapa-lg dark:ring-1 dark:ring-primor-line sm:rounded-xl"
          >
            {/* Header do Modal */}
            <div className="flex items-start justify-between gap-4 border-b border-primor-line px-5 py-4 md:px-7 md:py-5">
              <div className="min-w-0">
                <p className="etiqueta">Detalhes do briefing</p>
                <h2 id="titulo-detalhes" className="mt-1 truncate font-display text-2xl font-semibold text-primor-secondary">
                  {selectedProjeto.clients.nome}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Fechar detalhes"
                className="btn-icon -mr-2 text-primor-secondary hover:bg-primor-paper-deep"
              >
                <X aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6 md:px-7">
              <div className="grid gap-5 md:grid-cols-2">
                {/* Informações do Cliente */}
                <section>
                  <h3 className="etiqueta mb-2">Cliente</h3>
                  <dl className="space-y-2.5 rounded-md bg-primor-bg-light p-4 text-[15px]">
                    <div>
                      <dt className="text-sm text-primor-muted">Nome</dt>
                      <dd className="font-medium">{selectedProjeto.clients.nome}</dd>
                    </div>
                    {selectedProjeto.clients.telefone && (
                      <div>
                        <dt className="text-sm text-primor-muted">Telefone</dt>
                        <dd className="font-mono tabular">{selectedProjeto.clients.telefone}</dd>
                      </div>
                    )}
                    {selectedProjeto.clients.endereco && (
                      <div>
                        <dt className="text-sm text-primor-muted">Endereço</dt>
                        <dd>{selectedProjeto.clients.endereco}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                {/* Informações do Projeto */}
                <section>
                  <h3 className="etiqueta mb-2">Projeto</h3>
                  <dl className="space-y-2.5 rounded-md bg-primor-bg-light p-4 text-[15px]">
                    <div>
                      <dt className="text-sm text-primor-muted">Ambiente</dt>
                      <dd className="font-medium">{selectedProjeto.titulo_ambiente}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-primor-muted">Status</dt>
                      <dd className="mt-1">
                        <span
                          className={`inline-flex rounded-sm border px-2 py-0.5 text-xs font-semibold ${getStatusColor(
                            selectedProjeto.status,
                          )}`}
                        >
                          {getStatusLabel(selectedProjeto.status)}
                        </span>
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-sm text-primor-muted">Atendimento</dt>
                        <dd className="font-mono text-sm tabular">
                          {formatDate(selectedProjeto.data_prevista_instalacao)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-primor-muted">Criado em</dt>
                        <dd className="font-mono text-sm tabular">
                          {formatDate(selectedProjeto.created_at)}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </section>
              </div>

              {/* Checklists */}
              {selectedProjeto.checklists.length > 0 && (
                <section>
                  <h3 className="etiqueta mb-2">Checklists</h3>
                  {selectedProjeto.checklists.map((checklist) => (
                    <div
                      key={checklist.id}
                      className="mb-3 rounded-md border border-primor-line bg-primor-bg-light p-4 md:p-5"
                    >
                      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold capitalize">
                          {checklist.tipo_etapa.replace("_", " ")}
                        </p>
                        <p className="font-mono text-xs text-primor-muted tabular">
                          Criado em {formatDate(checklist.created_at)}
                        </p>
                      </div>

                      {/* Payload do Checklist */}
                      {checklist.payload && (
                        <div className="space-y-3">
                          {/* Móveis */}
                          {checklist.payload.moveis &&
                            checklist.payload.moveis.length > 0 && (
                              <div>
                                <p className="mb-2 font-semibold">Móveis</p>
                                <div className="space-y-2">
                                  {checklist.payload.moveis.map(
                                    (movel: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="fita flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border border-primor-line bg-primor-surface py-3 pl-5 pr-4"
                                      >
                                        <p className="font-medium text-primor-secondary">
                                          {movel.nome}
                                        </p>
                                        <p className="font-mono text-sm text-primor-muted tabular">
                                          {movel.largura} × {movel.altura} ×{" "}
                                          {movel.profundidade} mm
                                        </p>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Eletrodomésticos */}
                          {checklist.payload.eletrodomesticos &&
                            checklist.payload.eletrodomesticos.length > 0 && (
                              <div>
                                <p className="mb-2 font-semibold">
                                  Eletrodomésticos
                                </p>
                                <ul className="list-disc list-inside space-y-1">
                                  {checklist.payload.eletrodomesticos.map(
                                    (eletro: any, idx: number) => (
                                      <li key={idx}>
                                        {eletro.nome}
                                        {eletro.modelo && ` - ${eletro.modelo}`}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}

                          {/* Materiais */}
                          {checklist.payload.preferenciaMateriais && (
                            <div>
                              <p className="mb-2 font-semibold">Materiais</p>
                              <p className="text-sm">
                                <strong>MDF:</strong>{" "}
                                {
                                  checklist.payload.preferenciaMateriais
                                    .corPadraoMdf
                                }
                              </p>
                              <p className="text-sm">
                                <strong>Puxador:</strong>{" "}
                                {
                                  checklist.payload.preferenciaMateriais
                                    .tipoPuxador
                                }
                              </p>
                            </div>
                          )}

                          {/* Pontos Críticos */}
                          {checklist.payload.pontosCriticos && (
                            <div>
                              <p className="mb-2 font-semibold text-primor-erro">
                                Pontos críticos / atenção
                              </p>
                              <p className="alerta alerta-erro whitespace-pre-wrap">
                                {checklist.payload.pontosCriticos}
                              </p>
                            </div>
                          )}

                          {/* Observações */}
                          {checklist.payload.observacoes && (
                            <div>
                              <p className="mb-2 font-semibold">Observações</p>
                              <p className="text-sm whitespace-pre-wrap">
                                {checklist.payload.observacoes}
                              </p>
                            </div>
                          )}

                          {/* Mídias e Anexos (Fotos e Assinatura) */}
                          {(checklist.payload.assinatura_url ||
                            checklist.payload.assinatura ||
                            (checklist.payload.fotosAmbiente &&
                              checklist.payload.fotosAmbiente.length > 0) ||
                            (checklist.payload.fotos &&
                              checklist.payload.fotos.length > 0)) && (
                            <div className="mt-4 border-t border-dashed border-primor-line pt-4">
                              <h4 className="etiqueta mb-4">
                                Mídias e anexos
                              </h4>

                              {/* Assinatura */}
                              {(checklist.payload.assinatura_url ||
                                checklist.payload.assinatura) && (
                                <div className="mb-5">
                                  <p className="mb-2 text-sm font-medium text-primor-muted">
                                    Assinatura do cliente
                                  </p>
                                  <img
                                    src={urlDaImagem(
                                      checklist.payload.assinatura_url ||
                                        checklist.payload.assinatura,
                                    )}
                                    alt="Assinatura do Cliente"
                                    // Papel branco nos dois temas: o traço da assinatura é escuro
                                    className="max-h-32 rounded-md border border-primor-line bg-white object-contain p-2"
                                  />
                                </div>
                              )}

                              {/* Fotos do Ambiente */}
                              {((checklist.payload.fotosAmbiente &&
                                checklist.payload.fotosAmbiente.length > 0) ||
                                (checklist.payload.fotos &&
                                  checklist.payload.fotos.length > 0)) && (
                                <div>
                                  <p className="mb-2 text-sm font-medium text-primor-muted">
                                    Fotos do ambiente
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                                    {(
                                      checklist.payload.fotosAmbiente ||
                                      checklist.payload.fotos ||
                                      []
                                    ).map((fotoUrl: string, idx: number) => (
                                      <a
                                        href={urlDaImagem(fotoUrl)}
                                        target="_blank"
                                        rel="noreferrer"
                                        key={idx}
                                        className="block overflow-hidden rounded-md transition-opacity hover:opacity-85"
                                      >
                                        <img
                                          src={urlDaImagem(fotoUrl)}
                                          alt={`Foto do ambiente ${idx + 1} (abre em nova aba)`}
                                          className="h-32 w-full rounded-md border border-primor-line object-cover"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              )}
            </div>

            {/* Footer do Modal com Ações */}
            <div className="border-t border-primor-line bg-primor-bg-light px-5 py-4 md:px-7">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  <FileDown aria-hidden="true" className="h-5 w-5" />
                  Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  <Edit aria-hidden="true" className="h-5 w-5" />
                  Editar
                </button>
                {userRole === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setBriefingToDelete(selectedProjeto.id)}
                    className="btn btn-outline w-full border-primor-erro/50 text-primor-erro hover:!border-primor-erro hover:!bg-primor-erro-bg sm:w-auto"
                  >
                    <Trash2 aria-hidden="true" className="h-5 w-5" />
                    Excluir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-quiet w-full sm:ml-auto sm:w-auto"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template PDF Oculto */}
      {selectedProjeto && selectedProjeto.checklists.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            opacity: 0,
            pointerEvents: "none",
            zIndex: -10,
          }}
        >
          {/* tema-claro: papel branco e tinta escura mesmo com o app no modo escuro */}
          <div ref={pdfRef} className="tema-claro w-[210mm] bg-white p-8">
            <div className="space-y-6">
              <div
                className="flex items-center justify-between border-b-2 border-gray-300 pb-4"
                style={{ pageBreakInside: "avoid" }}
              >
                <div className="flex items-center gap-4">
                  {tenant?.logo_url && (
                    <img src={tenant.logo_url} alt="Logo" style={{ maxHeight: '60px', maxWidth: '120px', objectFit: 'contain' }} />
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{tenant?.nome_fantasia || 'Arquiteck'}</h1>
                    {tenant?.telefone && <p className="text-sm text-gray-500">{tenant.telefone}</p>}
                  </div>
                </div>
                <p className="text-base text-gray-600 font-medium">Briefing de Primeira Visita</p>
              </div>

              <div style={{ pageBreakInside: "avoid" }}>
                <h2 className="text-xl font-bold text-gray-800 mb-3">
                  Dados Básicos
                </h2>
                <p>
                  <strong>Cliente:</strong> {selectedProjeto.clients.nome}
                </p>
                {selectedProjeto.clients.telefone && (
                  <p>
                    <strong>Telefone:</strong>{" "}
                    {selectedProjeto.clients.telefone}
                  </p>
                )}
                {selectedProjeto.clients.endereco && (
                  <p>
                    <strong>Endereço:</strong>{" "}
                    {selectedProjeto.clients.endereco}
                  </p>
                )}
                <p>
                  <strong>Ambiente:</strong> {selectedProjeto.titulo_ambiente}
                </p>
                <p>
                  <strong>Data:</strong>{" "}
                  {formatDate(selectedProjeto.data_prevista_instalacao)}
                </p>
                {selectedProjeto.checklists[0]?.payload?.horarioVisita && (
                  <p>
                    <strong>Horário:</strong>{" "}
                    {selectedProjeto.checklists[0].payload.horarioVisita}
                  </p>
                )}
              </div>

              {selectedProjeto.checklists[0]?.payload?.moveis &&
                selectedProjeto.checklists[0].payload.moveis.length > 0 && (
                  <div style={{ pageBreakInside: "avoid" }}>
                    <h2 className="text-xl font-bold text-gray-800 mb-3">
                      Móveis
                    </h2>
                    {selectedProjeto.checklists[0].payload.moveis.map(
                      (movel: any, idx: number) => (
                        <div
                          key={idx}
                          className="mb-4 p-3 border border-gray-300 rounded"
                          style={{ pageBreakInside: "avoid" }}
                        >
                          <p className="font-bold">{movel.nome}</p>
                          <p>
                            Medidas: {movel.largura}mm × {movel.altura}mm ×{" "}
                            {movel.profundidade}mm
                          </p>
                          <p>
                            MDF Interno: {movel.corMdfInterna} | MDF Externo:{" "}
                            {movel.corMdfExterna}
                          </p>
                          {movel.temPuxador && (
                            <p>
                              Puxador: {movel.tipoPuxador} -{" "}
                              {movel.detalhesPuxador}
                            </p>
                          )}
                          {movel.temCorredicas && (
                            <p>
                              Corrediça: {movel.tipoCorredica} (
                              {movel.finalidadeCorredica})
                            </p>
                          )}
                          {movel.temBascula && (
                            <p>Báscula: {movel.tipoBascula}</p>
                          )}
                          {movel.temPortaVidro && (
                            <p>Porta Vidro: {movel.tipoPortaVidro}</p>
                          )}
                          {movel.temFitaLed && (
                            <p>Fita LED: {movel.tipoFitaLed}</p>
                          )}
                          {movel.observacoesMovel && (
                            <p className="text-sm mt-2">
                              Obs: {movel.observacoesMovel}
                            </p>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}

              {selectedProjeto.checklists[0]?.payload
                ?.especificacoesAmbiente && (
                <div style={{ pageBreakInside: "avoid" }}>
                  <h2 className="text-xl font-bold text-gray-800 mb-3">
                    Especificações do Ambiente
                  </h2>
                  {selectedProjeto.checklists[0].payload.especificacoesAmbiente
                    .rodape && (
                    <>
                      <p>
                        Rodapé:{" "}
                        {
                          selectedProjeto.checklists[0].payload
                            .especificacoesAmbiente.rodape
                        }
                      </p>
                      {selectedProjeto.checklists[0].payload
                        .especificacoesAmbiente.alturaRodape &&
                        selectedProjeto.checklists[0].payload
                          .especificacoesAmbiente.profundidadeRodape && (
                          <p>
                            Dimensões:{" "}
                            {
                              selectedProjeto.checklists[0].payload
                                .especificacoesAmbiente.alturaRodape
                            }
                            mm ×{" "}
                            {
                              selectedProjeto.checklists[0].payload
                                .especificacoesAmbiente.profundidadeRodape
                            }
                            mm
                          </p>
                        )}
                    </>
                  )}
                  {selectedProjeto.checklists[0].payload.especificacoesAmbiente
                    .tipoParede && (
                    <p>
                      Tipo de Parede:{" "}
                      {
                        selectedProjeto.checklists[0].payload
                          .especificacoesAmbiente.tipoParede
                      }
                    </p>
                  )}
                  {selectedProjeto.checklists[0].payload.especificacoesAmbiente
                    .tubulacoesParede && (
                    <p>
                      Tubulações: Sim -{" "}
                      {
                        selectedProjeto.checklists[0].payload
                          .especificacoesAmbiente.localTubulacao
                      }
                    </p>
                  )}
                  <p>
                    Estacionamento:{" "}
                    {selectedProjeto.checklists[0].payload
                      .especificacoesAmbiente.temEstacionamento
                      ? "Sim"
                      : "Não"}
                  </p>
                  {selectedProjeto.checklists[0].payload.especificacoesAmbiente
                    .temElevador && (
                    <p>
                      Elevador:{" "}
                      {
                        selectedProjeto.checklists[0].payload
                          .especificacoesAmbiente.alturaElevador
                      }
                      mm ×{" "}
                      {
                        selectedProjeto.checklists[0].payload
                          .especificacoesAmbiente.profundidadeElevador
                      }
                      mm
                    </p>
                  )}
                </div>
              )}

              {selectedProjeto.checklists[0]?.payload?.eletrodomesticos &&
                selectedProjeto.checklists[0].payload.eletrodomesticos.length >
                  0 && (
                  <div style={{ pageBreakInside: "avoid" }}>
                    <h2 className="text-xl font-bold text-gray-800 mb-3">
                      Eletrodomésticos
                    </h2>
                    {selectedProjeto.checklists[0].payload.eletrodomesticos.map(
                      (e: any, idx: number) => (
                        <p key={idx}>
                          • {e.nome} {e.modelo && `- ${e.modelo}`}
                        </p>
                      ),
                    )}
                  </div>
                )}

              {selectedProjeto.checklists[0]?.payload?.fotosAmbiente &&
                selectedProjeto.checklists[0].payload.fotosAmbiente.length >
                  0 && (
                  <div style={{ pageBreakInside: "avoid" }}>
                    <h2 className="text-xl font-bold text-gray-800 mb-3">
                      Fotos
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedProjeto.checklists[0].payload.fotosAmbiente.map(
                        (foto: string, idx: number) => (
                          <img
                            key={idx}
                            src={urlDaImagem(foto)}
                            alt={`Foto ${idx + 1}`}
                            style={{ maxHeight: "200px", objectFit: "contain" }}
                          />
                        ),
                      )}
                    </div>
                  </div>
                )}

              {selectedProjeto.checklists[0]?.payload?.pontosCriticos && (
                <div style={{ pageBreakInside: "avoid" }}>
                  <h2 className="text-xl font-bold text-red-600 mb-3">
                    Pontos Críticos / Atenção
                  </h2>
                  <p className="whitespace-pre-wrap text-red-800 bg-red-50 p-4 rounded border border-red-200">
                    {selectedProjeto.checklists[0].payload.pontosCriticos}
                  </p>
                </div>
              )}

              {selectedProjeto.checklists[0]?.payload?.observacoes && (
                <div style={{ pageBreakInside: "avoid" }}>
                  <h2 className="text-xl font-bold text-gray-800 mb-3">
                    Observações
                  </h2>
                  <p className="whitespace-pre-wrap">
                    {selectedProjeto.checklists[0].payload.observacoes}
                  </p>
                </div>
              )}

              {selectedProjeto.checklists[0]?.payload?.assinatura_url && (
                <div style={{ pageBreakInside: "avoid" }}>
                  <h2 className="text-xl font-bold text-gray-800 mb-3">
                    Assinatura
                  </h2>
                  <img
                    src={urlDaImagem(selectedProjeto.checklists[0].payload.assinatura_url)}
                    alt="Assinatura"
                    style={{
                      maxWidth: "400px",
                      maxHeight: "150px",
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal de confirmação de exclusão de briefing */}
      {briefingToDelete && createPortal(
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-primor-veu/60 p-4 animate-fade-in">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-excluir-briefing"
            aria-describedby="texto-excluir-briefing"
            className="w-full max-w-md space-y-4 rounded-lg border-t-4 border-primor-erro bg-primor-surface p-6 shadow-chapa-lg dark:ring-1 dark:ring-primor-line"
          >
            <h3 id="titulo-excluir-briefing" className="font-display text-xl font-semibold text-primor-secondary">
              Excluir briefing
            </h3>
            <p id="texto-excluir-briefing" className="text-primor-muted">
              Tem certeza que deseja excluir este briefing definitivamente? Todos os dados serão perdidos.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBriefingToDelete(null)}
                className="btn btn-outline flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-danger flex-1"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
