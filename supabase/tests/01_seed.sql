-- Dados de teste: Empresa A (admin, membro, usuário legado sem perfil) e Empresa B.
DELETE FROM tenants;  -- remove o exemplo do schema
INSERT INTO tenants (id, nome_fantasia, cnpj) VALUES
 ('aaaaaaaa-0000-0000-0000-000000000000','Empresa A','11'),
 ('bbbbbbbb-0000-0000-0000-000000000000','Empresa B','22');
-- trigger antigo cria perfis (primeiro de cada tenant vira admin)
INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
 ('a0000000-0000-0000-0000-00000000000a','admin@a','{"tenant_id":"aaaaaaaa-0000-0000-0000-000000000000"}'),
 ('a0000000-0000-0000-0000-00000000000b','membro@a','{"tenant_id":"aaaaaaaa-0000-0000-0000-000000000000"}'),
 ('b0000000-0000-0000-0000-00000000000a','admin@b','{"tenant_id":"bbbbbbbb-0000-0000-0000-000000000000"}');
-- usuário legado sem perfil (período em que o trigger foi removido)
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
 ('a0000000-0000-0000-0000-00000000000c','legado@a','{"tenant_id":"aaaaaaaa-0000-0000-0000-000000000000","nome_completo":"Legado"}');
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
INSERT INTO clients (id,tenant_id,nome) VALUES
 ('c0000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000000','Cliente de A'),
 ('c0000000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000000','Cliente de B');
INSERT INTO projects (id,tenant_id,client_id,titulo_ambiente) VALUES
 ('d0000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000000','c0000000-0000-0000-0000-00000000000a','Cozinha A'),
 ('d0000000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000000','c0000000-0000-0000-0000-00000000000b','Cozinha B');
