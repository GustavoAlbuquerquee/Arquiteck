-- Testes da origem dos movimentos de etapa (mover_etapa / projects_registrar_etapa).
\set ON_ERROR_STOP 0
\set AMEM '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}'
\set SRV '{"role":"service_role"}'

\echo '>> M1 membro@a move pela tela (UPDATE comum) -> esperado: evento etapa, origem manual, criado_por = membro'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
UPDATE projects SET status = 'producao' WHERE id = 'd0000000-0000-0000-0000-00000000000a';
SELECT tipo, origem, criado_por FROM project_eventos
 WHERE project_id = 'd0000000-0000-0000-0000-00000000000a' ORDER BY created_at DESC LIMIT 1; ROLLBACK;

\echo '>> M2 membro@a tenta mover com origem ia -> esperado: ERRO (só o servidor)'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
SELECT public.mover_etapa('d0000000-0000-0000-0000-00000000000a', 'producao', 'ia', 'forjado'); ROLLBACK;

\echo '>> M3 servidor move com origem ia e motivo -> esperado: origem ia, criado_por nulo, mensagem = motivo'
BEGIN; SET LOCAL role service_role; SELECT set_config('request.jwt.claims', :'SRV', true) \gset x
SELECT public.mover_etapa('d0000000-0000-0000-0000-00000000000a', 'em_conversa', 'ia', 'cliente pediu orçamento') \gset x
SELECT origem, criado_por IS NULL AS sem_autor, mensagem FROM project_eventos
 WHERE project_id = 'd0000000-0000-0000-0000-00000000000a' ORDER BY created_at DESC LIMIT 1; ROLLBACK;

\echo '>> M4 membro@a move projeto da Empresa B -> esperado: ERRO (não encontrado)'
BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', :'AMEM', true) \gset x
SELECT public.mover_etapa('d0000000-0000-0000-0000-00000000000b', 'producao'); ROLLBACK;

\echo '>> M5 anon chama mover_etapa -> esperado: ERRO (permissão negada)'
BEGIN; SET LOCAL role anon;
SELECT public.mover_etapa('d0000000-0000-0000-0000-00000000000a', 'producao'); ROLLBACK;
