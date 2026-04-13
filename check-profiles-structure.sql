-- =====================================================
-- VERIFICAR ESTRUTURA DA TABELA PROFILES
-- =====================================================

-- 1. Ver estrutura da tabela profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Ver constraints da tabela profiles
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name = 'profiles';

-- 3. Ver triggers na tabela profiles ou auth.users
SELECT 
    trigger_name,
    event_object_table,
    action_statement,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE (event_object_schema = 'auth' AND event_object_table = 'users')
   OR (event_object_schema = 'public' AND event_object_table = 'profiles');

-- 4. SOLUÇÃO: Remover trigger problemática (se existir)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();

-- 5. OU: Adicionar coluna tenant_id na tabela profiles (se necessário)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID;
