-- =====================================================
-- VERIFICAR E CORRIGIR TRIGGERS NO AUTH
-- =====================================================

-- 1. Listar todas as triggers no schema auth
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth';

-- 2. Verificar se há trigger handle_new_user (comum em tutoriais)
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%handle%user%' OR proname LIKE '%new%user%';

-- 3. Se encontrar trigger handle_new_user, REMOVA com:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. Verificar extensões instaladas
SELECT * FROM pg_extension;

-- 5. Verificar se há tabela public.users ou public.profiles
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name = 'users' OR table_name = 'profiles');
