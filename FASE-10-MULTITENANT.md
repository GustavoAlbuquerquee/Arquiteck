# Fase 10 - SaaS Multi-tenant (Organizações)

## ✅ Status Atual

**Boa notícia:** Seu sistema **JÁ É MULTI-TENANT**! 

A estrutura de banco de dados já possui:
- ✅ Tabela `tenants` (organizações/empresas)
- ✅ Coluna `tenant_id` em `clients`, `projects` e `checklists`
- ✅ Foreign Keys configuradas
- ✅ RLS (Row Level Security) ativo em todas as tabelas
- ✅ Políticas RLS que isolam dados por tenant

## ❌ O que está faltando

Falta apenas a **tabela de perfis de usuários** (`profiles`) que vincula usuários do Supabase Auth aos tenants.

## 📋 Script SQL Gerado

Execute o arquivo `supabase-migration-profiles.sql` no SQL Editor do Supabase.

### O que o script faz:

1. **Cria tabela `profiles`**
   - `id` (UUID) → FK para `auth.users(id)`
   - `tenant_id` (UUID) → FK para `tenants(id)`
   - `nome_completo` (TEXT)
   - `cargo` (TEXT)
   - `created_at`, `updated_at`

2. **Configura RLS na tabela `profiles`**
   - SELECT: Usuário vê apenas perfis do seu tenant
   - INSERT: Usuário cria perfis apenas no seu tenant
   - UPDATE: Usuário atualiza apenas seu próprio perfil
   - DELETE: Usuário deleta apenas seu próprio perfil

3. **Cria trigger automático**
   - Quando um usuário se registra no Supabase Auth, automaticamente cria um registro em `profiles`
   - Extrai `tenant_id` de `user_metadata` do usuário

4. **Cria bucket de storage para avatares** (opcional)
   - Bucket público `avatars`
   - Políticas de upload e visualização

## 🔧 Arquivos TypeScript a Atualizar

Após executar o SQL, você precisa **regenerar os tipos TypeScript**:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > apps/web/src/lib/supabase/types.ts
```

### Arquivos que precisarão de ajustes manuais:

1. **`apps/web/src/lib/supabase/client.ts`**
   - Já deve estar correto (não precisa alterar)

2. **`apps/web/src/pages/Register.tsx`**
   - Ao registrar usuário, incluir `tenant_id` em `user_metadata`:
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     email,
     password,
     options: {
       data: {
         tenant_id: 'UUID_DO_TENANT',
         nome_completo: nomeCompleto
       }
     }
   });
   ```

3. **`apps/web/src/pages/Login.tsx`**
   - Não precisa alterar (RLS já funciona automaticamente)

4. **Componentes que fazem INSERT/UPDATE**
   - `apps/web/src/components/checklist/ChecklistWizard.tsx`
   - `apps/web/src/pages/Historico.tsx`
   - Já devem estar passando `tenant_id` extraído de `user?.user_metadata?.tenant_id`

## 🎯 Como Funciona o Multi-tenant

### Fluxo de Autenticação:
1. Usuário faz login → Supabase Auth retorna JWT
2. JWT contém `user_metadata.tenant_id`
3. RLS usa `auth.jwt() -> 'user_metadata' ->> 'tenant_id'` para filtrar dados
4. Usuário só vê/edita dados do seu tenant

### Fluxo de Registro:
1. Admin cria tenant em `tenants` (via SQL ou interface admin)
2. Usuário se registra com `tenant_id` em `user_metadata`
3. Trigger cria automaticamente registro em `profiles`
4. Usuário já está vinculado ao tenant

## 🔐 Segurança

- ✅ RLS garante isolamento total entre tenants
- ✅ Usuário não consegue acessar dados de outro tenant mesmo manipulando requests
- ✅ Foreign Keys garantem integridade referencial
- ✅ Cascade delete: Se tenant for deletado, todos os dados relacionados são removidos

## 📊 Estrutura Final

```
tenants (organizações)
  ├── profiles (usuários)
  ├── clients (clientes)
  └── projects (projetos)
        └── checklists (vistorias)
```

## 🚀 Próximos Passos

1. Execute `supabase-migration-profiles.sql` no Supabase
2. Regenere os tipos TypeScript
3. Ajuste o fluxo de registro para incluir `tenant_id`
4. (Opcional) Crie interface admin para gerenciar tenants
5. (Opcional) Implemente convite de usuários para tenants existentes
