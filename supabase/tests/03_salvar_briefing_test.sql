-- Testes da função salvar_briefing (Nova Visita). Cada bloco imprime o resultado esperado antes.
\set ON_ERROR_STOP 0
\set AMEM '{"sub":"a0000000-0000-0000-0000-00000000000b"}'
\set CLI '{"nome":"Cliente Novo","telefone":"(31) 99999-0000","endereco":"Rua 1"}'
\set PRJ '{"titulo_ambiente":"Cozinha Nova","data_prevista_instalacao":"2026-10-13"}'
\set PAY '{"moveis":[{"nome":"Armário"}]}'

\echo '>> B1 membro@a cria briefing -> esperado: 1 cliente, 1 projeto (orcamento, 2026-10-13) e 1 checklist pre_producao, todos no tenant A'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
SELECT public.salvar_briefing(NULL, :'CLI', :'PRJ', :'PAY') AS novo_id \gset
SELECT c.nome, c.tenant_id = 'aaaaaaaa-0000-0000-0000-000000000000' AS tenant_a,
       p.status, p.data_prevista_instalacao, k.tipo_etapa, k.payload->'moveis'->0->>'nome' AS movel
  FROM projects p JOIN clients c ON c.id = p.client_id JOIN checklists k ON k.project_id = p.id
 WHERE p.id = :'novo_id';
ROLLBACK;

\echo '>> B2 falha no checklist (payload nulo), fora de transação explícita -> esperado: ERRO e 0 clientes "Atomico" gravados'
SET role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', false) \gset x
SELECT public.salvar_briefing(NULL, '{"nome":"Atomico"}', :'PRJ', NULL);
SELECT count(*) AS clientes_atomico FROM clients WHERE nome = 'Atomico';
RESET role; SELECT set_config('request.jwt.claims', '', false) \gset x

\echo '>> B3 membro@a edita projeto da Empresa B -> esperado: ERRO (não encontrado)'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
SELECT public.salvar_briefing('d0000000-0000-0000-0000-00000000000b', :'CLI', :'PRJ', :'PAY'); ROLLBACK;

\echo '>> B4 membro@a edita Cozinha A (sem checklist) duas vezes -> esperado: 1 checklist pre_producao, com o payload da 2a edição, e cliente renomeado'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
SELECT public.salvar_briefing('d0000000-0000-0000-0000-00000000000a', :'CLI', :'PRJ', '{"versao":1}') \gset x
SELECT public.salvar_briefing('d0000000-0000-0000-0000-00000000000a', :'CLI', :'PRJ', '{"versao":2}') \gset x
SELECT count(*) AS checklists, max(payload->>'versao') AS versao
  FROM checklists WHERE project_id = 'd0000000-0000-0000-0000-00000000000a' AND tipo_etapa = 'pre_producao';
SELECT nome FROM clients WHERE id = 'c0000000-0000-0000-0000-00000000000a';
ROLLBACK;

\echo '>> B5 anon chama a função -> esperado: ERRO (permissão negada)'
BEGIN; SET LOCAL role anon;
SELECT public.salvar_briefing(NULL, :'CLI', :'PRJ', :'PAY'); ROLLBACK;
