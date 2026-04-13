-- =====================================================
-- FIX: Configurar RLS para tenants (acesso via Edge Function)
-- =====================================================

-- Habilitar RLS na tabela tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seu próprio tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants
  FOR SELECT
  USING (id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- Nota: INSERT/UPDATE/DELETE serão feitos via Edge Function com service_role_key
-- que bypassa RLS automaticamente
