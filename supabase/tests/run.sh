#!/usr/bin/env bash
# Roda os testes de RLS num Postgres local descartável (NÃO use o banco de produção).
# Uso: PGURL=postgres://postgres@localhost:5432/postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${PGURL:?defina PGURL apontando para um Postgres local de teste}"
DB=arquiteck_rls_test
psql "$PGURL" -q -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
T="${PGURL%/*}/$DB"
run() { psql "$T" -q -v ON_ERROR_STOP=1 -f "$1" 2>&1 | grep -v NOTICE || true; }
run supabase/tests/00_stub_supabase.sql
# Estado legado (como estava em produção) + migração nova
for f in supabase-schema.sql supabase-migration-profiles.sql supabase-migration-roles.sql \
         fase-12-white-label.sql fase-14-delete-auth-cascade.sql; do run "$f"; done
run supabase/tests/01_seed.sql
for f in supabase/migrations/*.sql; do run "$f"; done
for f in supabase/tests/0[2-9]_*test.sql; do psql "$T" -f "$f"; done
