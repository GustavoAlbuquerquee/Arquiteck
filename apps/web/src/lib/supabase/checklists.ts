import { supabase, getCurrentTenantId } from './client';
import type { Database } from './types';

type Checklist = Database['public']['Tables']['checklists']['Row'];
type ChecklistInsert = Database['public']['Tables']['checklists']['Insert'];
type ChecklistUpdate = Database['public']['Tables']['checklists']['Update'];

// Tipo para o payload do checklist
export interface ChecklistPayload {
  items?: Array<{
    label: string;
    checked: boolean;
  }>;
  croqui_url?: string;
  assinatura_url?: string;
  observacoes?: string;
  fotos?: string[];
  [key: string]: any; // Permite campos dinâmicos
}

export const checklistsService = {
  // Listar todos os checklists do tenant
  async list() {
    const { data, error } = await supabase
      .from('checklists')
      .select(`
        *,
        projects (
          id,
          titulo_ambiente,
          status
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Buscar checklist por ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('checklists')
      .select(`
        *,
        projects (
          id,
          titulo_ambiente,
          status,
          clients (
            id,
            nome
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Criar novo checklist
  async create(checklist: Omit<ChecklistInsert, 'tenant_id'>) {
    const tenant_id = await getCurrentTenantId();
    if (!tenant_id) throw new Error('Tenant ID não encontrado');

    const { data, error } = await supabase
      .from('checklists')
      .insert({ ...checklist, tenant_id })
      .select()
      .single();
    
    if (error) throw error;
    return data as Checklist;
  },

  // Atualizar checklist
  async update(id: string, updates: ChecklistUpdate) {
    const { data, error } = await supabase
      .from('checklists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Checklist;
  },

  // Deletar checklist
  async delete(id: string) {
    const { error } = await supabase
      .from('checklists')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Listar checklists por projeto
  async listByProject(projectId: string) {
    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Checklist[];
  },

  // Listar checklists por tipo de etapa
  async listByTipoEtapa(tipoEtapa: 'pre_producao' | 'saida' | 'instalacao') {
    const { data, error } = await supabase
      .from('checklists')
      .select(`
        *,
        projects (
          id,
          titulo_ambiente
        )
      `)
      .eq('tipo_etapa', tipoEtapa)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};
