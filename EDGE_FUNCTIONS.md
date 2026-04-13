# Deploy da Edge Function - create-tenant

## Pré-requisitos

1. Instalar Supabase CLI:
```bash
npm install -g supabase
```

2. Login no Supabase:
```bash
supabase login
```

## Deploy

### 1. Fazer deploy da função

```bash
supabase functions deploy create-tenant --project-ref YOUR_PROJECT_ID
```

Substitua `YOUR_PROJECT_ID` pelo ID do seu projeto (encontre em: Dashboard > Settings > General)

### 2. Configurar variáveis de ambiente (já configuradas automaticamente)

A função usa:
- `SUPABASE_URL` - URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (com permissões admin)

Essas variáveis são injetadas automaticamente pelo Supabase.

### 3. Executar o SQL para configurar RLS

No Supabase Dashboard > SQL Editor, execute:

```sql
-- Habilitar RLS na tabela tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seu próprio tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants
  FOR SELECT
  USING (id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));
```

## Testar localmente (opcional)

```bash
# Iniciar Supabase local
supabase start

# Servir função localmente
supabase functions serve create-tenant --env-file ./supabase/.env.local
```

## Verificar deploy

Após o deploy, a função estará disponível em:
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/create-tenant
```

## Fluxo de Registro

1. Usuário preenche formulário (nome, email, senha, empresa, CNPJ)
2. Frontend cria usuário via `supabase.auth.signUp()`
3. Frontend chama Edge Function `create-tenant` (autenticado)
4. Edge Function cria tenant e atualiza `user_metadata` com `tenant_id`
5. Usuário é redirecionado para o dashboard

## Troubleshooting

### Erro: "Function not found"
- Verifique se fez deploy: `supabase functions list`
- Confirme o project-ref correto

### Erro: "Database error"
- Verifique se executou o SQL de RLS
- Confirme que a tabela `tenants` existe

### Erro: "Unauthorized"
- Verifique se o usuário está autenticado antes de chamar a função
- Confirme que o token JWT está sendo enviado no header
