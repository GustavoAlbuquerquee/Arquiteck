-- =====================================================
-- FASE 16 - Nova Visita: salvar o briefing numa transação só
-- =====================================================
-- Execute no Supabase Dashboard > SQL Editor (arquivo inteiro, sem seleção).
-- O script é idempotente: pode ser executado mais de uma vez.
--
-- Antes, o app gravava cliente -> projeto -> checklist em 3 chamadas
-- separadas. Uma falha no meio deixava cliente/projeto soltos, e o
-- "tentar de novo" duplicava tudo. Esta função faz as 3 gravações na mesma
-- transação: ou grava tudo, ou nada.
--
-- SECURITY INVOKER: roda com as permissões de quem chama, então as policies
-- de RLS por tenant continuam valendo.
-- =====================================================

CREATE OR REPLACE FUNCTION public.salvar_briefing(
  p_project_id uuid,   -- NULL cria um briefing novo; preenchido edita o existente
  p_cliente jsonb,     -- { nome, telefone, endereco }
  p_projeto jsonb,     -- { titulo_ambiente, data_prevista_instalacao }
  p_payload jsonb      -- payload do checklist de pré-produção
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_tenant uuid := public.auth_tenant_id();
  v_client_id uuid;
  v_project_id uuid;
  v_checklist_id uuid;
  v_data date := NULLIF(p_projeto->>'data_prevista_instalacao', '')::date;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Perfil sem empresa vinculada. Fale com o administrador da conta.'
      USING ERRCODE = '42501';
  END IF;

  IF p_project_id IS NULL THEN
    INSERT INTO public.clients (tenant_id, nome, telefone, endereco)
    VALUES (v_tenant, p_cliente->>'nome', p_cliente->>'telefone', p_cliente->>'endereco')
    RETURNING id INTO v_client_id;

    INSERT INTO public.projects (tenant_id, client_id, titulo_ambiente, data_prevista_instalacao, status)
    VALUES (v_tenant, v_client_id, p_projeto->>'titulo_ambiente', v_data, 'orcamento')
    RETURNING id INTO v_project_id;

    INSERT INTO public.checklists (tenant_id, project_id, tipo_etapa, payload)
    VALUES (v_tenant, v_project_id, 'pre_producao', p_payload);

    RETURN v_project_id;
  END IF;

  -- Edição. A RLS esconde projetos de outro tenant, então eles caem no
  -- "não encontrado" abaixo.
  UPDATE public.projects
     SET titulo_ambiente = p_projeto->>'titulo_ambiente',
         data_prevista_instalacao = v_data
   WHERE id = p_project_id
  RETURNING id, client_id INTO v_project_id, v_client_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Briefing não encontrado ou sem permissão para editar.'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.clients
     SET nome = p_cliente->>'nome',
         telefone = p_cliente->>'telefone',
         endereco = p_cliente->>'endereco'
   WHERE id = v_client_id;

  -- O briefing é o checklist de pré-produção. Se o projeto ainda não tiver
  -- um, cria (antes a tela dizia "atualizado" sem gravar nada).
  SELECT id INTO v_checklist_id
    FROM public.checklists
   WHERE project_id = v_project_id AND tipo_etapa = 'pre_producao'
   ORDER BY created_at
   LIMIT 1;

  IF v_checklist_id IS NULL THEN
    INSERT INTO public.checklists (tenant_id, project_id, tipo_etapa, payload)
    VALUES (v_tenant, v_project_id, 'pre_producao', p_payload);
  ELSE
    UPDATE public.checklists SET payload = p_payload WHERE id = v_checklist_id;
  END IF;

  RETURN v_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_briefing(uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_briefing(uuid, jsonb, jsonb, jsonb) TO authenticated;

-- Conferência: deve retornar 1 linha com salvar_briefing
SELECT proname FROM pg_proc WHERE proname = 'salvar_briefing';
