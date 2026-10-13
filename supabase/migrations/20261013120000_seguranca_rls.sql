-- =====================================================
-- FASE 15 - Segurança: isolamento por tenant e RBAC no banco
-- =====================================================
-- Execute no Supabase Dashboard > SQL Editor (ou `supabase db push`).
-- O script é idempotente: pode ser executado mais de uma vez.
--
-- O que muda:
-- 1. As policies deixam de usar auth.jwt()->'user_metadata' (editável pelo
--    próprio usuário via supabase.auth.updateUser) e passam a usar o
--    tenant/role gravados em public.profiles.
-- 2. Papel (role) e tenant do perfil só podem ser alterados por admin /
--    service_role. Exclusões e dados da empresa ficam restritos a admin.
-- 3. Storage: escrita em 'vistorias' e 'tenant_logos' presa à pasta do tenant.
-- 4. Trigger de novo usuário passa a confiar em app_metadata (gravado apenas
--    pelas Edge Functions com service_role).
--
-- Ordem recomendada de deploy: este SQL -> Edge Functions -> frontend.
-- =====================================================

-- -----------------------------------------------------
-- 1. Funções auxiliares (SECURITY DEFINER para ler profiles sem passar pela RLS)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
$$;

REVOKE ALL ON FUNCTION public.auth_tenant_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auth_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_tenant_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO service_role;

-- -----------------------------------------------------
-- 2. Perfis faltantes
-- Usuários antigos sem linha em profiles perderiam o acesso, já que a RLS
-- agora depende dela. Cria o perfil a partir do tenant_id dos metadados.
-- -----------------------------------------------------
INSERT INTO public.profiles (id, tenant_id, nome_completo, role)
SELECT
  u.id,
  (u.raw_user_meta_data->>'tenant_id')::uuid,
  COALESCE(NULLIF(u.raw_user_meta_data->>'nome_completo', ''), u.email),
  'membro'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  AND u.raw_user_meta_data->>'tenant_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = (u.raw_user_meta_data->>'tenant_id')::uuid
  );

-- Todo tenant precisa de ao menos um admin: promove o perfil mais antigo
UPDATE public.profiles p
SET role = 'admin'
WHERE p.id IN (
  SELECT DISTINCT ON (tenant_id) id
  FROM public.profiles
  WHERE tenant_id NOT IN (SELECT tenant_id FROM public.profiles WHERE role = 'admin')
  ORDER BY tenant_id, created_at ASC
);

-- -----------------------------------------------------
-- 3. Remove TODAS as policies atuais das tabelas do app
-- (os scripts antigos criaram nomes diferentes; recriamos do zero)
-- -----------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('tenants', 'profiles', 'clients', 'projects', 'checklists')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END
$$;

ALTER TABLE public.tenants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- 4. TENANTS: membros leem a própria empresa; só admin altera.
-- INSERT/DELETE apenas via Edge Function (service_role ignora RLS).
-- -----------------------------------------------------
CREATE POLICY "tenants_select" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.auth_tenant_id());

CREATE POLICY "tenants_update_admin" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.auth_tenant_id() AND public.auth_is_admin())
  WITH CHECK (id = public.auth_tenant_id());

-- -----------------------------------------------------
-- 5. PROFILES
-- -----------------------------------------------------
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR tenant_id = public.auth_tenant_id());

-- Próprio perfil, ou admin editando perfis do seu tenant
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (tenant_id = public.auth_tenant_id() AND public.auth_is_admin())
  )
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- Admin remove membros do seu tenant (mas não a si mesmo)
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.auth_tenant_id()
    AND public.auth_is_admin()
    AND id <> auth.uid()
  );
-- Sem policy de INSERT: perfis são criados pelo trigger / Edge Functions.

-- Impede que usuários comuns troquem o próprio role ou tenant
CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- service_role / SQL Editor não têm auth.uid()
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Não é permitido alterar o id ou a empresa do perfil';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar papéis';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard ON public.profiles;
CREATE TRIGGER profiles_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard();

