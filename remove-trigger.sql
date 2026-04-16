-- =====================================================
-- REMOVER TRIGGER PROBLEMÁTICA
-- =====================================================

-- 1. Remover a trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Remover a função (opcional, mas recomendado)
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Verificar se foi removida
SELECT 
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'auth' AND event_object_table = 'users';

-- Resultado esperado: nenhuma linha (trigger removida com sucesso)
