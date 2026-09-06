#!/usr/bin/env bash
set -Eeuo pipefail
cd /home/levy/market013.app
DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' .env.test | head -n 1 | tr -d '\r')"
export PAGER=cat
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrations/0004_admin_audit_logs.sql
psql "$DATABASE_URL" -A -t -c "select to_regclass('admin_audit_logs');"
