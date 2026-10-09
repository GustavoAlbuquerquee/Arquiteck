import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FolderOpen, Users, TrendingUp, Plus, ArrowRight, Loader2, Calendar } from 'lucide-react';

interface ProjetoRecente {
  id: string;
  titulo_ambiente: string;
  status: string | null;
  created_at: string | null;
  clients: { nome: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  orcamento: 'Orçamento',
  pre_producao: 'Pré-Produção',
  producao: 'Produção',
  instalacao: 'Instalação',
  concluido: 'Concluído',
};

const STATUS_COLOR: Record<string, string> = {
  orcamento: 'bg-amber-100 text-amber-700',
  pre_producao: 'bg-orange-100 text-orange-700',
  producao: 'bg-blue-100 text-blue-700',
  instalacao: 'bg-yellow-100 text-yellow-700',
  concluido: 'bg-green-100 text-green-700',
};

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [totalProjetos, setTotalProjetos] = useState(0);
  const [totalMembros, setTotalMembros] = useState(0);
  const [projetosRecentes, setProjetosRecentes] = useState<ProjetoRecente[]>([]);
  const [projetosMes, setProjetosMes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [nomeEmpresa, setNomeEmpresa] = useState('');

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Buscar tenant_id e nome da empresa
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user!.id)
        .maybeSingle();

      if (!profile) return;

      const [
        { count: countProjetos },
        { count: countMembros },
        { data: recentes },
        { data: tenant },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
        supabase
          .from('projects')
          .select('id, titulo_ambiente, status, created_at, clients(nome)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('tenants')
          .select('nome_fantasia')
          .eq('id', profile.tenant_id)
          .maybeSingle(),
      ]);

      // Projetos criados no mês atual
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      const { count: countMes } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioMes.toISOString());

      setTotalProjetos(countProjetos ?? 0);
      setTotalMembros(countMembros ?? 0);
      setProjetosRecentes((recentes as ProjetoRecente[]) ?? []);
      setProjetosMes(countMes ?? 0);
      if (tenant?.nome_fantasia) setNomeEmpresa(tenant.nome_fantasia);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primor-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primor-text-light">
            {nomeEmpresa ? `Olá, ${nomeEmpresa}` : 'Dashboard'}
          </h1>
          <p className="text-primor-gray-dark mt-1">Visão geral da sua operação</p>
        </div>
        <button
          onClick={() => navigate('/nova-visita')}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 h-12 bg-primor-primary hover:brightness-110 text-primor-text-dark font-semibold rounded-lg transition shadow-md"
        >
          <Plus className="w-5 h-5" />
          Novo Briefing
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primor-bg rounded-xl shadow-md border border-primor-gray-medium p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-primor-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-7 h-7 text-primor-primary" />
          </div>
          <div>
            <p className="text-sm text-primor-gray-dark">Total de Projetos</p>
            <p className="text-3xl font-bold text-primor-text-light">{totalProjetos}</p>
          </div>
        </div>

        <div className="bg-primor-bg rounded-xl shadow-md border border-primor-gray-medium p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-primor-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-7 h-7 text-primor-primary" />
          </div>
          <div>
            <p className="text-sm text-primor-gray-dark">Membros da Equipe</p>
            <p className="text-3xl font-bold text-primor-text-light">{totalMembros}</p>
          </div>
        </div>

        <div className="bg-primor-bg rounded-xl shadow-md border border-primor-gray-medium p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-primor-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-7 h-7 text-primor-primary" />
          </div>
          <div>
            <p className="text-sm text-primor-gray-dark">Projetos este Mês</p>
            <p className="text-3xl font-bold text-primor-text-light">{projetosMes}</p>
          </div>
        </div>
      </div>

      {/* Últimos Briefings */}
      <div className="bg-primor-bg rounded-xl shadow-md border border-primor-gray-medium overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-primor-gray-medium">
          <h2 className="text-lg font-bold text-primor-text-light">Últimos Briefings</h2>
          <button
            onClick={() => navigate('/historico')}
            className="flex items-center gap-1 text-sm text-primor-primary hover:underline font-medium"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {projetosRecentes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <FolderOpen className="w-14 h-14 text-primor-gray-dark opacity-40 mb-4" />
            <p className="text-primor-text-light font-semibold mb-1">Nenhum projeto criado ainda</p>
            <p className="text-primor-gray-dark text-sm mb-5">Comece registrando seu primeiro briefing</p>
            <button
              onClick={() => navigate('/nova-visita')}
              className="flex items-center gap-2 px-6 h-10 bg-primor-primary hover:brightness-110 text-primor-text-dark font-semibold rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Criar Primeiro Briefing
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-primor-gray-medium">
            {projetosRecentes.map((projeto) => (
              <li key={projeto.id} className="flex items-center justify-between px-6 py-4 hover:bg-primor-bg-light transition gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-primor-text-light truncate">
                    {projeto.clients?.nome ?? '—'}
                  </p>
                  <p className="text-sm text-primor-gray-dark truncate">{projeto.titulo_ambiente}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`hidden sm:inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[projeto.status ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[projeto.status ?? ''] ?? projeto.status ?? '—'}
                  </span>
                  <span className="hidden md:flex items-center gap-1 text-xs text-primor-gray-dark">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(projeto.created_at)}
                  </span>
                  <button
                    onClick={() => navigate(`/historico?projetoId=${projeto.id}`)}
                    className="flex items-center gap-1 text-xs font-semibold text-primor-primary hover:underline"
                  >
                    Ver <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
