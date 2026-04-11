import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  created_at: string;
}

interface Projeto {
  id: string;
  titulo_ambiente: string;
  status: string;
  data_prevista_instalacao: string;
  created_at: string;
  clients: Cliente;
  checklists: Checklist[];
}

export function Historico() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);
  const [showModal, setShowModal] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjetos();
  }, []);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      orcamento: "bg-yellow-100 text-yellow-800 border-yellow-300",
      pre_producao: "bg-blue-100 text-blue-800 border-blue-300",
      producao: "bg-purple-100 text-purple-800 border-purple-300",
      instalacao: "bg-orange-100 text-orange-800 border-orange-300",
      concluido: "bg-green-100 text-green-800 border-green-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getStatusLabel = (status: string) => {
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
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-600">Carregando briefings...</p>
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
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Nenhum briefing encontrado
          </h2>
          <p className="text-gray-600 mb-6">
            Que tal registrar sua primeira visita?
          </p>
          <button
            onClick={() => navigate("/nova-visita")}
            className="flex items-center gap-2 px-8 h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-lg mx-auto"
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Histórico de Briefings
          </h1>
          <p className="text-gray-600 mt-2">
            {projetos.length}{" "}
            {projetos.length === 1
              ? "briefing encontrado"
              : "briefings encontrados"}
          </p>
        </div>
        <button
          onClick={() => navigate("/nova-visita")}
          className="flex items-center gap-2 px-6 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Novo Briefing
        </button>
      </div>

      {/* Lista de Projetos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projetos.map((projeto) => (
          <div
            key={projeto.id}
            className="bg-white rounded-xl shadow-md border-2 border-gray-200 hover:border-blue-300 transition-all p-6"
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
              <span className="text-sm text-gray-500">
                {formatDate(projeto.created_at)}
              </span>
            </div>

            {/* Informações Principais */}
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {projeto.clients.nome}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Home className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Ambiente</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {projeto.titulo_ambiente}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Data do Atendimento</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {formatDate(projeto.data_prevista_instalacao)}
                  </p>
                </div>
              </div>

              {projeto.checklists.length > 0 && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Checklists</p>
                    <p className="text-lg font-semibold text-gray-800">
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
              className="w-full flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
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
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                Detalhes do Briefing
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-6">
              {/* Informações do Cliente */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  Cliente
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
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
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  Projeto
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
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
                  <h3 className="text-lg font-bold text-gray-800 mb-3">
                    Checklists
                  </h3>
                  {selectedProjeto.checklists.map((checklist) => (
                    <div
                      key={checklist.id}
                      className="bg-gray-50 rounded-lg p-4 mb-3"
                    >
                      <p className="mb-2">
                        <strong>Tipo:</strong>{" "}
                        <span className="capitalize">
                          {checklist.tipo_etapa.replace("_", " ")}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
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
                                        className="bg-white p-3 rounded border"
                                      >
                                        <p className="font-medium">
                                          {movel.nome}
                                        </p>
                                        <p className="text-sm text-gray-600">
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
            <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-6">
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadPDF}
                  className="flex-1 flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                >
                  <FileDown className="w-5 h-5" />
                  Baixar PDF
                </button>
                <button
                  onClick={handleEdit}
                  className="flex-1 flex items-center justify-center gap-2 h-12 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition"
                >
                  <Edit className="w-5 h-5" />
                  Editar
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-12 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition"
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
                className="text-center border-b-2 border-gray-300 pb-4"
                style={{ pageBreakInside: "avoid" }}
              >
                <h1 className="text-3xl font-bold text-gray-900">Arquiteck</h1>
                <p className="text-lg text-gray-600">
                  Briefing de Primeira Visita
                </p>
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
    </div>
  );
}
