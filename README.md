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

2. Configurar variáveis de ambiente:
```bash
cd apps/web
cp .env.example .env
# Editar .env com suas credenciais do Supabase
```

3. Rodar em desenvolvimento:
```bash
pnpm dev
```

A aplicação estará disponível em `http://localhost:3000`

## Arquitetura Multitenant

Todas as entidades do banco de dados devem incluir `tenant_id` para suportar múltiplas empresas.
