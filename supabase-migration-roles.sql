-- =====================================================
-- FASE 11: Sistema de Roles (RBAC)
-- =====================================================
-- Adiciona coluna 'role' na tabela profiles e atualiza
-- o trigger para definir o primeiro usuário como admin
-- =====================================================

-- 1. Criar ENUM para roles
CREATE TYPE user_role AS ENUM ('admin', 'membro');

-- 2. Adicionar coluna 'role' na tabela profiles
ALTER TABLE profiles 
ADD COLUMN role user_role DEFAULT 'membro' NOT NULL;

-- 3. Atualizar o trigger para definir o primeiro usuário como admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_tenant_id UUID;
  is_first_user BOOLEAN;
BEGIN
  -- Extrair tenant_id dos metadados do usuário
  user_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
  
  -- Verificar se é o primeiro usuário deste tenant
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE tenant_id = user_tenant_id
  ) INTO is_first_user;
  
  -- Inserir perfil com role apropriada
  INSERT INTO public.profiles (id, tenant_id, nome_completo, role)
  VALUES (
    NEW.id,
    user_tenant_id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    CASE 
      WHEN is_first_user THEN 'admin'::user_role
      ELSE 'membro'::user_role
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recriar o trigger (caso já exista)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Atualizar usuários existentes para admin (se houver)
-- ATENÇÃO: Execute apenas se você já tiver usuários cadastrados
-- e quiser torná-los admins
UPDATE profiles 
SET role = 'admin'::user_role 
WHERE id IN (
  SELECT DISTINCT ON (tenant_id) id 
  FROM profiles 
  ORDER BY tenant_id, created_at ASC
);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
