# Fase 15 - Segurança: isolamento entre empresas e permissões no banco

## Problemas corrigidos

| Problema | Antes | Depois |
|---|---|---|
| Isolamento entre empresas | RLS usava `user_metadata.tenant_id`, que o próprio usuário edita com `supabase.auth.updateUser()`; bastava trocar o valor para ler/alterar dados de outra empresa | RLS usa `public.auth_tenant_id()`, que lê `profiles.tenant_id` |
| Membro virando admin | Policy de UPDATE em `profiles` permitia `update({ role: 'admin' })` no próprio perfil | Trigger `profiles_guard` bloqueia troca de `role` (só admin) e de `tenant_id` |
| Permissões só na tela | Qualquer membro podia excluir projetos e alterar dados da empresa pela API | Exclusões e edição da empresa exigem `role = 'admin'` no banco |
| Storage | Qualquer usuário logado podia sobrescrever a logo de outra empresa | Escrita presa à pasta `<tenant_id>/` (logos: só admin) |
| Cadastro de membros | `signUp` público com senha fixa `primor123`; perfil criado como admin se o trigger falhasse | Edge Function `create-member` (verifica que quem chama é admin) com senha inicial aleatória |
| Remover membro | Policy só deixava apagar o próprio perfil; a tela mostrava "removido" sem remover | Admin remove membros do seu tenant; a tela confere se algo foi removido |
| Cache do service worker | Guardava respostas da API (`/rest/v1`, `/auth/v1`) por URL; outro usuário no mesmo aparelho podia receber os dados | Só arquivos públicos do Storage são cacheados; cache antigo é apagado |
| Scripts SQL perigosos | `fix-tenants-rls.sql` desligava a RLS de `tenants`; `remove-trigger.sql` apagava o trigger de perfis | Removidos |

## Deploy (nesta ordem)

1. **Banco**: no Supabase Dashboard > SQL Editor, execute
   `supabase/migrations/20261013120000_seguranca_rls.sql`.
   - O script é idempotente e remove/recria todas as policies das tabelas do app.
   - A última consulta lista usuários sem perfil. Deve retornar **zero linhas**.
2. **Edge Functions** (Supabase CLI):
   ```bash
   supabase functions deploy register-user
   supabase functions deploy create-member
   supabase functions delete create-tenant   # se estiver publicada (não é mais usada)
   ```
3. **Auth**: em Authentication > Sign In / Providers, desative *Allow new users to sign up*.
   O cadastro de empresa e de membros usa a Admin API nas Edge Functions, então continua funcionando.
   (Mesmo com o signup aberto, um usuário criado por fora não ganha perfil nem acesso a dados.)
4. **Frontend**: publique a nova versão.
5. **Senhas antigas**: membros criados com a senha padrão `primor123` devem ter a senha trocada
   (Dashboard > Authentication > Users > *Send password recovery*, ou remover e recadastrar).

## Testes

`supabase/tests/` contém um stub mínimo do Supabase e 22 testes das policies (vazamento entre
empresas, escalada para admin, exclusões, storage, trigger de novos usuários). Rodam num Postgres
local descartável, aplicando os SQLs antigos + a migração nova:

```bash
PGURL=postgres://postgres@localhost:5432/postgres ./supabase/tests/run.sh
```

## Pendências conhecidas

- O bucket `vistorias` continua público: quem tiver a URL de uma foto/assinatura consegue abri-la.
  Torná-lo privado exige trocar `getPublicUrl` por URLs assinadas no app e no PDF.
- Não há tela para o usuário trocar a própria senha.
- `register-user` é pública e sem captcha/limite de tentativas.
