-- =====================================================
-- FASE 19 - Quem moveu o card: origem dos movimentos de etapa
-- =====================================================
-- Execute no Supabase Dashboard > SQL Editor (arquivo inteiro, sem seleção).
-- Idempotente. Pode rodar antes ou depois do frontend: não muda nada para
-- quem move o card pela tela.
--
-- Antes, o gatilho projects_registrar_etapa gravava toda troca de etapa com
-- origem 'manual'. Quando a integração com o WhatsApp e a IA começarem a mover
-- cards, o histórico mostraria esses movimentos como feitos por uma pessoa.
--
-- Agora:
-- - o gatilho lê a origem e o motivo de variáveis da transação
--   (arquiteck.origem / arquiteck.motivo); sem elas, continua 'manual';
-- - public.mover_etapa() é o único caminho para gravar origem 'ia' ou
--   'whatsapp', e só aceita isso de quem chama com a chave de serviço
--   (o servidor). Pela tela, um usuário só consegue registrar 'manual'.
--
-- Um usuário não consegue forjar a origem chamando set_config pela API: o
-- PostgREST só expõe funções do schema public.
-- =====================================================

CREATE OR REPLACE FUNCTION public.projects_registrar_etapa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_origem text := COALESCE(NULLIF(current_setting('arquiteck.origem', true), ''), 'manual');
  v_motivo text := NULLIF(current_setting('arquiteck.motivo', true), '');
BEGIN
  IF v_origem NOT IN ('manual', 'whatsapp', 'ia') THEN
    v_origem := 'manual';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_eventos (tenant_id, project_id, tipo, para_etapa, mensagem, origem, criado_por)
    VALUES (NEW.tenant_id, NEW.id, 'criado', NEW.status, v_motivo, v_origem, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.project_eventos (tenant_id, project_id, tipo, de_etapa, para_etapa, mensagem, origem, criado_por)
    VALUES (NEW.tenant_id, NEW.id, 'etapa', OLD.status, NEW.status, v_motivo, v_origem, auth.uid());
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.projects_registrar_etapa() FROM PUBLIC, anon, authenticated;

-- Move o card de etapa registrando quem moveu e por quê.
-- SECURITY INVOKER: pela tela, a RLS do tenant continua valendo; o servidor
-- (service_role) ignora a RLS, como em qualquer chamada dele.
CREATE OR REPLACE FUNCTION public.mover_etapa(
  p_project_id uuid,
  p_para public.project_status,
  p_origem text DEFAULT 'manual',
  p_motivo text DEFAULT NULL
)
RETURNS public.project_status
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_papel text := COALESCE(auth.jwt()->>'role', '');
BEGIN
  IF p_origem NOT IN ('manual', 'whatsapp', 'ia') THEN
    RAISE EXCEPTION 'Origem inválida: %', p_origem USING ERRCODE = '22023';
  END IF;

  IF p_origem <> 'manual' AND v_papel <> 'service_role' THEN
    RAISE EXCEPTION 'Só o servidor registra movimentos automáticos.' USING ERRCODE = '42501';
  END IF;

  -- is_local = true: valem só até o fim desta transação (esta chamada)
  PERFORM set_config('arquiteck.origem', p_origem, true);
  PERFORM set_config('arquiteck.motivo', COALESCE(btrim(p_motivo), ''), true);

  UPDATE public.projects SET status = p_para WHERE id = p_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto não encontrado ou sem permissão.' USING ERRCODE = 'P0002';
  END IF;

  RETURN p_para;
END;
$$;

REVOKE ALL ON FUNCTION public.mover_etapa(uuid, public.project_status, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mover_etapa(uuid, public.project_status, text, text) TO authenticated, service_role;

-- Conferência: deve retornar 1 linha com mover_etapa
SELECT proname FROM pg_proc WHERE proname = 'mover_etapa';
