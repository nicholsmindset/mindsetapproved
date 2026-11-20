#!/usr/bin/env bash
# Applies supabase/migrations + seed.sql to a throwaway local Postgres (with Supabase stubs) and runs
# supabase/tests/rls-checks.sql. Needs Postgres 15+ binaries with pg_trgm and unaccent.
#   PG_BIN=/usr/lib/postgresql/16/bin scripts/check-sql.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || echo /usr/lib/postgresql/16/bin/pg_ctl)")}"
WORK="$(mktemp -d)"
PORT="${PGPORT_CHECK:-54329}"
RUN_AS=()
if [ "$(id -u)" = 0 ]; then
  chown -R postgres "$WORK"; RUN_AS=(runuser -u postgres --)
fi
cleanup() { "${RUN_AS[@]}" "$PG_BIN/pg_ctl" -D "$WORK/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
"${RUN_AS[@]}" "$PG_BIN/initdb" -D "$WORK/data" -A trust -U postgres >/dev/null
"${RUN_AS[@]}" "$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" start -w >/dev/null
PSQL=("${RUN_AS[@]}" "$PG_BIN/psql" -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f - < "$ROOT/supabase/tests/supabase-stubs.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "apply $(basename "$f")"; "${PSQL[@]}" -f - < "$f"; done
echo "apply seed.sql"; "${PSQL[@]}" -f - < "$ROOT/supabase/seed.sql"
"${PSQL[@]}" -At -c "select alias_norm from public.aliases order by 1" | LC_ALL=C sort > "$WORK/sql-keys.txt"
"${PSQL[@]}" -f - < "$ROOT/supabase/tests/rls-checks.sql"

# The SQL norm_key()/e_code() must agree with the engine's normKey()/eCode() for every seeded alias.
(cd "$ROOT" && npx tsx -e "
import { compileBundle, rowsFromSource } from './packages/rules-engine/src/index.ts';
import src from './data/starter-rules.json' with { type: 'json' };
const b = compileBundle(rowsFromSource(src));
console.log([...Object.keys(b.aliases), ...Object.keys(b.eNumbers)].join('\n'));
") | LC_ALL=C sort > "$WORK/ts-keys.txt"
if diff -u "$WORK/ts-keys.txt" "$WORK/sql-keys.txt"; then
  echo "SQL and engine normalisation agree on $(wc -l < "$WORK/ts-keys.txt") alias keys"
else
  echo "SQL and engine normalisation differ (see diff above)"; exit 1
fi
