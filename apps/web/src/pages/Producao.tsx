import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ChevronRight, ChevronLeft, User, Calendar } from 'lucide-react';

type Status = 'orcamento' | 'pre_producao' | 'producao' | 'instalacao' | 'concluido';

interface Projeto {
  id: string;
  titulo_ambiente: string;
  status: Status;
  created_at: string | null;
  clients: { nome: string } | null;
}

const COLUNAS: { status: Status; label: string; color: string; bg: string }[] = [
  { status: 'orcamento',    label: 'Orçamento',     color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  { status: 'pre_producao', label: 'Pré-Produção',  color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  { status: 'producao',     label: 'Produção',      color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  { status: 'instalacao',   label: 'Instalação',    color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  { status: 'concluido',    label: 'Concluído',     color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
];

const STATUS_ORDER = COLUNAS.map(c => c.status);

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
        .from('projects')
        .select('id, titulo_ambiente, status, created_at, clients(nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjetos((data as Projeto[]) || []);
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
    } finally {
      setLoading(false);
    }
  };

  const moverStatus = async (projeto: Projeto, direcao: 'avancar' | 'voltar') => {
    const idx = STATUS_ORDER.indexOf(projeto.status);
    const novoIdx = direcao === 'avancar' ? idx + 1 : idx - 1;
    if (novoIdx < 0 || novoIdx >= STATUS_ORDER.length) return;

    const novoStatus = STATUS_ORDER[novoIdx];
    setUpdating(projeto.id);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: novoStatus })
        .eq('id', projeto.id);
      if (error) throw error;
      setProjetos(prev =>
        prev.map(p => p.id === projeto.id ? { ...p, status: novoStatus } : p)
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setUpdating(null);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primor-text-light">
          Pipeline de Produção
        </h1>
        <p className="text-primor-gray-dark mt-1">
          Acompanhe o andamento dos projetos por etapa
        </p>
      </div>

      {/* Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {COLUNAS.map((coluna) => {
            const cards = projetos.filter(p => p.status === coluna.status);
            return (
              <div key={coluna.status} className="w-72 flex-shrink-0">
                {/* Header da coluna */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl border-2 border-b-0 ${coluna.bg}`}>
                  <span className={`font-bold text-sm ${coluna.color}`}>
                    {coluna.label}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 ${coluna.color}`}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className={`min-h-[400px] rounded-b-xl border-2 border-t-0 ${coluna.bg} p-2 space-y-2`}>
                  {cards.length === 0 && (
                    <div className="flex items-center justify-center h-24 text-xs text-gray-400">
                      Nenhum projeto
                    </div>
                  )}
                  {cards.map(projeto => {
                    const idx = STATUS_ORDER.indexOf(projeto.status);
                    const isUpdating = updating === projeto.id;
                    return (
                      <div
                        key={projeto.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-primor-gray-dark flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-semibold text-primor-text-light text-sm truncate">
                              {projeto.clients?.nome ?? '—'}
                            </p>
                            <p className="text-xs text-primor-gray-dark truncate">
                              {projeto.titulo_ambiente}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primor-gray-dark">
                          <Calendar className="w-3 h-3" />
                          {formatDate(projeto.created_at)}
                        </div>
                        {/* Controles de navegação */}
                        <div className="flex gap-1 pt-1">
                          <button
                            onClick={() => moverStatus(projeto, 'voltar')}
                            disabled={idx === 0 || isUpdating}
                            className="flex-1 flex items-center justify-center gap-1 h-7 text-xs font-medium rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Voltar
                          </button>
                          <button
                            onClick={() => moverStatus(projeto, 'avancar')}
                            disabled={idx === STATUS_ORDER.length - 1 || isUpdating}
                            className="flex-1 flex items-center justify-center gap-1 h-7 text-xs font-medium rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            {isUpdating
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <><span>Avançar</span><ChevronRight className="w-3.5 h-3.5" /></>
                            }
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
