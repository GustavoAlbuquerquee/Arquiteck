-- Testes das policies. Cada bloco imprime o resultado esperado antes da execução.
\set ON_ERROR_STOP 0
\set AADM '{"sub":"a0000000-0000-0000-0000-00000000000a"}'
\set AMEM '{"sub":"a0000000-0000-0000-0000-00000000000b","user_metadata":{"tenant_id":"bbbbbbbb-0000-0000-0000-000000000000"}}'
\set ALEG '{"sub":"a0000000-0000-0000-0000-00000000000c"}'

\echo '>> T1 membro@a com metadata forjado (B) lê clientes -> esperado: só "Cliente de A"'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
SELECT nome FROM clients; ROLLBACK;

\echo '>> T2 membro@a tenta virar admin -> esperado: ERRO'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
UPDATE profiles SET role='admin' WHERE id='a0000000-0000-0000-0000-00000000000b'; ROLLBACK;

\echo '>> T3 membro@a tenta mudar o próprio tenant -> esperado: 0 linhas ou ERRO'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
UPDATE profiles SET tenant_id='bbbbbbbb-0000-0000-0000-000000000000' WHERE id='a0000000-0000-0000-0000-00000000000b'; ROLLBACK;

\echo '>> T4 membro@a edita o próprio cargo -> esperado: UPDATE 1'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
UPDATE profiles SET cargo='Montador' WHERE id='a0000000-0000-0000-0000-00000000000b'; ROLLBACK;

\echo '>> T5 membro@a exclui projeto -> esperado: DELETE 0'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
DELETE FROM projects WHERE id='d0000000-0000-0000-0000-00000000000a'; ROLLBACK;

\echo '>> T6 membro@a altera dados da empresa -> esperado: UPDATE 0'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
UPDATE tenants SET cnpj='999' WHERE id='aaaaaaaa-0000-0000-0000-000000000000'; ROLLBACK;

\echo '>> T7 membro@a cria cliente+projeto sem informar tenant_id (default) -> esperado: tenant A'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
WITH c AS (INSERT INTO clients (nome) VALUES ('Novo') RETURNING id, tenant_id)
SELECT tenant_id FROM c; ROLLBACK;

\echo '>> T8 membro@a insere cliente no tenant B -> esperado: ERRO (RLS)'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
INSERT INTO clients (tenant_id, nome) VALUES ('bbbbbbbb-0000-0000-0000-000000000000','Invasor'); ROLLBACK;

\echo '>> T9 membro@a lê perfis -> esperado: só os 3 da Empresa A'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
SELECT nome_completo, role FROM profiles ORDER BY 1; ROLLBACK;

\echo '>> T10 membro@a insere perfil admin -> esperado: ERRO (sem policy de INSERT)'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
INSERT INTO profiles (id, tenant_id, role) VALUES (gen_random_uuid(),'aaaaaaaa-0000-0000-0000-000000000000','admin'); ROLLBACK;

\echo '>> T11 admin@a exclui projeto, altera empresa e promove membro -> esperado: 1, 1, 1'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AADM', true) \gset x
DELETE FROM projects WHERE id='d0000000-0000-0000-0000-00000000000a';
UPDATE tenants SET telefone='123' WHERE id='aaaaaaaa-0000-0000-0000-000000000000';
UPDATE profiles SET role='admin', cargo='Gerente' WHERE id='a0000000-0000-0000-0000-00000000000b'; ROLLBACK;

\echo '>> T12 admin@a exclui projeto da Empresa B -> esperado: DELETE 0'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AADM', true) \gset x
DELETE FROM projects WHERE id='d0000000-0000-0000-0000-00000000000b'; ROLLBACK;

\echo '>> T13 admin@a remove membro@a (e o login via fase-14) -> esperado: DELETE 1 e usuário some de auth.users'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AADM', true) \gset x
DELETE FROM profiles WHERE id='a0000000-0000-0000-0000-00000000000b' RETURNING nome_completo;
RESET role; SELECT count(*) AS auth_users_restantes_de_membro FROM auth.users WHERE id='a0000000-0000-0000-0000-00000000000b'; ROLLBACK;

