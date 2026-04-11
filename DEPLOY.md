# Deploy do Arquiteck na Vercel

## Pré-requisitos

1. Conta na Vercel (https://vercel.com)
2. Projeto configurado no Supabase
3. Ícones PWA criados (192x192 e 512x512)

## Passos para Deploy

### 1. Preparar Ícones PWA

Crie dois ícones na pasta `apps/web/public/`:
- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)

Você pode usar ferramentas como:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

### 2. Configurar Variáveis de Ambiente na Vercel

No dashboard da Vercel, adicione as seguintes variáveis:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### 3. Deploy via CLI

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Fazer login
vercel login

# Deploy
vercel --prod
```

### 4. Deploy via GitHub (Recomendado)

1. Faça push do código para o GitHub
2. Conecte o repositório na Vercel
3. Configure as variáveis de ambiente
4. A Vercel fará deploy automático a cada push

## Configurações Importantes

### Build Settings na Vercel

- **Framework Preset**: Vite
- **Build Command**: `pnpm build`
- **Output Directory**: `apps/web/dist`
- **Install Command**: `pnpm install`

### Configuração do Monorepo

Se estiver usando Turborepo, adicione `vercel.json` na raiz:

```json
{
  "buildCommand": "cd apps/web && pnpm build",
  "outputDirectory": "apps/web/dist",
  "installCommand": "pnpm install"
}
```

## Testar PWA Localmente

```bash
# Build de produção
pnpm build

# Preview
pnpm preview
```

Acesse `http://localhost:4173` e teste:
1. Instalação do PWA
2. Funcionamento offline
3. Service Worker

## Verificar PWA

Após o deploy, use o Lighthouse do Chrome DevTools:
1. Abra o site em produção
2. F12 → Lighthouse
3. Selecione "Progressive Web App"
4. Clique em "Generate report"

## Troubleshooting

### PWA não aparece para instalação
- Verifique se está usando HTTPS (Vercel fornece automaticamente)
- Confirme que os ícones estão no caminho correto
- Verifique o manifest no DevTools (Application → Manifest)

### Service Worker não registra
- Limpe o cache do navegador
- Verifique o console para erros
- Confirme que `registerSW` está sendo chamado no main.tsx

### Imagens não carregam offline
- Verifique a configuração do Workbox no vite.config.ts
- Confirme que as URLs do Supabase Storage estão no runtimeCaching

## Suporte a Dispositivos

O PWA funciona em:
- ✅ Android (Chrome, Edge, Samsung Internet)
- ✅ iOS 16.4+ (Safari)
- ✅ Desktop (Chrome, Edge)
- ⚠️ iOS < 16.4 (limitações do Safari)

## Recursos Adicionais

- [Vite PWA Docs](https://vite-pwa-org.netlify.app/)
- [Vercel Docs](https://vercel.com/docs)
- [PWA Checklist](https://web.dev/pwa-checklist/)
