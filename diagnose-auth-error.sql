-- =====================================================
-- DIAGNÓSTICO: Verificar configuração do Auth
-- =====================================================

-- 1. Verificar triggers no schema auth
SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
ORDER BY trigger_name;

-- 2. Verificar se há foreign keys problemáticas
SELECT
    tc.constraint_name,
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (tc.table_schema = 'auth' OR ccu.table_schema = 'auth');

-- 3. Verificar se há tabela profiles ou similar
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name LIKE '%profile%' OR table_name LIKE '%user%';

-- 4. Desabilitar confirmação de email (IMPORTANTE para desenvolvimento)
-- Execute este comando no Supabase Dashboard:
-- Settings > Authentication > Email Auth > Confirm email = OFF
