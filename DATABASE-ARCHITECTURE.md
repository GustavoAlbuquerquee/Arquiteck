# Arquitetura do Banco de Dados - Multitenant

## Diagrama de Relacionamentos

```
┌─────────────────┐
│    TENANTS      │
│─────────────────│
│ id (PK)         │
│ nome_fantasia   │
│ cnpj (UNIQUE)   │
│ created_at      │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────┴─────────────────────────────────┐
    │                                      │
    │                                      │
┌───▼──────────┐    ┌──────────────┐    ┌─▼──────────────┐
│   CLIENTS    │    │   PROJECTS   │◄───┤   CHECKLISTS   │
│──────────────│    │──────────────│ N:1│────────────────│
│ id (PK)      │    │ id (PK)      │    │ id (PK)        │
│ tenant_id(FK)│◄─┐ │ tenant_id(FK)│    │ tenant_id (FK) │
│ nome         │  │ │ client_id(FK)│    │ project_id(FK) │
│ telefone     │  │ │ titulo_amb.  │    │ tipo_etapa     │
│ endereco     │  │ │ status       │    │ payload (JSONB)│
│ created_at   │  │ │ data_prev.   │    │ created_at     │
└──────────────┘  │ │ created_at   │    └────────────────┘
                  │ └──────────────┘
                  │       ▲
                  └───────┘
                     1:N
```

## Enums

### project_status
- `orcamento`
- `pre_producao`
- `producao`
- `instalacao`
- `concluido`

### checklist_tipo_etapa
- `pre_producao`
- `saida`
- `instalacao`

## Row Level Security (RLS)

Todas as tabelas operacionais possuem RLS habilitado:

```sql
-- Exemplo de política RLS
CREATE POLICY "Users can view clients from their tenant"
  ON clients
  FOR SELECT
  USING (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));
```

### Como funciona:

1. Usuário faz login no Supabase
2. JWT contém `user_metadata.tenant_id`
3. Todas as queries são automaticamente filtradas pelo `tenant_id`
4. Impossível acessar dados de outro tenant

## Estrutura do Payload (JSONB)

O campo `payload` na tabela `checklists` é flexível:

```typescript
{
  // Items do checklist
  items: [
    { label: "Item 1", checked: true },
    { label: "Item 2", checked: false }
  ],
  
  // URLs de arquivos
  croqui_url: "https://...",
  assinatura_url: "https://...",
  
  // Fotos
  fotos: [
    "https://storage.supabase.co/foto1.jpg",
    "https://storage.supabase.co/foto2.jpg"
  ],
  
  // Campos dinâmicos
  observacoes: "Texto livre",
  medidas: { largura: 200, altura: 150 },
  // ... qualquer outro campo necessário
}
```

## Índices para Performance

```sql
-- Índices criados automaticamente
CREATE INDEX idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_checklists_tenant_id ON checklists(tenant_id);
CREATE INDEX idx_checklists_project_id ON checklists(project_id);
```

## Fluxo de Dados

```
1. Usuário se autentica
   ↓
2. JWT contém tenant_id
   ↓
3. Aplicação faz query
   ↓
4. RLS filtra automaticamente por tenant_id
   ↓
5. Retorna apenas dados do tenant do usuário
```

## Segurança

✅ RLS habilitado em todas as tabelas operacionais
✅ Políticas para SELECT, INSERT, UPDATE, DELETE
✅ Foreign Keys com CASCADE
✅ Índices para performance
✅ CNPJ único por tenant
✅ UUIDs como chaves primárias
