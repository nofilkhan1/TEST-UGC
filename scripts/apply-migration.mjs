// Applies a SQL migration to a Supabase project using the service-role key.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/apply-migration.mjs supabase/migrations/0001_init.sql
// The service-role key bypasses RLS — never commit it.

import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv[2];

if (!url || !key || !file) {
  console.error("Missing args. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and pass the SQL file path.");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");

const res = await fetch(`${url}/sql`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Prefer": "params=single-object",
  },
  body: JSON.stringify({ query: sql }),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`FAILED (${res.status}):`, text);
  process.exit(1);
}

console.log("Migration applied:", file);
