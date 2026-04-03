# Arquiteck - Sistema de Gestão de Vistorias

PWA para gestão de vistorias, checklists e entrega de obras de marcenaria.

## Stack

- **Monorepo:** Turborepo
- **Frontend:** React + TypeScript + Vite
- **Estilização:** Tailwind CSS
- **Backend:** Supabase
- **PWA:** vite-plugin-pwa

## Estrutura

```
/apps/web          - Aplicação principal (PWA)
/packages/ui       - Componentes reutilizáveis
/packages/config   - Configurações compartilhadas
```

## Setup

1. Instalar dependências:
```bash
pnpm install
```

2. Configurar Supabase:
```bash
# a) Execute o script SQL no Supabase Dashboard
# Vá em SQL Editor e execute o conteúdo de supabase-schema.sql

# b) Gere os tipos TypeScript
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > apps/web/src/lib/supabase/types.ts
```

3. Configurar variáveis de ambiente:
```bash
cd apps/web
cp .env.example .env
# Editar .env com suas credenciais do Supabase
```

4. Rodar em desenvolvimento:
```bash
pnpm dev
```

A aplicação estará disponível em `http://localhost:3000`

## Documentação Adicional

- [SUPABASE.md](./SUPABASE.md) - Guia completo de configuração do banco de dados

## Arquitetura Multitenant

Todas as entidades do banco de dados devem incluir `tenant_id` para suportar múltiplas empresas.
