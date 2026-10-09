import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import InputMask from "react-input-mask";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase/types";

// ── Cache em memória (persiste entre re-montagens do componente) ──
let cachedTeam: { profiles: Profile[]; role: 'admin' | 'membro'; tenantId: string } | null = null;
let cachedTenant: Tenant | null = null;
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  AlertCircle,
  CheckCircle,
  Mail,
  Lock,
  Building2,
  Upload,
} from "lucide-react";

// Interfaces precisam estar antes do cache, então declaramos antes do componente
interface Profile {
  id: string;
  nome_completo: string | null;
  cargo: string | null;
  role: "admin" | "membro";
  created_at: string;
}

interface Tenant {
  id: string;
  nome_fantasia: string;
  cnpj: string;
  telefone: string | null;
  logo_url: string | null;
}

export function Configuracoes() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>(cachedTeam?.profiles ?? []);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'membro' | null>(cachedTeam?.role ?? null);
  const [tenantId, setTenantId] = useState<string | null>(cachedTeam?.tenantId ?? null);
  const [loading, setLoading] = useState(cachedTeam === null);
  const [showAddMember, setShowAddMember] = useState(false);

  // Form states - equipe
  const [email, setEmail] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cargo, setCargo] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dados da empresa
  const [tenant, setTenant] = useState<Tenant | null>(cachedTenant);
  const [tenantForm, setTenantForm] = useState({
    nome_fantasia: cachedTenant?.nome_fantasia ?? '',
    cnpj: cachedTenant?.cnpj ?? '',
    telefone: cachedTenant?.telefone ?? '',
  });
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [savingTenant, setSavingTenant] = useState(false);
  const [tenantSuccess, setTenantSuccess] = useState("");
  const [tenantError, setTenantError] = useState("");

  useEffect(() => {
    if (user) loadTeam();
  }, [user]);

  const loadTeam = async () => {
    if (!user) return;
    // Só mostra spinner se não há cache
    if (!cachedTeam) setLoading(true);
    try {
      const { data: currentProfile, error: profileError } = (await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .maybeSingle()) as {
        data: { role: 'admin' | 'membro'; tenant_id: string } | null;
        error: any;
      };

      if (profileError) throw profileError;

      if (!currentProfile) {
        const tid = user.user_metadata?.tenant_id;
        if (!tid) {
          setError('Usuário não possui tenant_id. Faça logout e login novamente.');
          setLoading(false);
          return;
        }

        const { data: newProfile, error: createError } = (await supabase
          .from('profiles')
          .insert({ id: user.id, tenant_id: tid, nome_completo: user.email, role: 'admin' })
          .select('role, tenant_id')
          .single()) as {
          data: { role: 'admin' | 'membro'; tenant_id: string } | null;
          error: any;
        };

        if (createError) throw createError;
        if (!newProfile) throw new Error('Erro ao criar perfil');

        const { data: teamData } = await supabase
          .from('profiles')
          .select('id, nome_completo, cargo, role, created_at')
          .eq('tenant_id', newProfile.tenant_id)
          .order('created_at', { ascending: true });

        const profiles = (teamData as Profile[]) || [];
        cachedTeam = { profiles, role: newProfile.role, tenantId: newProfile.tenant_id };
        setCurrentUserRole(newProfile.role);
        setTenantId(newProfile.tenant_id);
        setProfiles(profiles);
        await loadTenantData(newProfile.tenant_id);
      } else {
        const { data: teamData, error: teamError } = (await supabase
          .from('profiles')
          .select('id, nome_completo, cargo, role, created_at')
          .eq('tenant_id', currentProfile.tenant_id)
          .order('created_at', { ascending: true })) as {
          data: Profile[] | null;
          error: any;
        };
        if (teamError) throw teamError;

        const profiles = teamData || [];
        cachedTeam = { profiles, role: currentProfile.role, tenantId: currentProfile.tenant_id };
        setCurrentUserRole(currentProfile.role);
        setTenantId(currentProfile.tenant_id);
        setProfiles(profiles);
        await loadTenantData(currentProfile.tenant_id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTenantData = async (tid: string) => {
    const { data } = await supabase
      .from('tenants')
      .select('id, nome_fantasia, cnpj, telefone, logo_url')
      .eq('id', tid)
      .maybeSingle();
    if (data) {
      const t = data as Tenant;
      cachedTenant = t;
      setTenant(t);
      setTenantForm({ nome_fantasia: t.nome_fantasia || '', cnpj: t.cnpj || '', telefone: t.telefone || '' });
      if (t.logo_url) setLogoPreview(t.logo_url);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSavingTenant(true);
    setTenantError("");
    setTenantSuccess("");

    try {
      let logo_url = tenant?.logo_url ?? null;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${tenantId}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("tenant_logos")
          .upload(path, logoFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("tenant_logos")
          .getPublicUrl(path);
        logo_url = urlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("tenants")
        .update({ ...tenantForm, logo_url })
        .eq("id", tenantId);

      if (updateError) throw updateError;

      setTenant((prev) =>
        prev
          ? { ...prev, ...tenantForm, logo_url: logo_url ?? prev.logo_url }
          : null,
      );
      setLogoFile(null);
      setIsEditingCompany(false);
      setTenantSuccess('Dados da empresa salvos com sucesso!');
      setTimeout(() => setTenantSuccess(''), 3000);
    } catch (err: any) {
      setTenantError(err.message || "Erro ao salvar dados da empresa");
    } finally {
      setSavingTenant(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id || '')
        .maybeSingle();

      if (profileError) throw profileError;
      if (!currentProfile) throw new Error('Perfil não encontrado');

      // Cliente temporário sem persistência de sessão — evita deslogar o Admin
      const tempSupabase = createClient<Database>(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email,
        password: 'primor123',
        options: {
          emailRedirectTo: undefined,
          data: { tenant_id: currentProfile.tenant_id, nome_completo: nomeCompleto },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Usuário não foi criado');

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { data: profileExists } = await supabase
        .from('profiles').select('id').eq('id', authData.user.id).maybeSingle();

      if (!profileExists) {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          tenant_id: currentProfile.tenant_id,
          nome_completo: nomeCompleto,
          role: 'membro',
          cargo: cargo || null,
        });
        if (insertError) throw insertError;
      } else if (cargo) {
        await supabase.from('profiles').update({ cargo }).eq('id', authData.user.id);
      }

      // Invalida cache para forçar reload da lista
      cachedTeam = null;
      setSuccess(`Membro ${nomeCompleto} adicionado com sucesso! Senha padrão: primor123`);
      setEmail(''); setNomeCompleto(''); setCargo('');
      setIsAddMemberModalOpen(false);
      setTimeout(() => { loadTeam(); setSuccess(''); }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar membro');
    } finally {
      setSubmitting(false);
    }
  };

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      const { error, count } = await supabase
        .from('profiles')
        .delete()
        .eq('id', memberToDelete)
        .select();

      if (error) throw error;
      if (count === 0) throw new Error('Sem permissão para remover este membro.');

      cachedTeam = null;
      setProfiles(prev => prev.filter(p => p.id !== memberToDelete));
      setMemberToDelete(null);
      setSuccess('Membro removido com sucesso!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setMemberToDelete(null);
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
    <div className="space-y-8">
      {/* ── SEÇÃO: DADOS DA EMPRESA (apenas admin) ── */}
      {currentUserRole === "admin" && (
        <div className="bg-primor-bg border-2 border-primor-primary/30 rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-primor-text-light mb-5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primor-primary" />
              Dados da Empresa
            </span>
            {currentUserRole === 'admin' && !isEditingCompany && (
              <button
                type="button"
                onClick={() => setIsEditingCompany(true)}
                className="text-sm font-semibold px-4 h-9 bg-primor-primary hover:brightness-110 text-primor-text-dark rounded-lg transition"
              >
                Editar
              </button>
            )}
          </h2>

          {tenantError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{tenantError}</p>
            </div>
          )}
          {tenantSuccess && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm">{tenantSuccess}</p>
            </div>
          )}

          <form onSubmit={handleSaveTenant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primor-text-light mb-2">
                  Nome Fantasia *
                </label>
                <input
                  type="text"
                  value={tenantForm.nome_fantasia}
                  onChange={(e) =>
                    setTenantForm((f) => ({ ...f, nome_fantasia: e.target.value }))
                  }
                  className={`w-full h-12 px-4 border-2 border-primor-gray-medium rounded-lg outline-none transition ${
                    !isEditingCompany
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-70'
                      : 'focus:border-primor-primary'
                  }`}
                  required
                  disabled={savingTenant || !isEditingCompany}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primor-text-light mb-2">
                  CNPJ
                </label>
                <InputMask
                  mask="99.999.999/9999-99"
                  value={tenantForm.cnpj}
                  onChange={(e) =>
                    setTenantForm((f) => ({ ...f, cnpj: e.target.value }))
                  }
                  disabled={savingTenant || !isEditingCompany}
                >
                  {(inputProps: any) => (
                    <input
                      {...inputProps}
                      type="text"
                      placeholder="00.000.000/0000-00"
                      className={`w-full h-12 px-4 border-2 border-primor-gray-medium rounded-lg outline-none transition ${
                        !isEditingCompany
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-70'
                          : 'focus:border-primor-primary'
                      }`}
                    />
                  )}
                </InputMask>
              </div>
              <div>
                <label className="block text-sm font-medium text-primor-text-light mb-2">
                  Telefone
                </label>
                <InputMask
                  mask={tenantForm.telefone.replace(/\D/g, '').length <= 10 ? '(99) 9999-9999' : '(99) 99999-9999'}
                  value={tenantForm.telefone}
                  onChange={(e) =>
                    setTenantForm((f) => ({ ...f, telefone: e.target.value }))
                  }
                  disabled={savingTenant || !isEditingCompany}
                >
                  {(inputProps: any) => (
                    <input
                      {...inputProps}
                      type="text"
                      placeholder="(00) 00000-0000"
                      className={`w-full h-12 px-4 border-2 border-primor-gray-medium rounded-lg outline-none transition ${
                        !isEditingCompany
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-70'
                          : 'focus:border-primor-primary'
                      }`}
                    />
                  )}
                </InputMask>
              </div>

              {/* Upload de Logo */}
              <div>
                <label className="block text-sm font-medium text-primor-text-light mb-2">
                  Logo da Empresa
                </label>
                <div className="flex items-center gap-3">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="h-12 w-auto max-w-[120px] object-contain rounded border border-primor-gray-medium"
                    />
                  )}
                  {isEditingCompany && (
                    <label className="flex-1 flex items-center justify-center gap-2 h-12 border-2 border-dashed border-primor-gray-medium rounded-lg cursor-pointer hover:border-primor-primary transition text-sm text-primor-gray-dark">
                      <Upload className="w-4 h-4" />
                      {logoFile ? logoFile.name : 'Selecionar imagem'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                        disabled={savingTenant}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {isEditingCompany && (
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingTenant}
                  className="h-12 px-8 bg-primor-primary hover:brightness-110 disabled:opacity-50 text-primor-text-dark font-semibold rounded-lg transition flex items-center gap-2"
                >
                  {savingTenant ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primor-text-dark border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingCompany(false);
                    setLogoFile(null);
                    if (tenant) {
                      setTenantForm({ nome_fantasia: tenant.nome_fantasia, cnpj: tenant.cnpj, telefone: tenant.telefone || '' });
                      setLogoPreview(tenant.logo_url);
                    }
                  }}
                  disabled={savingTenant}
                  className="h-12 px-8 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ── SEÇÃO: GESTÃO DE EQUIPE ── */}
      <div className="space-y-6">
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
          {currentUserRole === "admin" && (
            <button
              onClick={() => setIsAddMemberModalOpen(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 h-12 bg-primor-primary hover:brightness-110 text-primor-text-dark font-semibold rounded-lg transition shadow-md"
            >
              <UserPlus className="w-5 h-5" />
              Adicionar Membro
            </button>
          )}
        </div>

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

        {/* Formulário movido para modal — ver createPortal abaixo */}

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
                  {currentUserRole === "admin" && (
                    <th className="px-6 py-4 text-center text-sm font-bold text-primor-text-light">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-primor-gray-medium">
                {profiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="hover:bg-primor-bg-light transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primor-primary/20 rounded-full flex items-center justify-center">
                          <span className="text-primor-primary font-bold text-lg">
                            {profile.nome_completo?.charAt(0).toUpperCase() ||
                              "?"}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-primor-text-light">
                            {profile.nome_completo || "Sem nome"}
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
                      {profile.cargo || "-"}
                    </td>
                    <td className="px-6 py-4">
                      {profile.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primor-primary/20 text-primor-secondary">
                          <Shield className="w-3 h-3" />
                          Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                          Membro
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-primor-gray-dark text-sm">
                      {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    {currentUserRole === "admin" && (
                      <td className="px-6 py-4 text-center">
                        {profile.id !== user?.id &&
                          profile.role !== "admin" && (
                            <button
                              onClick={() => setMemberToDelete(profile.id)}
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
      {/* Modal de confirmação de remoção de membro */}
      {memberToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Remover Membro</h3>
            <p className="text-gray-600 text-sm">
              Tem certeza que deseja remover este membro da organização? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setMemberToDelete(null)}
                className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteMember}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
              >
                Confirmar Remoção
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Adicionar Membro */}
      {isAddMemberModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primor-primary" />
                Adicionar Novo Membro
              </h3>
              <button
                onClick={() => setIsAddMemberModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
                disabled={submitting}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 border-2 border-gray-200 rounded-lg focus:border-primor-primary outline-none transition"
                    placeholder="membro@empresa.com"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  className="w-full h-11 px-4 border-2 border-gray-200 rounded-lg focus:border-primor-primary outline-none transition"
                  placeholder="João Silva"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo (opcional)</label>
                <select
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full h-11 px-4 border-2 border-gray-200 rounded-lg focus:border-primor-primary outline-none transition bg-white"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha Padrão</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value="primor123"
                    className="w-full h-11 pl-10 pr-4 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-500"
                    disabled
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 bg-primor-primary hover:brightness-110 disabled:opacity-50 text-primor-text-dark font-semibold rounded-lg transition flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-primor-text-dark border-t-transparent rounded-full animate-spin" />Adicionando...</>
                  ) : (
                    <><UserPlus className="w-4 h-4" />Adicionar</>  
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
                  disabled={submitting}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
