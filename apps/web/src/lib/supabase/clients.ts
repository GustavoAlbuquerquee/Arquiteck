import { supabase, getCurrentTenantId } from './client';
import type { Database } from './types';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

export const clientsService = {
  // Listar todos os clientes do tenant
  async list() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Client[];
  },

  // Buscar cliente por ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Client;
  },

  // Criar novo cliente
  async create(client: Omit<ClientInsert, 'tenant_id'>) {
    const tenant_id = await getCurrentTenantId();
    if (!tenant_id) throw new Error('Tenant ID não encontrado');

    const { data, error } = await supabase
      .from('clients')
      .insert({ ...client, tenant_id })
      .select()
      .single();
    
    if (error) throw error;
    return data as Client;
  },

  // Atualizar cliente
  async update(id: string, updates: ClientUpdate) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Client;
  },

  // Deletar cliente
  async delete(id: string) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
