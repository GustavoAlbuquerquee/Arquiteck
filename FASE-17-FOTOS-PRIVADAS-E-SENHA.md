# Fase 17 - Fotos privadas e troca de senha

## Problemas corrigidos

| Problema | Antes | Depois |
|---|---|---|
| Fotos e assinaturas de clientes | Bucket `vistorias` público: qualquer pessoa com o link abria a imagem | Bucket privado; o app exibe as imagens por URLs assinadas (válidas por 1 hora), que só usuários do mesmo tenant conseguem gerar |
| Troca de senha | Não existia; senha esquecida só se resolvia pelo SQL | Seção "Alterar Senha" em Configurações (todos os usuários) |
| Senha esquecida | Sem recuperação | "Esqueci minha senha" no login envia um link por e-mail para `/redefinir-senha` |

Os briefings antigos guardam a URL pública da imagem no payload; os novos guardam só o caminho no
bucket. O app aceita os dois formatos (`caminhoNoBucket` em `lib/supabase/storage.ts`).

## Deploy (nesta ordem)

1. **Frontend**: merge na `main`. A versão nova funciona com o bucket público ou privado.
2. **Banco**: no Supabase Dashboard > SQL Editor, execute o arquivo inteiro
   `supabase/migrations/20261015120000_vistorias_privado.sql`.
   Deve retornar 4 linhas (`vistorias_delete/insert/select/update`) com `bucket_publico = false`.
   **Não rode antes do passo 1**: o app antigo exibe as imagens pela URL pública, que deixa de funcionar.
3. **Auth**: em Authentication > URL Configuration:
   - *Site URL*: `https://arquiteck.vercel.app`
   - *Redirect URLs*: adicionar `https://arquiteck.vercel.app/**` (e, para testar nas previews,
     `https://*-gustavoalbuquerquees-projects.vercel.app/**`)

   Sem isso, o link do e-mail de recuperação manda para o endereço errado.

## Observações

- O e-mail de recuperação usa o servidor de e-mail padrão do Supabase, que tem limite baixo de
  envios por hora. Para uso maior, configure um SMTP próprio em Authentication > Emails.
- Imagens já guardadas no cache do service worker (versões antigas, que usavam URL pública)
  continuam no aparelho até expirarem (30 dias); as novas URLs assinadas não são cacheadas.
