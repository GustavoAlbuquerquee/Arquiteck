-- =====================================================
-- ADICIONAR COLUNAS FALTANTES NA TABELA PROFILES
-- =====================================================

-- 1. Adicionar coluna role (se não existir)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'membro' CHECK (role IN ('admin', 'membro'));

-- 2. Adicionar coluna tenant_id (se não existir)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 3. Adicionar coluna cargo (se não existir)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cargo TEXT;

-- 4. Adicionar coluna nome_completo (se não existir)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nome_completo TEXT;

-- 5. Adicionar coluna created_at (se não existir)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Criar índice para tenant_id
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);

-- 7. Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. Criar políticas RLS para profiles
-- SELECT: Usuários só veem perfis do mesmo tenant
DROP POLICY IF EXISTS "Users can view profiles from their tenant" ON public.profiles;
CREATE POLICY "Users can view profiles from their tenant"
  ON public.profiles
  FOR SELECT
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- INSERT: Usuários podem criar perfis no seu tenant
DROP POLICY IF EXISTS "Users can insert profiles in their tenant" ON public.profiles;
CREATE POLICY "Users can insert profiles in their tenant"
  ON public.profiles
  FOR INSERT
  WITH CHECK (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- UPDATE: Usuários podem atualizar perfis do seu tenant
DROP POLICY IF EXISTS "Users can update profiles from their tenant" ON public.profiles;
CREATE POLICY "Users can update profiles from their tenant"
  ON public.profiles
  FOR UPDATE
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'))
  WITH CHECK (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- DELETE: Apenas admins podem deletar perfis
DROP POLICY IF EXISTS "Admins can delete profiles from their tenant" ON public.profiles;
CREATE POLICY "Admins can delete profiles from their tenant"
  ON public.profiles
  FOR DELETE
  USING (
    tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 9. Verificar estrutura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;
