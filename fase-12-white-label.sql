-- =====================================================
-- FASE 12 - White-Label: Colunas + Storage
-- Execute no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Adicionar colunas na tabela tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Habilitar RLS na tabela tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS da tabela tenants
-- (DROP antes para evitar erro de duplicata)
DROP POLICY IF EXISTS "Tenant members can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Tenant admins can update their tenant" ON tenants;

CREATE POLICY "Tenant members can view their tenant"
  ON tenants FOR SELECT
  USING (id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

CREATE POLICY "Tenant admins can update their tenant"
  ON tenants FOR UPDATE
  USING (id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'))
  WITH CHECK (id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- 4. Criar bucket público para logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant_logos', 'tenant_logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. Políticas do Storage
DROP POLICY IF EXISTS "Public read tenant_logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload tenant_logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update tenant_logos" ON storage.objects;

CREATE POLICY "Public read tenant_logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant_logos');

CREATE POLICY "Authenticated users can upload tenant_logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tenant_logos');

CREATE POLICY "Authenticated users can update tenant_logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tenant_logos');
