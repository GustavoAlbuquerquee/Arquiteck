-- =====================================================
-- FASE 20 - Teste de coexistência do WhatsApp (temporário)
-- =====================================================
-- Execute no Supabase Dashboard > SQL Editor (arquivo inteiro, sem seleção).
-- Idempotente. Cria só o registro do que a função wa-webhook recebe durante o
-- teste de 1 semana no número secundário. Não mexe no board.
--
-- Contém conversas de clientes: RLS ligada e SEM policies, ou seja, nenhum
-- usuário do app lê esta tabela; só a função (service_role) grava e você
-- consulta pelo SQL Editor. Apague ao fim do teste:
--   DROP VIEW IF EXISTS public.whatsapp_teste_resumo;
--   DROP TABLE IF EXISTS public.whatsapp_webhook_log;
-- =====================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recebido_em timestamptz NOT NULL DEFAULT now(),
  campo text NOT NULL,          -- messages, smb_message_echoes, history, smb_app_state_sync...
  tipo text NOT NULL,           -- text, audio, status:read, historico, contato:add...
  autor text NOT NULL,          -- cliente, equipe_app, sistema, desconhecido
  wa_message_id text,
  de text,
  para text,
  texto text,
  enviada_em timestamptz,
  phone_number_id text,
  payload jsonb NOT NULL
);

-- Reenvio do mesmo acontecimento não duplica
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_webhook_log_unico
  ON public.whatsapp_webhook_log (wa_message_id, campo, tipo);

CREATE INDEX IF NOT EXISTS whatsapp_webhook_log_recebido
  ON public.whatsapp_webhook_log (recebido_em DESC);

ALTER TABLE public.whatsapp_webhook_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_webhook_log FROM anon, authenticated;
GRANT SELECT, INSERT ON public.whatsapp_webhook_log TO service_role;

-- Resumo para o checklist do teste: o que chegou, de quem, quantas vezes
CREATE OR REPLACE VIEW public.whatsapp_teste_resumo
WITH (security_invoker = true) AS
SELECT
  campo,
  autor,
  tipo,
  count(*) AS quantidade,
  min(recebido_em) AS primeiro,
  max(recebido_em) AS ultimo
FROM public.whatsapp_webhook_log
GROUP BY campo, autor, tipo
ORDER BY ultimo DESC;

REVOKE ALL ON public.whatsapp_teste_resumo FROM anon, authenticated;

-- Conferência: deve retornar a tabela e a view
SELECT table_name, table_type FROM information_schema.tables
 WHERE table_schema = 'public' AND table_name IN ('whatsapp_webhook_log', 'whatsapp_teste_resumo');
