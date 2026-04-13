-- =====================================================
-- FIX: Permitir criação de tenants durante registro
-- =====================================================

-- Desabilitar RLS na tabela tenants (permite INSERT público)
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

-- OU, se preferir manter RLS ativo, criar política para permitir INSERT público:
-- ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public tenant creation"
--   ON tenants
--   FOR INSERT
--   TO anon
--   WITH CHECK (true);
