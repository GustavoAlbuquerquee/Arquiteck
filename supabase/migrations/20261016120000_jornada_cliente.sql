-- =====================================================
-- FASE 18 - Jornada do cliente: do primeiro contato à instalação
-- =====================================================
-- Execute no Supabase Dashboard > SQL Editor (arquivo inteiro, sem seleção)
-- ou com `supabase db push`. Rode ANTES de publicar o frontend do board.
--
-- Idempotente e só aditiva: pode ser executada mais de uma vez, não apaga
-- nem renomeia nada, e os valores antigos do enum continuam valendo.
--
-- O que muda:
-- 1. project_status ganha as etapas de venda. Ordem final da jornada:
--      novo_contato -> em_conversa -> visita -> orcamento -> fechado
--      -> pre_producao -> producao -> instalacao -> concluido
--    Decisão: o valor existente 'orcamento' passa a ser a etapa
--    "Orçamento enviado". Os projetos que já estão nele não mudam, e o
--    wizard de Nova Visita (salvar_briefing) continua criando em 'orcamento'.
-- 2. projects ganha os relógios da jornada (etapa_desde, último contato do
--    cliente e nosso, próximo follow-up) e titulo_ambiente aceita nulo, para
--    leads que ainda não têm ambiente definido.
-- 3. Tabela project_eventos: histórico de cada card (mudança de etapa,
--    contatos, mensagens, notas). Base do agente de WhatsApp da fase 2.
-- 4. Trigger: ao mudar o status, atualiza etapa_desde e grava um evento.
-- 5. RPC criar_lead: cliente + projeto em "Novo contato" numa transação.
--
-- Sobre o enum: ALTER TYPE ... ADD VALUE pode rodar dentro de transação
-- (Postgres 12+), mas o valor novo só pode ser USADO depois do commit. Por
-- isso nada neste arquivo grava os valores novos: eles só aparecem dentro de
-- funções plpgsql, que são avaliadas na hora da chamada.
-- =====================================================

-- -----------------------------------------------------
-- 1. Etapas de venda no enum, na ordem da jornada
-- -----------------------------------------------------
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'novo_contato' BEFORE 'orcamento';
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'em_conversa' BEFORE 'orcamento';
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'visita' BEFORE 'orcamento';
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'fechado' BEFORE 'pre_producao';

-- -----------------------------------------------------
-- 2. Colunas novas em projects
-- -----------------------------------------------------
-- Desde quando o card está na etapa atual. Os projetos existentes herdam a
-- data de criação (o banco não guardava a data de cada etapa).
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS etapa_desde timestamptz;
UPDATE public.projects
   SET etapa_desde = COALESCE(created_at, now())
 WHERE etapa_desde IS NULL;
ALTER TABLE public.projects ALTER COLUMN etapa_desde SET DEFAULT now();
ALTER TABLE public.projects ALTER COLUMN etapa_desde SET NOT NULL;

-- Último contato do cliente com a loja (mensagem, ligação, visita).
-- Mais novo que ultimo_contato_nosso_at = cliente esperando resposta.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ultimo_contato_cliente_at timestamptz;
-- Último contato da loja com o cliente (resposta, cobrança, retomada)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ultimo_contato_nosso_at timestamptz;
-- Próximo toque combinado (follow-up D+1/D+3/D+7 do orçamento)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS proximo_followup_at timestamptz;

-- Lead recém-chegado ainda não tem ambiente
ALTER TABLE public.projects ALTER COLUMN titulo_ambiente DROP NOT NULL;

COMMENT ON COLUMN public.projects.etapa_desde IS 'Quando o projeto entrou na etapa (status) atual. Mantido pelo trigger projects_etapa_desde.';
COMMENT ON COLUMN public.projects.ultimo_contato_cliente_at IS 'Último contato do cliente com a loja.';
COMMENT ON COLUMN public.projects.ultimo_contato_nosso_at IS 'Último contato da loja com o cliente.';
COMMENT ON COLUMN public.projects.proximo_followup_at IS 'Próximo follow-up previsto (cadência D+1/D+3/D+7 na etapa orcamento).';

-- -----------------------------------------------------
-- 3. Histórico de eventos de cada projeto
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.auth_tenant_id()
    REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  de_etapa public.project_status,
  para_etapa public.project_status,
  mensagem text,
  origem text NOT NULL DEFAULT 'manual',
  criado_por uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- clock_timestamp: eventos gravados na mesma transação mantêm a ordem
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT project_eventos_origem_check CHECK (origem IN ('manual', 'whatsapp', 'ia'))
);

COMMENT ON TABLE public.project_eventos IS 'Linha do tempo de cada projeto: etapas, contatos e mensagens.';
COMMENT ON COLUMN public.project_eventos.tipo IS
  'criado | etapa | mensagem (texto do cliente) | contato_cliente | resposta | followup | retomada | nota';
