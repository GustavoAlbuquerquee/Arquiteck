import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, User, Home, FileText, Loader2, FolderOpen, Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  useEffect(() => {
    loadProjetos();
  }, []);

  const loadProjetos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients (*),
          checklists (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjetos(data || []);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhes = (projeto: Projeto) => {
    setSelectedProjeto(projeto);
    setShowModal(true);
    console.log('📋 Detalhes do Projeto:', projeto);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      orcamento: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      pre_producao: 'bg-blue-100 text-blue-800 border-blue-300',
      producao: 'bg-purple-100 text-purple-800 border-purple-300',
      instalacao: 'bg-orange-100 text-orange-800 border-orange-300',
      concluido: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      orcamento: 'Orçamento',
      pre_producao: 'Pré-Produção',
      producao: 'Produção',
      instalacao: 'Instalação',
      concluido: 'Concluído',
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
            onClick={() => navigate('/nova-visita')}
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
          <h1 className="text-3xl font-bold text-gray-800">Histórico de Briefings</h1>
          <p className="text-gray-600 mt-2">
            {projetos.length} {projetos.length === 1 ? 'briefing encontrado' : 'briefings encontrados'}
          </p>
        </div>
        <button
          onClick={() => navigate('/nova-visita')}
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
                  projeto.status
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
                      {projeto.checklists.length}{' '}
                      {projeto.checklists.length === 1 ? 'checklist' : 'checklists'}
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
              <h2 className="text-2xl font-bold text-gray-800">Detalhes do Briefing</h2>
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
                <h3 className="text-lg font-bold text-gray-800 mb-3">Cliente</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p>
                    <strong>Nome:</strong> {selectedProjeto.clients.nome}
                  </p>
                  {selectedProjeto.clients.telefone && (
                    <p>
                      <strong>Telefone:</strong> {selectedProjeto.clients.telefone}
                    </p>
                  )}
                  {selectedProjeto.clients.endereco && (
                    <p>
                      <strong>Endereço:</strong> {selectedProjeto.clients.endereco}
                    </p>
                  )}
                </div>
              </div>

              {/* Informações do Projeto */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">Projeto</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p>
                    <strong>Ambiente:</strong> {selectedProjeto.titulo_ambiente}
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span
                      className={`px-2 py-1 rounded text-sm ${getStatusColor(
                        selectedProjeto.status
                      )}`}
                    >
                      {getStatusLabel(selectedProjeto.status)}
                    </span>
                  </p>
                  <p>
                    <strong>Data do Atendimento:</strong>{' '}
                    {formatDate(selectedProjeto.data_prevista_instalacao)}
                  </p>
                  <p>
                    <strong>Criado em:</strong> {formatDate(selectedProjeto.created_at)}
                  </p>
                </div>
              </div>

              {/* Checklists */}
              {selectedProjeto.checklists.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Checklists</h3>
                  {selectedProjeto.checklists.map((checklist) => (
                    <div key={checklist.id} className="bg-gray-50 rounded-lg p-4 mb-3">
                      <p className="mb-2">
                        <strong>Tipo:</strong>{' '}
                        <span className="capitalize">{checklist.tipo_etapa.replace('_', ' ')}</span>
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                        Criado em: {formatDate(checklist.created_at)}
                      </p>

                      {/* Payload do Checklist */}
                      {checklist.payload && (
                        <div className="space-y-3">
                          {/* Móveis */}
                          {checklist.payload.moveis && checklist.payload.moveis.length > 0 && (
                            <div>
                              <p className="font-semibold mb-2">Móveis:</p>
                              <div className="space-y-2">
                                {checklist.payload.moveis.map((movel: any, idx: number) => (
                                  <div key={idx} className="bg-white p-3 rounded border">
                                    <p className="font-medium">{movel.nome}</p>
                                    <p className="text-sm text-gray-600">
                                      {movel.largura}cm × {movel.altura}cm × {movel.profundidade}cm
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Eletrodomésticos */}
                          {checklist.payload.eletrodomesticos &&
                            checklist.payload.eletrodomesticos.length > 0 && (
                              <div>
                                <p className="font-semibold mb-2">Eletrodomésticos:</p>
                                <ul className="list-disc list-inside space-y-1">
                                  {checklist.payload.eletrodomesticos.map(
                                    (eletro: any, idx: number) => (
                                      <li key={idx}>
                                        {eletro.nome}
                                        {eletro.modelo && ` - ${eletro.modelo}`}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          {/* Materiais */}
                          {checklist.payload.preferenciaMateriais && (
                            <div>
                              <p className="font-semibold mb-2">Materiais:</p>
                              <p className="text-sm">
                                <strong>MDF:</strong>{' '}
                                {checklist.payload.preferenciaMateriais.corPadraoMdf}
                              </p>
                              <p className="text-sm">
                                <strong>Puxador:</strong>{' '}
                                {checklist.payload.preferenciaMateriais.tipoPuxador}
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-6">
              <button
                onClick={() => setShowModal(false)}
                className="w-full h-12 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
