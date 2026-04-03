import { supabase, getCurrentTenantId } from './client';
import type { Database } from './types';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export const projectsService = {
  // Listar todos os projetos do tenant
  async list() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients (
          id,
          nome,
          telefone
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Buscar projeto por ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients (
          id,
          nome,
          telefone,
          endereco
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Criar novo projeto
  async create(project: Omit<ProjectInsert, 'tenant_id'>) {
    const tenant_id = await getCurrentTenantId();
    if (!tenant_id) throw new Error('Tenant ID não encontrado');

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...project, tenant_id })
      .select()
      .single();
    
    if (error) throw error;
    return data as Project;
  },

  // Atualizar projeto
  async update(id: string, updates: ProjectUpdate) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Project;
  },

  // Deletar projeto
  async delete(id: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Listar projetos por cliente
  async listByClient(clientId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Project[];
  }
};