COMMENT ON COLUMN public.project_eventos.origem IS 'manual (equipe no app) | whatsapp (integração) | ia (agente)';

CREATE INDEX IF NOT EXISTS project_eventos_project_idx
  ON public.project_eventos (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS project_eventos_tenant_idx
  ON public.project_eventos (tenant_id, created_at DESC);

-- RLS no mesmo padrão de clients/projects/checklists (20261013120000):
-- membros leem e criam no próprio tenant; só admin exclui. Sem UPDATE: o
-- histórico não é reescrito. O INSERT também confere que o projeto é do tenant.
ALTER TABLE public.project_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_eventos_select" ON public.project_eventos;
CREATE POLICY "project_eventos_select" ON public.project_eventos
  FOR SELECT TO authenticated
  USING (tenant_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "project_eventos_insert" ON public.project_eventos;
CREATE POLICY "project_eventos_insert" ON public.project_eventos
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.auth_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.projects p
       WHERE p.id = project_id AND p.tenant_id = public.auth_tenant_id()
    )
  );

DROP POLICY IF EXISTS "project_eventos_delete_admin" ON public.project_eventos;
CREATE POLICY "project_eventos_delete_admin" ON public.project_eventos
  FOR DELETE TO authenticated
  USING (tenant_id = public.auth_tenant_id() AND public.auth_is_admin());

GRANT SELECT, INSERT, DELETE ON public.project_eventos TO authenticated;

-- -----------------------------------------------------
-- 4. Triggers da etapa
-- -----------------------------------------------------
-- BEFORE UPDATE: o status mudou, o relógio da etapa recomeça
CREATE OR REPLACE FUNCTION public.projects_etapa_desde()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.etapa_desde := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_etapa_desde ON public.projects;
CREATE TRIGGER projects_etapa_desde
  BEFORE UPDATE OF status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.projects_etapa_desde();

-- AFTER INSERT/UPDATE: registra a criação e cada troca de etapa no histórico.
-- SECURITY DEFINER para gravar mesmo quando quem altera é o service_role ou
-- uma integração; o tenant vem do próprio projeto.
CREATE OR REPLACE FUNCTION public.projects_registrar_etapa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_eventos (tenant_id, project_id, tipo, para_etapa, origem, criado_por)
    VALUES (NEW.tenant_id, NEW.id, 'criado', NEW.status, 'manual', auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.project_eventos (tenant_id, project_id, tipo, de_etapa, para_etapa, origem, criado_por)
    VALUES (NEW.tenant_id, NEW.id, 'etapa', OLD.status, NEW.status, 'manual', auth.uid());
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.projects_registrar_etapa() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS projects_registrar_etapa ON public.projects;
CREATE TRIGGER projects_registrar_etapa
  AFTER INSERT OR UPDATE OF status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.projects_registrar_etapa();

-- -----------------------------------------------------
-- 5. Novo contato direto no board (sem o wizard)
-- SECURITY INVOKER: as policies de RLS por tenant continuam valendo.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_lead(
  p_nome text,
  p_telefone text DEFAULT NULL,
  p_observacao text DEFAULT NULL
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
  v_nome text := NULLIF(btrim(p_nome), '');
  v_obs text := NULLIF(btrim(p_observacao), '');
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Perfil sem empresa vinculada. Fale com o administrador da conta.'
      USING ERRCODE = '42501';
  END IF;

  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Informe o nome do cliente.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.clients (tenant_id, nome, telefone)
  VALUES (v_tenant, v_nome, NULLIF(btrim(p_telefone), ''))
  RETURNING id INTO v_client_id;

  -- O cliente acabou de chamar: o relógio de resposta começa agora
  INSERT INTO public.projects (tenant_id, client_id, titulo_ambiente, status, ultimo_contato_cliente_at)
  VALUES (v_tenant, v_client_id, NULL, 'novo_contato'::public.project_status, now())
  RETURNING id INTO v_project_id;

  INSERT INTO public.project_eventos (tenant_id, project_id, tipo, origem)
  VALUES (v_tenant, v_project_id, 'contato_cliente', 'manual');

  IF v_obs IS NOT NULL THEN
    INSERT INTO public.project_eventos (tenant_id, project_id, tipo, mensagem, origem)
    VALUES (v_tenant, v_project_id, 'nota', v_obs, 'manual');
  END IF;

  RETURN v_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_lead(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_lead(text, text, text) TO authenticated;

-- -----------------------------------------------------
-- 6. Conferência
-- -----------------------------------------------------
-- Deve listar as 9 etapas na ordem da jornada. Lê o catálogo em vez de
-- enum_range(), que recusaria os valores novos antes do commit.
SELECT enumlabel AS etapa
  FROM pg_enum
 WHERE enumtypid = 'public.project_status'::regtype
 ORDER BY enumsortorder;
