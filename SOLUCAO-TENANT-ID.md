# Solução: Adicionar tenant_id ao Usuário Existente

## Problema

O erro `new row violates row-level security policy for table "clients"` ocorre porque o usuário logado não tem o `tenant_id` nos metadados (user_metadata).

## Solução 1: Adicionar tenant_id Manualmente (Recomendado)

### Via Supabase Dashboard:

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Vá em **Authentication** → **Users**
3. Encontre o usuário que você está usando
4. Clique no usuário
5. Vá na aba **User Metadata** (ou **Raw User Meta Data**)
6. Adicione ou edite o JSON:
   ```json
   {
     "tenant_id": "00000000-0000-0000-0000-000000000001"
   }
   ```
7. Clique em **Save** ou **Update**
8. **IMPORTANTE:** Faça logout e login novamente no sistema

### Via SQL (Alternativa):

Execute no SQL Editor do Supabase:

```sql
-- Substitua 'seu@email.com' pelo email do usuário
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{tenant_id}',
  '"00000000-0000-0000-0000-000000000001"'::jsonb
)
WHERE email = 'seu@email.com';
```

## Solução 2: Criar Novo Usuário

Se preferir, crie um novo usuário usando a página de registro:

1. Faça logout
2. Acesse `/register`
3. Crie uma nova conta
4. O sistema adicionará o `tenant_id` automaticamente
5. Você será redirecionado para o Dashboard

## Solução 3: Verificar se o Tenant Existe

Certifique-se de que o tenant existe no banco:

```sql
-- Verificar se o tenant existe
SELECT * FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001';

-- Se não existir, criar:
INSERT INTO tenants (id, nome_fantasia, cnpj)
VALUES ('00000000-0000-0000-0000-000000000001', 'Primor Móveis', '12.345.678/0001-90');
```

## Verificar se Funcionou

Após adicionar o `tenant_id`:

1. Faça **logout** do sistema
2. Faça **login** novamente
3. Abra o Console do navegador (F12)
4. Execute:
   ```javascript
   const { data } = await supabase.auth.getUser();
   console.log(data.user.user_metadata);
   // Deve mostrar: { tenant_id: "00000000-0000-0000-0000-000000000001" }
   ```

## Troubleshooting

### "Ainda dá erro após adicionar tenant_id"

1. Certifique-se de fazer **logout e login** novamente
2. Limpe o cache do navegador (Ctrl+Shift+Delete)
3. Verifique se o tenant_id está correto no Dashboard

### "Não consigo editar User Metadata"

Use a solução SQL:

```sql
-- Ver metadados atuais
SELECT email, raw_user_meta_data FROM auth.users WHERE email = 'seu@email.com';

-- Atualizar metadados
UPDATE auth.users
SET raw_user_meta_data = '{"tenant_id": "00000000-0000-0000-0000-000000000001"}'::jsonb
WHERE email = 'seu@email.com';
```

### "Erro: tenant_id não é um UUID válido"

Certifique-se de usar o UUID correto:
```
00000000-0000-0000-0000-000000000001
```

## Prevenção Futura

Para evitar esse problema com novos usuários:

1. **SEMPRE** use a página `/register` do sistema
2. **NÃO** crie usuários manualmente no Dashboard sem adicionar tenant_id
3. Se criar manualmente, **SEMPRE** adicione o tenant_id nos metadados

## Comando Rápido (SQL)

```sql
-- Adicionar tenant_id a TODOS os usuários sem tenant_id
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{tenant_id}',
  '"00000000-0000-0000-0000-000000000001"'::jsonb
)
WHERE raw_user_meta_data->>'tenant_id' IS NULL;
```

## Após Resolver

1. Faça logout
2. Faça login
3. Tente criar um briefing novamente
4. Deve funcionar! ✅
