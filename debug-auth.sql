-- =====================================================
-- FIX: Verificar e corrigir configuração do Auth
-- =====================================================

-- 1. Verificar se há triggers ou constraints no auth.users
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- 2. Desabilitar confirmação de email (para desenvolvimento)
-- Execute no Dashboard: Authentication > Settings > Email Auth
-- Ou via SQL (requer permissões de superuser):
-- UPDATE auth.config SET value = 'false' WHERE key = 'MAILER_AUTOCONFIRM';

-- 3. Verificar políticas RLS em auth.users (não deveria ter)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'auth' AND tablename = 'users';
