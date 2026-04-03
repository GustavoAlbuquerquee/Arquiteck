-- =====================================================
-- ARQUITECK - Schema do Banco de Dados (Multitenant)
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE project_status AS ENUM (
  'orcamento',
  'pre_producao',
  'producao',
  'instalacao',
  'concluido'
);

CREATE TYPE checklist_tipo_etapa AS ENUM (
  'pre_producao',
  'saida',
  'instalacao'
);

-- =====================================================
-- TABELAS
-- =====================================================

-- Tabela de Tenants (Empresas/Marcenarias)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Clientes
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Projetos
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  titulo_ambiente TEXT NOT NULL,
  status project_status DEFAULT 'orcamento',
  data_prevista_instalacao DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Checklists
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tipo_etapa checklist_tipo_etapa NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_checklists_tenant_id ON checklists(tenant_id);
CREATE INDEX idx_checklists_project_id ON checklists(project_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas operacionais
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - CLIENTS
-- =====================================================

-- SELECT: Usuário só vê clientes do seu tenant
CREATE POLICY "Users can view clients from their tenant"
  ON clients
  FOR SELECT
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- INSERT: Usuário só pode criar clientes no seu tenant
CREATE POLICY "Users can insert clients in their tenant"
  ON clients
  FOR INSERT
  WITH CHECK (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- UPDATE: Usuário só pode atualizar clientes do seu tenant
CREATE POLICY "Users can update clients from their tenant"
  ON clients
  FOR UPDATE
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'))
  WITH CHECK (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- DELETE: Usuário só pode deletar clientes do seu tenant
CREATE POLICY "Users can delete clients from their tenant"
  ON clients
  FOR DELETE
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- =====================================================
-- POLÍTICAS RLS - PROJECTS
-- =====================================================

-- SELECT: Usuário só vê projetos do seu tenant
CREATE POLICY "Users can view projects from their tenant"
  ON projects
  FOR SELECT
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- INSERT: Usuário só pode criar projetos no seu tenant
CREATE POLICY "Users can insert projects in their tenant"
  ON projects
  FOR INSERT
  WITH CHECK (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- UPDATE: Usuário só pode atualizar projetos do seu tenant
CREATE POLICY "Users can update projects from their tenant"
  ON projects
  FOR UPDATE
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'))
  WITH CHECK (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- DELETE: Usuário só pode deletar projetos do seu tenant
CREATE POLICY "Users can delete projects from their tenant"
  ON projects
  FOR DELETE
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- =====================================================
-- POLÍTICAS RLS - CHECKLISTS
-- =====================================================

-- SELECT: Usuário só vê checklists do seu tenant
CREATE POLICY "Users can view checklists from their tenant"
  ON checklists
  FOR SELECT
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- INSERT: Usuário só pode criar checklists no seu tenant
CREATE POLICY "Users can insert checklists in their tenant"
  ON checklists
  FOR INSERT
  WITH CHECK (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- UPDATE: Usuário só pode atualizar checklists do seu tenant
CREATE POLICY "Users can update checklists from their tenant"
  ON checklists
  FOR UPDATE
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'))
  WITH CHECK (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- DELETE: Usuário só pode deletar checklists do seu tenant
CREATE POLICY "Users can delete checklists from their tenant"
  ON checklists
  FOR DELETE
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- =====================================================
-- DADOS DE EXEMPLO (OPCIONAL - REMOVER EM PRODUÇÃO)
-- =====================================================

-- Inserir tenant de exemplo
INSERT INTO tenants (id, nome_fantasia, cnpj)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Marcenaria Exemplo', '12.345.678/0001-90');

-- Inserir cliente de exemplo
INSERT INTO clients (tenant_id, nome, telefone, endereco)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'João Silva', '(11) 98765-4321', 'Rua Exemplo, 123');

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
