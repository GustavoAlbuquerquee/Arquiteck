import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import InputMask from "react-input-mask";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { invokeFunction } from "@/lib/supabase/functions";

// ── Cache em memória (persiste entre re-montagens do componente) ──
// Guardado por usuário para não exibir dados de outra conta após trocar de login na mesma aba
let cachedTeam: { userId: string; profiles: Profile[]; role: 'admin' | 'membro'; tenantId: string } | null = null;
let cachedTenant: { userId: string; tenant: Tenant } | null = null;

// Senha inicial aleatória sugerida ao cadastrar um membro
function gerarSenhaInicial(tamanho = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const valores = crypto.getRandomValues(new Uint32Array(tamanho));
  return Array.from(valores, (v) => chars[v % chars.length]).join('');
}
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
  KeyRound,
  SunMoon,
  X,
} from "lucide-react";
import { NovaSenhaForm } from "@/components/NovaSenhaForm";
import { SeletorTema } from "@/components/SeletorTema";

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
  if (cachedTeam && cachedTeam.userId !== user?.id) cachedTeam = null;
  if (cachedTenant && cachedTenant.userId !== user?.id) cachedTenant = null;
  const tenantCache = cachedTenant?.tenant ?? null;

  const [profiles, setProfiles] = useState<Profile[]>(cachedTeam?.profiles ?? []);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'membro' | null>(cachedTeam?.role ?? null);
  const [tenantId, setTenantId] = useState<string | null>(cachedTeam?.tenantId ?? null);
  const [loading, setLoading] = useState(cachedTeam === null);

  // Form states - equipe
  const [email, setEmail] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cargo, setCargo] = useState("");
  const [senhaInicial, setSenhaInicial] = useState(gerarSenhaInicial);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dados da empresa
  const [tenant, setTenant] = useState<Tenant | null>(tenantCache);
  const [tenantForm, setTenantForm] = useState({
    nome_fantasia: tenantCache?.nome_fantasia ?? '',
    cnpj: tenantCache?.cnpj ?? '',
    telefone: tenantCache?.telefone ?? '',
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
        // Perfis são criados apenas pelo cadastro / Edge Functions
        setError('Seu usuário não está vinculado a nenhuma empresa. Fale com o administrador da conta.');
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
        cachedTeam = { userId: user.id, profiles, role: currentProfile.role, tenantId: currentProfile.tenant_id };
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
      if (user) cachedTenant = { userId: user.id, tenant: t };
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
      // Edge Function valida que quem chama é admin e cria o membro no mesmo tenant
      await invokeFunction('create-member', {
        email,
        password: senhaInicial,
        nome_completo: nomeCompleto,
        cargo: cargo || null,
      });

      // Invalida cache para forçar reload da lista
      cachedTeam = null;
      setSuccess(
        `Membro ${nomeCompleto} adicionado! Login: ${email} — senha inicial: ${senhaInicial}. Repasse ao membro; ele pode trocá-la em Configurações > Alterar Senha.`,
      );
      setEmail(''); setNomeCompleto(''); setCargo(''); setSenhaInicial(gerarSenhaInicial());
      setIsAddMemberModalOpen(false);
      loadTeam();
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
      const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', memberToDelete)
        .select('id');

      if (error) throw error;
      // A RLS não retorna erro quando bloqueia: apenas nenhuma linha é removida
      if (!data || data.length === 0) throw new Error('Sem permissão para remover este membro.');

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
      <div role="status" aria-label="Carregando configurações" className="space-y-8">
        <div className="space-y-3">
          <div className="esqueleto h-3 w-32" />
          <div className="esqueleto h-10 w-72 max-w-full" />
        </div>
        <div className="esqueleto h-56 w-full" />
        <div className="esqueleto h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="entrada">
        <p className="etiqueta">Oficina</p>
        <h1 className="titulo-pagina mt-2">Configurações</h1>
        <p className="mt-2 text-primor-muted">Empresa, equipe, acesso e aparência</p>
        <div aria-hidden="true" className="regua mt-8" />
      </header>

      {/* ── SEÇÃO: DADOS DA EMPRESA (apenas admin) ── */}
      {currentUserRole === "admin" && (
        <section aria-labelledby="titulo-empresa" className="panel fita py-6 pl-7 pr-6 md:py-7 md:pl-9 md:pr-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="etiqueta">01</p>
              <h2 id="titulo-empresa" className="titulo-secao mt-1 flex items-center gap-2.5">
                <Building2 aria-hidden="true" strokeWidth={1.75} className="h-6 w-6 text-primor-primary-ink" />
                Dados da empresa
              </h2>
            </div>
            {currentUserRole === 'admin' && !isEditingCompany && (
              <button
                type="button"
                onClick={() => setIsEditingCompany(true)}
                className="btn btn-outline btn-sm"
              >
                Editar
              </button>
            )}
          </div>

          <div aria-live="polite">
            {tenantError && (
              <div className="alerta alerta-erro mb-5">
                <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <p>{tenantError}</p>
              </div>
            )}
            {tenantSuccess && (
              <div className="alerta alerta-sucesso mb-5">
                <CheckCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <p>{tenantSuccess}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveTenant} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="empresa-nome" className="field-label">
                  Nome fantasia <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                </label>
                <input
                  id="empresa-nome"
                  type="text"
                  value={tenantForm.nome_fantasia}
                  onChange={(e) =>
                    setTenantForm((f) => ({ ...f, nome_fantasia: e.target.value }))
                  }
                  className="field"
                  required
                  disabled={savingTenant || !isEditingCompany}
                />
              </div>
              <div>
                <label htmlFor="empresa-cnpj" className="field-label">
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
                      id="empresa-cnpj"
                      type="text"
                      inputMode="numeric"
                      placeholder="00.000.000/0000-00"
                      className={`field font-mono tabular ${!isEditingCompany ? "cursor-not-allowed !border-primor-line !bg-primor-paper-deep !text-primor-muted" : ""}`}
                    />
                  )}
                </InputMask>
              </div>
              <div>
                <label htmlFor="empresa-telefone" className="field-label">
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
                      id="empresa-telefone"
                      type="text"
                      inputMode="tel"
                      placeholder="(00) 00000-0000"
                      className={`field font-mono tabular ${!isEditingCompany ? "cursor-not-allowed !border-primor-line !bg-primor-paper-deep !text-primor-muted" : ""}`}
                    />
                  )}
                </InputMask>
              </div>

              {/* Upload de Logo */}
              <div>
                <p id="empresa-logo-rotulo" className="field-label">
                  Logo da empresa
                </p>
                <div className="flex items-center gap-3">
                  {logoPreview && (
                    // Fundo branco nos dois temas: logos costumam ter tinta escura e fundo transparente
                    <img
                      src={logoPreview}
                      alt="Logo da empresa"
                      className="h-12 w-auto max-w-[120px] rounded-md border border-primor-line bg-white object-contain p-1"
                    />
                  )}
                  {isEditingCompany ? (
                    <label className="flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-primor-line-strong bg-primor-surface px-3 text-sm font-medium text-primor-secondary transition-colors hover:border-primor-secondary hover:bg-primor-bg-light has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primor-secondary dark:has-[:focus-visible]:outline-primor-primary">
                      <Upload aria-hidden="true" className="h-4 w-4" />
                      <span className="truncate">{logoFile ? logoFile.name : 'Selecionar imagem'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        aria-labelledby="empresa-logo-rotulo"
                        className="sr-only"
                        onChange={handleLogoChange}
                        disabled={savingTenant}
                      />
                    </label>
                  ) : (
                    !logoPreview && <p className="text-sm text-primor-muted">Nenhum logo enviado</p>
                  )}
                </div>
              </div>
            </div>

            {isEditingCompany && (
              <div className="flex flex-wrap gap-3 border-t border-dashed border-primor-line pt-5">
                <button
                  type="submit"
                  disabled={savingTenant}
                  className="btn btn-primary"
                >
                  {savingTenant ? (
                    <>
                      <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-primor-on-primary border-t-transparent" />
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
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
              </div>
            )}
          </form>
        </section>
      )}

      {/* ── SEÇÃO: GESTÃO DE EQUIPE ── */}
      <section aria-labelledby="titulo-equipe" className="space-y-5">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="etiqueta">{currentUserRole === "admin" ? "02" : "01"}</p>
            <h2 id="titulo-equipe" className="titulo-secao mt-1 flex items-center gap-2.5">
              <Users aria-hidden="true" strokeWidth={1.75} className="h-6 w-6 text-primor-primary-ink" />
              Gestão de equipe
            </h2>
            <p className="mt-1 text-primor-muted">
              Gerencie os membros da sua organização
            </p>
          </div>
          {currentUserRole === "admin" && (
            <button
              type="button"
              onClick={() => { setError(''); setIsAddMemberModalOpen(true); }}
              className="btn btn-primary w-full md:w-auto"
            >
              <UserPlus aria-hidden="true" className="h-5 w-5" />
              Adicionar membro
            </button>
          )}
        </div>

        <div aria-live="polite" className="space-y-3">
          {error && (
            <div className="alerta alerta-erro">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="alerta alerta-sucesso">
              <CheckCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}
        </div>

        {/* Formulário movido para modal — ver createPortal abaixo */}

        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem]">
              <caption className="sr-only">Membros da equipe</caption>
              <thead className="border-b border-primor-line bg-primor-bg-light">
                <tr>
                  <th scope="col" className="etiqueta px-6 py-3.5 text-left">
                    Nome
                  </th>
                  <th scope="col" className="etiqueta px-6 py-3.5 text-left">
                    Cargo
                  </th>
                  <th scope="col" className="etiqueta px-6 py-3.5 text-left">
                    Função
                  </th>
                  <th scope="col" className="etiqueta px-6 py-3.5 text-left">
                    Data de entrada
                  </th>
                  {currentUserRole === "admin" && (
                    <th scope="col" className="etiqueta px-6 py-3.5 text-center">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-primor-line">
                {profiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="transition-colors hover:bg-primor-bg-light"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div aria-hidden="true" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primor-madeira font-display text-lg font-semibold text-primor-primary">
                          {profile.nome_completo?.charAt(0).toUpperCase() ||
                            "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-primor-secondary">
                            {profile.nome_completo || "Sem nome"}
                          </p>
                          {profile.id === user?.id && (
                            <span className="text-xs font-medium text-primor-primary-ink">
                              (Você)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-primor-muted">
                      {profile.cargo || "-"}
                    </td>
                    <td className="px-6 py-3.5">
                      {profile.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-primor-primary px-2 py-0.5 text-xs font-semibold text-primor-on-primary">
                          <Shield aria-hidden="true" className="h-3 w-3" />
                          Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-sm border border-primor-line-strong px-2 py-0.5 text-xs font-semibold text-primor-secondary">
                          Membro
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-sm text-primor-muted tabular">
                      {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    {currentUserRole === "admin" && (
                      <td className="px-6 py-2 text-center">
                        {profile.id !== user?.id &&
                          profile.role !== "admin" && (
                            <button
                              type="button"
                              onClick={() => setMemberToDelete(profile.id)}
                              className="btn-icon text-primor-erro hover:bg-primor-erro-bg"
                              title="Remover membro"
                              aria-label={`Remover ${profile.nome_completo || "membro"}`}
                            >
                              <Trash2 aria-hidden="true" className="h-5 w-5" />
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
            <div className="py-12 text-center">
              <Users aria-hidden="true" strokeWidth={1.5} className="mx-auto mb-4 h-12 w-12 text-primor-line-strong" />
              <p className="text-primor-muted">Nenhum membro encontrado</p>
            </div>
          )}
        </div>
      </section>

      {/* ── SEÇÃO: MINHA CONTA (todos os usuários) ── */}
      <section aria-labelledby="titulo-senha" className="panel fita py-6 pl-7 pr-6 md:py-7 md:pl-9 md:pr-8">
        <p className="etiqueta">{currentUserRole === "admin" ? "03" : "02"}</p>
        <h2 id="titulo-senha" className="titulo-secao mt-1 flex items-center gap-2.5">
          <KeyRound aria-hidden="true" strokeWidth={1.75} className="h-6 w-6 text-primor-primary-ink" />
          Alterar senha
        </h2>
        <p className="mb-6 mt-1 max-w-prose text-primor-muted">
          Membros cadastrados com senha inicial devem trocá-la aqui no primeiro acesso.
        </p>
        <div className="max-w-md">
          <NovaSenhaForm />
        </div>
      </section>

      {/* ── SEÇÃO: APARÊNCIA (preferência deste aparelho) ── */}
      <section aria-labelledby="titulo-aparencia" className="panel fita py-6 pl-7 pr-6 md:py-7 md:pl-9 md:pr-8">
        <p className="etiqueta">{currentUserRole === "admin" ? "04" : "03"}</p>
        <h2 id="titulo-aparencia" className="titulo-secao mt-1 flex items-center gap-2.5">
          <SunMoon aria-hidden="true" strokeWidth={1.75} className="h-6 w-6 text-primor-primary-ink" />
          Aparência
        </h2>
        <p className="mb-6 mt-1 max-w-prose text-primor-muted">
          Tema da interface neste aparelho. Os PDFs continuam em papel branco.
        </p>
        <SeletorTema variante="papel" />
      </section>

      {/* Modal de confirmação de remoção de membro */}
      {memberToDelete && createPortal(
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-primor-veu/60 p-4 animate-fade-in">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-remover-membro"
            aria-describedby="texto-remover-membro"
            className="w-full max-w-md space-y-4 rounded-lg border-t-4 border-primor-erro bg-primor-surface p-6 shadow-chapa-lg dark:ring-1 dark:ring-primor-line"
          >
            <h3 id="titulo-remover-membro" className="font-display text-xl font-semibold text-primor-secondary">
              Remover membro
            </h3>
            <p id="texto-remover-membro" className="text-primor-muted">
              Tem certeza que deseja remover este membro da organização? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="btn btn-outline flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                className="btn btn-danger flex-1"
              >
                Confirmar remoção
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Adicionar Membro */}
      {isAddMemberModalOpen && createPortal(
        <div className="fixed inset-0 z-modal flex items-end justify-center bg-primor-veu/60 animate-fade-in sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-novo-membro"
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-xl bg-primor-surface p-6 shadow-chapa-lg dark:ring-1 dark:ring-primor-line sm:rounded-lg"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="etiqueta">Equipe</p>
                <h3 id="titulo-novo-membro" className="mt-1 flex items-center gap-2 font-display text-xl font-semibold text-primor-secondary">
                  <UserPlus aria-hidden="true" strokeWidth={1.75} className="h-5 w-5 text-primor-primary-ink" />
                  Adicionar novo membro
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                aria-label="Fechar"
                className="btn-icon -mr-2 -mt-1 text-primor-secondary hover:bg-primor-paper-deep"
                disabled={submitting}
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-5">
              <div>
                <label htmlFor="membro-email" className="field-label">
                  Email <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                </label>
                <div className="relative">
                  <Mail aria-hidden="true" className="field-icon-slot" />
                  <input
                    id="membro-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field field-icon"
                    placeholder="membro@empresa.com"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="membro-nome" className="field-label">
                  Nome completo <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                </label>
                <input
                  id="membro-nome"
                  type="text"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  className="field"
                  placeholder="Carlos Eduardo Ramos"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label htmlFor="membro-cargo" className="field-label">
                  Cargo <span className="font-normal text-primor-muted">(opcional)</span>
                </label>
                <select
                  id="membro-cargo"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="field"
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
                <label htmlFor="membro-senha" className="field-label">
                  Senha inicial <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                </label>
                <div className="relative">
                  <Lock aria-hidden="true" className="field-icon-slot" />
                  <input
                    id="membro-senha"
                    type="text"
                    aria-describedby="membro-senha-dica"
                    value={senhaInicial}
                    onChange={(e) => setSenhaInicial(e.target.value)}
                    className="field field-icon font-mono tracking-wide"
                    minLength={8}
                    required
                    disabled={submitting}
                  />
                </div>
                <p id="membro-senha-dica" className="field-hint">
                  Gerada automaticamente. Repasse ao membro; ele troca em Configurações no primeiro acesso.
                </p>
              </div>
              <div aria-live="polite">
                {error && (
                  <div className="alerta alerta-erro">
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? (
                    <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-primor-on-primary border-t-transparent" />Adicionando...</>
                  ) : (
                    <><UserPlus aria-hidden="true" className="h-4 w-4" />Adicionar</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="btn btn-outline flex-1"
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
