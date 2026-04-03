# Supabase - Configuração e Comandos

## 1. Executar o Script SQL no Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**
5. Cole todo o conteúdo do arquivo `supabase-schema.sql`
6. Clique em **Run** (ou pressione Ctrl+Enter)

## 2. Gerar Tipos TypeScript Automaticamente

### Opção A: Usando npx (sem instalar globalmente)

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > apps/web/src/lib/supabase/types.ts
```

### Opção B: Instalando a CLI globalmente

```bash
# Instalar Supabase CLI
npm install -g supabase

# Gerar tipos
supabase gen types typescript --project-id YOUR_PROJECT_ID > apps/web/src/lib/supabase/types.ts
```

### Como encontrar seu PROJECT_ID:

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** → **General**
4. Copie o **Reference ID** (é o seu PROJECT_ID)

**Exemplo:**
```bash
npx supabase gen types typescript --project-id abcdefghijklmnop > apps/web/src/lib/supabase/types.ts
```

## 3. Estrutura de Autenticação Multitenant

Quando criar um usuário no Supabase, você DEVE adicionar o `tenant_id` nos metadados:

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'usuario@exemplo.com',
  password: 'senha123',
  options: {
    data: {
      tenant_id: '00000000-0000-0000-0000-000000000001' // UUID do tenant
    }
  }
});
```

## 4. Testando o RLS

Após criar um usuário com `tenant_id` nos metadados, todas as queries automáticas respeitarão o RLS:

```typescript
// Isso só retornará clientes do tenant do usuário logado
const { data: clients } = await supabase
  .from('clients')
  .select('*');
```

## 5. Estrutura do Payload JSONB (Checklists)

O campo `payload` na tabela `checklists` pode armazenar:

```json
{
  "items": [
    {
      "label": "Item verificado",
      "checked": true
    }
  ],
  "croqui_url": "https://storage.supabase.co/...",
  "assinatura_url": "https://storage.supabase.co/...",
  "observacoes": "Texto livre",
  "fotos": [
    "https://storage.supabase.co/foto1.jpg",
    "https://storage.supabase.co/foto2.jpg"
  ]
}
```

## 6. Comandos Úteis

```bash
# Verificar versão da CLI
supabase --version

# Login na CLI (se necessário)
supabase login

# Listar projetos
supabase projects list

# Gerar tipos (comando completo)
supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > apps/web/src/lib/supabase/types.ts
```