-- -----------------------------------------------------
-- 6. CLIENTS / PROJECTS / CHECKLISTS
-- Membros leem, criam e editam no seu tenant; só admin exclui.
-- -----------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients', 'projects', 'checklists']
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
         USING (tenant_id = public.auth_tenant_id())',
      t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
         WITH CHECK (tenant_id = public.auth_tenant_id())',
      t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
         USING (tenant_id = public.auth_tenant_id())
         WITH CHECK (tenant_id = public.auth_tenant_id())',
      t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
         USING (tenant_id = public.auth_tenant_id() AND public.auth_is_admin())',
      t || '_delete_admin', t);

    -- Se o frontend não enviar tenant_id, usa o do usuário logado
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.auth_tenant_id()', t);
  END LOOP;
END
$$;

-- -----------------------------------------------------
-- 7. Trigger de novo usuário
-- - app_metadata (só service_role grava): fluxo das Edge Functions
-- - user_metadata: compatibilidade com a versão antiga do register-user,
--   aceita apenas se o tenant ainda não tem nenhum perfil (recém-criado).
--   Assim um signUp público não consegue entrar numa empresa existente.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant uuid;
  v_role public.user_role;
BEGIN
  IF NEW.raw_app_meta_data ? 'tenant_id' THEN
    v_tenant := (NEW.raw_app_meta_data->>'tenant_id')::uuid;
    v_role := COALESCE(NULLIF(NEW.raw_app_meta_data->>'role', ''), 'membro')::public.user_role;
  ELSIF NEW.raw_user_meta_data ? 'tenant_id' THEN
    v_tenant := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
    PERFORM pg_advisory_xact_lock(hashtext(v_tenant::text));
    IF EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id = v_tenant) THEN
      RETURN NEW;
    END IF;
    v_role := 'admin';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, tenant_id, nome_completo, role)
  VALUES (
    NEW.id,
    v_tenant,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome_completo', ''), NEW.email),
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------
-- 8. STORAGE
-- Os arquivos são gravados em "<tenant_id>/...", então a primeira pasta
-- do caminho precisa ser o tenant do usuário.
-- -----------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('vistorias', 'vistorias', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant_logos', 'tenant_logos', true)
ON CONFLICT (id) DO NOTHING;

-- Remove as policies antigas desses dois buckets
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        COALESCE(qual, '') || COALESCE(with_check, '') LIKE '%vistorias%'
        OR COALESCE(qual, '') || COALESCE(with_check, '') LIKE '%tenant_logos%'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
  END LOOP;
END
$$;

-- vistorias: fotos e assinaturas (qualquer membro do tenant)
CREATE POLICY "vistorias_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'vistorias' AND (storage.foldername(name))[1] = public.auth_tenant_id()::text);

CREATE POLICY "vistorias_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vistorias' AND (storage.foldername(name))[1] = public.auth_tenant_id()::text);

CREATE POLICY "vistorias_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vistorias' AND (storage.foldername(name))[1] = public.auth_tenant_id()::text)
  WITH CHECK (bucket_id = 'vistorias' AND (storage.foldername(name))[1] = public.auth_tenant_id()::text);

CREATE POLICY "vistorias_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vistorias' AND (storage.foldername(name))[1] = public.auth_tenant_id()::text);

-- tenant_logos: leitura pública (aparece no PDF), escrita só do admin do tenant
CREATE POLICY "tenant_logos_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'tenant_logos');

CREATE POLICY "tenant_logos_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant_logos'
    AND (storage.foldername(name))[1] = public.auth_tenant_id()::text
    AND public.auth_is_admin()
  );

CREATE POLICY "tenant_logos_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant_logos'
    AND (storage.foldername(name))[1] = public.auth_tenant_id()::text
    AND public.auth_is_admin()
  )
  WITH CHECK (
    bucket_id = 'tenant_logos'
    AND (storage.foldername(name))[1] = public.auth_tenant_id()::text
  );

CREATE POLICY "tenant_logos_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant_logos'
    AND (storage.foldername(name))[1] = public.auth_tenant_id()::text
    AND public.auth_is_admin()
  );

-- -----------------------------------------------------
-- 9. Conferência (deve retornar zero linhas):
-- usuários que ficaram sem perfil e, portanto, sem acesso aos dados.
-- -----------------------------------------------------
SELECT u.id, u.email, u.raw_user_meta_data->>'tenant_id' AS tenant_id_metadata
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
