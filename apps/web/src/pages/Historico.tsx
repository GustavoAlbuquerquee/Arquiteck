import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  User,
  Home,
  FileText,
  Loader2,
  FolderOpen,
  Plus,
  Eye,
  FileDown,
  Edit,
  Trash2,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import html2pdf from "html2pdf.js";

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
    console.log("📋 Detalhes do Projeto:", projeto);
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
      const { error } = await supabase.from('projects').delete().eq('id', briefingToDelete);
      if (error) throw error;
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
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-gray-100 text-gray-800 border-gray-300";
    const colors: Record<string, string> = {
      orcamento: "bg-amber-100 text-amber-800 border-amber-300",
      pre_producao: "bg-orange-100 text-orange-800 border-orange-300",
      producao:
        "bg-primor-primary/20 text-primor-secondary border-primor-primary",
      instalacao: "bg-yellow-100 text-yellow-800 border-yellow-300",
      concluido: "bg-green-100 text-green-800 border-green-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-primor-primary animate-spin mx-auto mb-4" />
          <p className="text-xl text-primor-gray-dark">
            Carregando briefings...
          </p>
        </div>
      </div>
    );
  }

  // Empty State
  if (projetos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="bg-gray-100 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="w-16 h-16 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-primor-text-light mb-3">
            Nenhum briefing encontrado
          </h2>
          <p className="text-primor-gray-dark mb-6">
            Que tal registrar sua primeira visita?
          </p>
          <button
            onClick={() => navigate("/nova-visita")}
            className="flex items-center gap-2 px-8 h-14 bg-primor-primary hover:brightness-110 text-primor-text-dark font-semibold rounded-lg transition text-lg mx-auto shadow-md"
          >
            <Plus className="w-6 h-6" />
            Criar Primeiro Briefing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primor-text-light">
            Histórico de Briefings
          </h1>
          <p className="text-sm md:text-base text-primor-gray-dark mt-2">
            {projetos.length}{" "}
            {projetos.length === 1
              ? "briefing encontrado"
              : "briefings encontrados"}
          </p>
        </div>
        <button
          onClick={() => navigate("/nova-visita")}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 md:px-6 h-12 bg-primor-primary hover:brightness-110 text-primor-text-dark font-semibold rounded-lg transition shadow-md"
        >
          <Plus className="w-5 h-5" />
          Novo Briefing
        </button>
      </div>

      {/* Lista de Projetos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {projetos.map((projeto) => (
          <div
            key={projeto.id}
            className="bg-primor-bg rounded-xl shadow-md border-2 border-primor-gray-medium hover:border-primor-primary transition-all p-4 md:p-6"
          >
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                  projeto.status,
                )}`}
              >
                {getStatusLabel(projeto.status)}
              </span>
              <span className="text-sm text-primor-gray-dark">
                {formatDate(projeto.created_at)}
              </span>
            </div>

            {/* Informações Principais */}
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-primor-gray-dark flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-primor-gray-dark">Cliente</p>
                  <p className="text-lg font-semibold text-primor-text-light">
                    {projeto.clients.nome}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Home className="w-5 h-5 text-primor-gray-dark flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-primor-gray-dark">Ambiente</p>
                  <p className="text-lg font-semibold text-primor-text-light">
                    {projeto.titulo_ambiente}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primor-gray-dark flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-primor-gray-dark">
                    Data do Atendimento
                  </p>
                  <p className="text-lg font-semibold text-primor-text-light">
                    {formatDate(projeto.data_prevista_instalacao)}
                  </p>
                </div>
              </div>

              {projeto.checklists.length > 0 && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primor-gray-dark flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-primor-gray-dark">Checklists</p>
                    <p className="text-lg font-semibold text-primor-text-light">
                      {projeto.checklists.length}{" "}
                      {projeto.checklists.length === 1
                        ? "checklist"
                        : "checklists"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Botão Ver Detalhes */}
            <button
              onClick={() => handleVerDetalhes(projeto)}
              className="w-full flex items-center justify-center gap-2 h-10 md:h-12 bg-primor-primary hover:brightness-110 text-primor-text-dark font-semibold rounded-lg transition shadow-md text-sm md:text-base"
            >
              <Eye className="w-5 h-5" />
              Ver Detalhes
            </button>
          </div>
        ))}
      </div>

      {/* Modal de Detalhes */}
      {showModal && selectedProjeto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-primor-bg rounded-xl shadow-2xl w-[95%] md:w-[90%] lg:w-3/4 max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="sticky top-0 bg-primor-bg border-b-2 border-primor-gray-medium p-4 md:p-6 flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-primor-text-light">
                Detalhes do Briefing
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-primor-gray-dark hover:text-primor-text-light text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Informações do Cliente */}
              <div>
                <h3 className="text-lg font-bold text-primor-text-light mb-3">
                  Cliente
                </h3>
                <div className="bg-primor-bg-light rounded-lg p-4 space-y-2">
                  <p>
                    <strong>Nome:</strong> {selectedProjeto.clients.nome}
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
                </div>
              </div>

              {/* Informações do Projeto */}
              <div>
                <h3 className="text-lg font-bold text-primor-text-light mb-3">
                  Projeto
                </h3>
                <div className="bg-primor-bg-light rounded-lg p-4 space-y-2">
                  <p>
                    <strong>Ambiente:</strong> {selectedProjeto.titulo_ambiente}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      className={`px-2 py-1 rounded text-sm ${getStatusColor(
                        selectedProjeto.status,
                      )}`}
                    >
                      {getStatusLabel(selectedProjeto.status)}
                    </span>
                  </p>
                  <p>
                    <strong>Data do Atendimento:</strong>{" "}
                    {formatDate(selectedProjeto.data_prevista_instalacao)}
                  </p>
                  <p>
                    <strong>Criado em:</strong>{" "}
                    {formatDate(selectedProjeto.created_at)}
                  </p>
                </div>
              </div>

              {/* Checklists */}
              {selectedProjeto.checklists.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-primor-text-light mb-3">
                    Checklists
                  </h3>
                  {selectedProjeto.checklists.map((checklist) => (
                    <div
                      key={checklist.id}
                      className="bg-primor-bg-light rounded-lg p-4 mb-3"
                    >
                      <p className="mb-2">
                        <strong>Tipo:</strong>{" "}
                        <span className="capitalize">
                          {checklist.tipo_etapa.replace("_", " ")}
                        </span>
                      </p>
                      <p className="text-sm text-primor-gray-dark mb-3">
                        Criado em: {formatDate(checklist.created_at)}
                      </p>

                      {/* Payload do Checklist */}
                      {checklist.payload && (
                        <div className="space-y-3">
                          {/* Móveis */}
                          {checklist.payload.moveis &&
                            checklist.payload.moveis.length > 0 && (
                              <div>
                                <p className="font-semibold mb-2">Móveis:</p>
                                <div className="space-y-2">
                                  {checklist.payload.moveis.map(
                                    (movel: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="bg-primor-bg p-3 rounded border border-primor-gray-medium"
                                      >
                                        <p className="font-medium text-primor-text-light">
                                          {movel.nome}
                                        </p>
                                        <p className="text-sm text-primor-gray-dark">
                                          {movel.largura}cm × {movel.altura}cm ×{" "}
                                          {movel.profundidade}cm
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
                                <p className="font-semibold mb-2">
                                  Eletrodomésticos:
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
                              <p className="font-semibold mb-2">Materiais:</p>
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
                              <p className="font-semibold mb-2 text-red-600">
                                Pontos Críticos / Atenção:
                              </p>
                              <p className="text-sm whitespace-pre-wrap bg-red-50 p-3 rounded border border-red-200 text-red-800">
                                {checklist.payload.pontosCriticos}
                              </p>
                            </div>
                          )}

                          {/* Observações */}
                          {checklist.payload.observacoes && (
                            <div>
                              <p className="font-semibold mb-2">Observações:</p>
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
                            <div className="pt-4 mt-4 border-t border-gray-200">
                              <h4 className="text-md font-bold text-gray-800 mb-4">
                                Mídias e Anexos
                              </h4>

                              {/* Assinatura */}
                              {(checklist.payload.assinatura_url ||
                                checklist.payload.assinatura) && (
                                <div className="mb-5">
                                  <p className="font-medium text-sm text-gray-600 mb-2">
                                    Assinatura do Cliente:
                                  </p>
                                  <img
                                    src={
                                      checklist.payload.assinatura_url ||
                                      checklist.payload.assinatura
                                    }
                                    alt="Assinatura do Cliente"
                                    className="max-h-32 object-contain border bg-white rounded p-2"
                                  />
                                </div>
                              )}

                              {/* Fotos do Ambiente */}
                              {((checklist.payload.fotosAmbiente &&
                                checklist.payload.fotosAmbiente.length > 0) ||
                                (checklist.payload.fotos &&
                                  checklist.payload.fotos.length > 0)) && (
                                <div>
                                  <p className="font-medium text-sm text-gray-600 mb-2">
                                    Fotos do Ambiente:
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                                    {(
                                      checklist.payload.fotosAmbiente ||
                                      checklist.payload.fotos ||
                                      []
                                    ).map((fotoUrl: string, idx: number) => (
                                      <a
                                        href={fotoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        key={idx}
                                        className="block transition hover:opacity-80"
                                      >
                                        <img
                                          src={fotoUrl}
                                          alt={`Foto do ambiente ${idx + 1}`}
                                          className="w-full h-32 object-cover rounded-lg shadow-sm border border-gray-200"
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
                </div>
              )}
            </div>

            {/* Footer do Modal com Ações */}
            <div className="sticky bottom-0 bg-primor-bg border-t-2 border-primor-gray-medium p-4 md:p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDownloadPDF}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 h-10 md:h-12 bg-primor-primary hover:brightness-110 text-primor-text-dark font-semibold rounded-lg transition shadow-md text-sm md:text-base"
                >
                  <FileDown className="w-5 h-5" />
                  Baixar PDF
                </button>
                <button
                  onClick={handleEdit}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 h-10 md:h-12 bg-primor-secondary hover:brightness-110 text-primor-text-dark font-semibold rounded-lg transition shadow-md text-sm md:text-base"
                >
                  <Edit className="w-5 h-5" />
                  Editar
                </button>
                {userRole === 'admin' && (
                  <button
                    onClick={() => setBriefingToDelete(selectedProjeto.id)}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 h-10 md:h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition shadow-md text-sm md:text-base"
                  >
                    <Trash2 className="w-5 h-5" />
                    Excluir
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full sm:flex-1 h-10 md:h-12 bg-primor-gray-medium hover:brightness-95 text-primor-text-light font-semibold rounded-lg transition text-sm md:text-base"
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
          <div ref={pdfRef} className="w-[210mm] bg-white p-8">
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
                            src={foto}
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
                    src={selectedProjeto.checklists[0].payload.assinatura_url}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Excluir Briefing</h3>
            <p className="text-gray-600 text-sm">
              Tem certeza que deseja excluir este briefing definitivamente? Todos os dados serão perdidos.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setBriefingToDelete(null)}
                className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