\echo '>> T14 admin@a remove a si mesmo / admin@b -> esperado: DELETE 0, DELETE 0'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AADM', true) \gset x
DELETE FROM profiles WHERE id='a0000000-0000-0000-0000-00000000000a';
DELETE FROM profiles WHERE id='b0000000-0000-0000-0000-00000000000a'; ROLLBACK;

\echo '>> T15 usuário legado (perfil criado pelo backfill) lê projetos -> esperado: Cozinha A'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'ALEG', true) \gset x
SELECT titulo_ambiente FROM projects; ROLLBACK;

\echo '>> T16 storage: membro@a envia foto na pasta A e na pasta B -> esperado: INSERT 1, depois ERRO'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
INSERT INTO storage.objects (bucket_id,name) VALUES ('vistorias','aaaaaaaa-0000-0000-0000-000000000000/fotos/f.jpg');
INSERT INTO storage.objects (bucket_id,name) VALUES ('vistorias','bbbbbbbb-0000-0000-0000-000000000000/fotos/f.jpg'); ROLLBACK;

\echo '>> T17 storage: membro@a troca logo (não admin) / admin@a troca logo da B -> esperado: ERRO, ERRO'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
INSERT INTO storage.objects (bucket_id,name) VALUES ('tenant_logos','aaaaaaaa-0000-0000-0000-000000000000/logo.png'); ROLLBACK;
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AADM', true) \gset x
INSERT INTO storage.objects (bucket_id,name) VALUES ('tenant_logos','bbbbbbbb-0000-0000-0000-000000000000/logo.png'); ROLLBACK;

\echo '>> T18 storage: admin@a troca a própria logo -> esperado: INSERT 1'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AADM', true) \gset x
INSERT INTO storage.objects (bucket_id,name) VALUES ('tenant_logos','aaaaaaaa-0000-0000-0000-000000000000/logo.png'); ROLLBACK;

\echo '>> T19 signUp público tentando entrar na Empresa A via user_metadata -> esperado: 0 perfis criados'
BEGIN; INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES ('e0000000-0000-0000-0000-000000000001','atacante@x','{"tenant_id":"aaaaaaaa-0000-0000-0000-000000000000"}');
SELECT count(*) AS perfis_do_atacante FROM profiles WHERE id='e0000000-0000-0000-0000-000000000001'; ROLLBACK;

\echo '>> T20 register-user antigo (user_metadata, empresa nova sem perfis) -> esperado: perfil admin'
BEGIN; INSERT INTO tenants (id,nome_fantasia,cnpj) VALUES ('cccccccc-0000-0000-0000-000000000000','Empresa C','33');
INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES ('c0000000-0000-0000-0000-0000000000aa','dono@c','{"tenant_id":"cccccccc-0000-0000-0000-000000000000","nome_completo":"Dono C"}');
SELECT nome_completo, role FROM profiles WHERE tenant_id='cccccccc-0000-0000-0000-000000000000'; ROLLBACK;

\echo '>> T21 Edge Function (app_metadata) cria membro na Empresa A -> esperado: perfil membro em A'
BEGIN; INSERT INTO auth.users (id,email,raw_user_meta_data,raw_app_meta_data) VALUES ('a0000000-0000-0000-0000-0000000000dd','novo@a','{"nome_completo":"Novo"}','{"tenant_id":"aaaaaaaa-0000-0000-0000-000000000000","role":"membro"}');
SELECT p.nome_completo, p.role, t.nome_fantasia FROM profiles p JOIN tenants t ON t.id=p.tenant_id WHERE p.id='a0000000-0000-0000-0000-0000000000dd'; ROLLBACK;

\echo '>> T22 anon lê clientes/tenants -> esperado: 0 linhas'
BEGIN; SET LOCAL role anon; SELECT count(*) AS clientes FROM clients; SELECT count(*) AS tenants FROM tenants; ROLLBACK;
