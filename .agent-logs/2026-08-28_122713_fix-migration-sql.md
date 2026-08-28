---
session_id: fix-migration-sql
timestamp: '2026-08-28T12:27:13'
mode: fix
---
[LOG_ENTRY type=PROMPT]
supabase/migrations/0001_init.sql gives errors when run in the Supabase SQL
editor. Review the SQL and fix it.
[/LOG_ENTRY]

[LOG_ENTRY type=RESPONSE]
Root cause: current_role is a reserved keyword in PostgreSQL (alias for
current_user) and cannot be used unquoted as a function name, so
create function public.current_role() threw a syntax error that aborted the
whole batch. Renamed the helper to public.user_role() (definition + 4 policy
references). Because the script ran as one transaction, the abort also meant the
notify trigger and admin policies were never created previously. After re-run
everything applies idempotently.
[/LOG_ENTRY]
