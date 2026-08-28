import { createClient } from "@supabase/supabase-js";

// Service-role client — SERVER ONLY. Never import this into client code and
// never expose SUPABASE_SERVICE_ROLE_KEY to the browser. Used for admin tasks
// like auto-confirming emails so demos don't require an email round-trip.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
