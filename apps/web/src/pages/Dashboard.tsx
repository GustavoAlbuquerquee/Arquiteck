import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FolderOpen, Users, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { Contador } from '@/components/marca/Contador';
import { MedidorEtapa } from '@/components/marca/Etapas';
import { SimboloEncaixe } from '@/components/marca/Marca';

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

const dataDeHoje = () =>
  new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

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
    // Esqueleto no formato da tela, no lugar do spinner genérico
    return (
      <div role="status" aria-label="Carregando painel" className="space-y-10">
        <div className="space-y-3">
          <div className="esqueleto h-3 w-40" />
          <div className="esqueleto h-10 w-72 max-w-full" />
        </div>
        <div className="esqueleto h-32 w-full" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="esqueleto h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const metricas = [
    { rotulo: 'Total de projetos', valor: totalProjetos, icone: FolderOpen },
    { rotulo: 'Projetos este mês', valor: projetosMes, icone: TrendingUp },
    { rotulo: 'Membros da equipe', valor: totalMembros, icone: Users },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="entrada">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="etiqueta first-letter:uppercase">{dataDeHoje()}</p>
            <h1 className="titulo-pagina mt-2">
              {nomeEmpresa ? `Olá, ${nomeEmpresa}` : 'Dashboard'}
            </h1>
            <p className="mt-2 text-primor-muted">Visão geral da sua operação</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/nova-visita')}
            className="btn btn-primary btn-lg w-full md:w-auto"
          >
            <Plus aria-hidden="true" className="h-5 w-5" />
            Novo briefing
          </button>
        </div>
        <div aria-hidden="true" className="regua mt-8" />
      </header>

      {/* Métricas: uma ficha só, dividida em cotas, em vez de três cards iguais */}
      <section aria-label="Indicadores" className="panel fita entrada overflow-hidden" style={{ ['--i' as string]: 1 }}>
        <dl className="grid grid-cols-1 divide-y divide-primor-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {metricas.map(({ rotulo, valor, icone: Icone }) => (
            <div key={rotulo} className="flex items-start justify-between gap-4 px-6 py-5 sm:px-7 sm:py-6">
              <div>
                <dt className="etiqueta">{rotulo}</dt>
                <dd className="mt-2 font-mono text-4xl font-medium tracking-tight text-primor-secondary tabular md:text-5xl">
                  <Contador valor={valor} />
                </dd>
              </div>
              <Icone aria-hidden="true" strokeWidth={1.5} className="mt-1 h-6 w-6 text-primor-primary-ink" />
            </div>
          ))}
        </dl>
      </section>

      {/* Últimos Briefings */}
      <section aria-labelledby="titulo-ultimos" className="entrada" style={{ ['--i' as string]: 2 }}>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="etiqueta">Clientes recentes</p>
            <h2 id="titulo-ultimos" className="titulo-secao mt-1">
              Últimos briefings
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/historico')}
            className="btn btn-quiet btn-sm -mr-2 text-primor-primary-ink"
          >
            Ver todos <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {projetosRecentes.length === 0 ? (
          <div className="panel flex flex-col items-center px-6 py-14 text-center">
            <SimboloEncaixe className="h-12 w-12 text-primor-line-strong" />
            <p className="mt-5 font-display text-xl font-semibold text-primor-secondary">
              Nenhum projeto criado ainda
            </p>
            <p className="mt-1 max-w-sm text-primor-muted">
              Comece registrando seu primeiro briefing
            </p>
            <button
              type="button"
              onClick={() => navigate('/nova-visita')}
              className="btn btn-primary mt-6"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Criar primeiro briefing
            </button>
          </div>
        ) : (
          <ul className="panel divide-y divide-primor-line overflow-hidden">
            {projetosRecentes.map((projeto) => (
              <li
                key={projeto.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-primor-bg-light sm:grid-cols-[minmax(0,1fr)_10rem_6.5rem_auto] sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-primor-secondary">
                    {projeto.clients?.nome ?? '—'}
                  </p>
                  <p className="truncate text-sm text-primor-muted">{projeto.titulo_ambiente}</p>
                </div>
                <div className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto">
                  <MedidorEtapa
                    status={projeto.status}
                    rotulo={STATUS_LABEL[projeto.status ?? ''] ?? projeto.status ?? '—'}
                    compacto
                  />
                </div>
                <span className="hidden font-mono text-xs text-primor-muted tabular sm:block">
                  {formatDate(projeto.created_at)}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/historico?projetoId=${projeto.id}`)}
                  aria-label={`Ver briefing de ${projeto.clients?.nome ?? projeto.titulo_ambiente}`}
                  className="btn btn-outline btn-sm row-span-2 sm:row-span-1"
                >
                  Ver <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
