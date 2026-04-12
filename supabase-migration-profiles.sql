-- =====================================================
-- FASE 10: Criação da Tabela de Perfis de Usuários
-- =====================================================
-- Este script cria a tabela 'profiles' que vincula usuários
-- do Supabase Auth às organizações (tenants)
-- =====================================================

-- Criar tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome_completo TEXT,
  cargo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - PROFILES
-- =====================================================

-- SELECT: Usuário só vê perfis do seu tenant
CREATE POLICY "Users can view profiles from their tenant"
  ON profiles
  FOR SELECT
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- INSERT: Usuário só pode criar perfis no seu tenant
CREATE POLICY "Users can insert profiles in their tenant"
  ON profiles
  FOR INSERT
  WITH CHECK (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- UPDATE: Usuário só pode atualizar seu próprio perfil
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE: Usuário só pode deletar seu próprio perfil
CREATE POLICY "Users can delete their own profile"
  ON profiles
  FOR DELETE
  USING (id = auth.uid());

-- =====================================================
-- FUNÇÃO TRIGGER: Auto-criar perfil ao registrar usuário
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, tenant_id, nome_completo)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'tenant_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para auto-criar perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STORAGE BUCKET PARA FOTOS DE PERFIL (OPCIONAL)
-- =====================================================

-- Criar bucket para avatares (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política de storage: Qualquer usuário autenticado pode fazer upload
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política de storage: Qualquer um pode ver avatares (bucket público)
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
