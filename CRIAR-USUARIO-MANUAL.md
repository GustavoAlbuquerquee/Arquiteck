# Como Criar Usuário Manualmente no Supabase

## Opção 1: Via Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá em **Authentication** → **Users**
3. Clique em **Add User** → **Create new user**
4. Preencha:
   - **Email:** `teste@primormoveis.com`
   - **Password:** `123456`
   - **Auto Confirm User:** ✅ (marque esta opção)
5. Clique em **Create User**
6. Após criar, clique no usuário
7. Vá na aba **User Metadata**
8. Adicione o campo:
   ```json
   {
     "tenant_id": "00000000-0000-0000-0000-000000000001"
   }
   ```
9. Salve

## Opção 2: Via SQL (Avançado)

**IMPORTANTE:** Este método é mais complexo. Use apenas se a Opção 1 não funcionar.

Execute no SQL Editor do Supabase:

```sql
-- 1. Criar usuário na tabela auth.users
-- NOTA: Você precisará gerar um hash bcrypt da senha
-- Use: https://bcrypt-generator.com/ com a senha "123456"

-- Exemplo (substitua o hash pela sua senha):
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'teste@primormoveis.com',
  '$2a$10$HASH_GERADO_AQUI', -- Substitua pelo hash bcrypt
  NOW(),
  '{"tenant_id": "00000000-0000-0000-0000-000000000001"}'::jsonb,
  NOW(),
  NOW(),
  '',
  ''
);
```

## Opção 3: Aguardar Rate Limit

O rate limit do Supabase geralmente reseta em:
- **1 hora** para tentativas de signup
- **15 minutos** para tentativas de login

Aguarde e tente novamente.

## Opção 4: Usar Email Diferente

Se você já tentou criar várias contas com o mesmo email, tente com um email diferente:
- `teste2@primormoveis.com`
- `admin@primormoveis.com`
- `usuario@primormoveis.com`

## Verificar Rate Limits no Supabase

1. Acesse o Dashboard
2. Vá em **Authentication** → **Rate Limits**
3. Veja os limites atuais:
   - **Signup:** geralmente 4-5 por hora
   - **Login:** geralmente 30 por hora

## Após Criar o Usuário

1. Vá para `http://localhost:3000/login`
2. Faça login com:
   - Email: `teste@primormoveis.com`
   - Senha: `123456`
3. Você será redirecionado para o Dashboard

## Troubleshooting

### "Email not confirmed"
- No Dashboard, vá em Authentication → Users
- Clique no usuário
- Clique em "Confirm email"

### "Invalid login credentials"
- Verifique se o email está correto
- Verifique se a senha está correta
- Confirme que o usuário foi criado

### "User not found"
- Verifique se o usuário aparece em Authentication → Users
- Se não aparecer, crie novamente

## Dica para Desenvolvimento

Para evitar rate limits durante desenvolvimento, você pode:

1. Criar 2-3 usuários de teste de uma vez
2. Usar sempre os mesmos usuários para testar
3. Não ficar criando e deletando usuários repetidamente

## Usuários de Teste Sugeridos

Crie estes usuários no Dashboard:

```
1. Admin
   Email: admin@primormoveis.com
   Senha: admin123
   Metadata: {"tenant_id": "00000000-0000-0000-0000-000000000001"}

2. Vendedor
   Email: vendedor@primormoveis.com
   Senha: vendedor123
   Metadata: {"tenant_id": "00000000-0000-0000-0000-000000000001"}

3. Teste
   Email: teste@primormoveis.com
   Senha: teste123
   Metadata: {"tenant_id": "00000000-0000-0000-0000-000000000001"}
```

Todos devem ter o mesmo `tenant_id` para compartilhar os dados da Primor Móveis.
