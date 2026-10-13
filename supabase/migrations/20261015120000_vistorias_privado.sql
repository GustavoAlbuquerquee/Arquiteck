-- =====================================================
-- FASE 17 - Fotos e assinaturas privadas
-- =====================================================
-- Execute no Supabase Dashboard > SQL Editor (arquivo inteiro, sem seleção)
-- SÓ DEPOIS que o frontend da fase 17 estiver publicado: a versão anterior do
-- app exibe as imagens pela URL pública, que deixa de funcionar aqui.
-- O script é idempotente.
--
-- Antes, o bucket 'vistorias' era público: quem tivesse o link de uma foto ou
-- assinatura de cliente conseguia abrir. Agora o app gera URLs assinadas
-- (temporárias), e só usuários do mesmo tenant conseguem gerá-las, pela
-- policy "vistorias_select" criada na fase 15.
-- =====================================================

UPDATE storage.buckets SET public = false WHERE id = 'vistorias';

-- Conferência: 4 linhas (vistorias_delete/insert/select/update), todas com
-- bucket_publico = false
SELECT (SELECT public FROM storage.buckets WHERE id = 'vistorias') AS bucket_publico,
       policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'vistorias_%'
 ORDER BY policyname;
