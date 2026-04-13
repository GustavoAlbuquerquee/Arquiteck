import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Users, UserPlus, Shield, Trash2, AlertCircle, CheckCircle, Mail, Lock } from 'lucide-react';

interface Profile {
  id: string;
  nome_completo: string | null;
  cargo: string | null;
  role: 'admin' | 'membro';
  created_at: string;
}

export function Configuracoes() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'membro' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cargo, setCargo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadTeam();
    }
  }, [user]);

  const loadTeam = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Buscar perfil do usuário atual
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        throw profileError;
      }

      // Se não existe perfil, criar um
      if (!currentProfile) {
        console.log('Perfil não encontrado, criando...');
        
        // Extrair tenant_id dos metadados do usuário
        const tenantId = user.user_metadata?.tenant_id;
        
        if (!tenantId) {
          setError('Usuário não possui tenant_id. Faça logout e login novamente.');
          setLoading(false);
          return;
        }

        // Criar perfil
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            tenant_id: tenantId,
            nome_completo: user.email,
            role: 'admin', // Primeiro usuário é admin
          })
          .select('role, tenant_id')
          .single();

        if (createError) {
          console.error('Erro ao criar perfil:', createError);
          throw createError;
        }

        setCurrentUserRole(newProfile.role);

        // Buscar todos os perfis do mesmo tenant
        const { data: teamData, error: teamError } = await supabase
          .from('profiles')
          .select('id, nome_completo, cargo, role, created_at')
          .eq('tenant_id', newProfile.tenant_id)
          .order('created_at', { ascending: true });

        if (teamError) throw teamError;
        setProfiles(teamData || []);
      } else {
        setCurrentUserRole(currentProfile.role);

        // Buscar todos os perfis do mesmo tenant
        const { data: teamData, error: teamError } = await supabase
          .from('profiles')
          .select('id, nome_completo, cargo, role, created_at')
          .eq('tenant_id', currentProfile.tenant_id)
          .order('created_at', { ascending: true });

        if (teamError) throw teamError;
        setProfiles(teamData || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar equipe:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // Buscar tenant_id do usuário atual
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!currentProfile) throw new Error('Perfil não encontrado');

      // Criar usuário no Supabase Auth SEM autoConfirm para evitar trigger
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: 'primor123',
        options: {
          emailRedirectTo: undefined,
          data: {
            tenant_id: currentProfile.tenant_id,
            nome_completo: nomeCompleto,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Usuário não foi criado');

      // Aguardar um pouco para o trigger executar
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar se o perfil foi criado pelo trigger
      const { data: profileExists } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle();

      // Se o trigger não criou, criar manualmente
      if (!profileExists) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            tenant_id: currentProfile.tenant_id,
            nome_completo: nomeCompleto,
            role: 'membro',
            cargo: cargo || null,
          });

        if (insertError) throw insertError;
      } else if (cargo) {
        // Se o perfil existe e tem cargo, atualizar
        await supabase
          .from('profiles')
          .update({ cargo })
          .eq('id', authData.user.id);
      }

      setSuccess(`Membro ${nomeCompleto} adicionado com sucesso! Senha padrão: primor123`);
      setEmail('');
      setNomeCompleto('');
      setCargo('');
      setShowAddMember(false);
      
      // Recarregar lista
      setTimeout(() => {
        loadTeam();
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao adicionar membro:', err);
      setError(err.message || 'Erro ao adicionar membro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;

    try {
      // Deletar usuário (cascade vai deletar o perfil)
      const { error } = await supabase.auth.admin.deleteUser(memberId);
      
      if (error) throw error;

      setSuccess('Membro removido com sucesso!');
      loadTeam();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      console.error('Erro ao deletar membro:', err);
      setError(err.message || 'Erro ao remover membro');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primor-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primor-text-light flex items-center gap-3">
            <Users className="w-8 h-8 text-primor-primary" />
            Gestão de Equipe
          </h1>
          <p className="text-primor-gray-dark mt-1">
            Gerencie os membros da sua organização
          </p>
        </div>

        {currentUserRole === 'admin' && (
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 h-12 bg-primor-primary hover:brightness-110 text-primor-text-dark font-semibold rounded-lg transition shadow-md"
          >
            <UserPlus className="w-5 h-5" />
            Adicionar Membro
          </button>
        )}
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Formulário Adicionar Membro */}
      {showAddMember && currentUserRole === 'admin' && (
        <div className="bg-primor-bg border-2 border-primor-primary/30 rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-bold text-primor-text-light mb-4 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-primor-primary" />
            Adicionar Novo Membro
          </h3>

          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-primor-text-light mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primor-gray-dark" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 border-2 border-primor-gray-medium rounded-lg focus:border-primor-primary outline-none transition"
                    placeholder="membro@empresa.com"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-sm font-medium text-primor-text-light mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-primor-gray-medium rounded-lg focus:border-primor-primary outline-none transition"
                  placeholder="João Silva"
                  required
                  disabled={submitting}
                />
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-sm font-medium text-primor-text-light mb-2">
                  Cargo (opcional)
                </label>
                <select
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-primor-gray-medium rounded-lg focus:border-primor-primary outline-none transition bg-white"
                  disabled={submitting}
                >
                  <option value="">Selecione um cargo</option>
                  <option value="Projetista">Projetista</option>
                  <option value="Marceneiro">Marceneiro</option>
                  <option value="Montador">Montador</option>
                  <option value="Auxiliar">Auxiliar</option>
                  <option value="Vendedor">Vendedor</option>
                  <option value="Administrativo">Administrativo</option>
                </select>
              </div>

              {/* Senha Padrão (info) */}
              <div>
                <label className="block text-sm font-medium text-primor-text-light mb-2">
                  Senha Padrão
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primor-gray-dark" />
                  <input
                    type="text"
                    value="primor123"
                    className="w-full h-12 pl-10 pr-4 border-2 border-primor-gray-medium rounded-lg bg-gray-100 text-gray-600"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-12 bg-primor-primary hover:brightness-110 disabled:opacity-50 text-primor-text-dark font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primor-text-dark border-t-transparent rounded-full animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Adicionar Membro
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="flex-1 h-12 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
                disabled={submitting}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Membros */}
      <div className="bg-primor-bg rounded-xl shadow-md border border-primor-gray-medium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primor-primary/10 border-b-2 border-primor-primary/20">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-primor-text-light">
                  Nome
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-primor-text-light">
                  Cargo
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-primor-text-light">
                  Função
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-primor-text-light">
                  Data de Entrada
                </th>
                {currentUserRole === 'admin' && (
                  <th className="px-6 py-4 text-center text-sm font-bold text-primor-text-light">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-primor-gray-medium">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-primor-bg-light transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primor-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-primor-primary font-bold text-lg">
                          {profile.nome_completo?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-primor-text-light">
                          {profile.nome_completo || 'Sem nome'}
                        </p>
                        {profile.id === user?.id && (
                          <span className="text-xs text-primor-primary font-medium">
                            (Você)
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-primor-gray-dark">
                    {profile.cargo || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        profile.role === 'admin'
                          ? 'bg-primor-primary/20 text-primor-secondary'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {profile.role === 'admin' && <Shield className="w-3 h-3" />}
                      {profile.role === 'admin' ? 'Administrador' : 'Membro'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-primor-gray-dark text-sm">
                    {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  {currentUserRole === 'admin' && (
                    <td className="px-6 py-4 text-center">
                      {profile.id !== user?.id && profile.role !== 'admin' && (
                        <button
                          onClick={() => handleDeleteMember(profile.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Remover membro"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {profiles.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-primor-gray-dark mx-auto mb-4 opacity-50" />
            <p className="text-primor-gray-dark">Nenhum membro encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
