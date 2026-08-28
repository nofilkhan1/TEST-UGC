-- ============================================================================
-- Seed: admin user
-- Admin has NO self-signup. Create the auth user manually in the Supabase
-- dashboard (or via `supabase auth admin create-user`), then run this with the
-- resulting auth.uid().
-- ============================================================================

-- 1) Create the admin auth user (Supabase dashboard / CLI), then:
-- 2) Replace <ADMIN_AUTH_UID> below with that user's id and run:

-- insert into public.profiles (id, role, full_name)
-- values ('<ADMIN_AUTH_UID>', 'admin', 'SideShift Admin')
-- on conflict (id) do nothing;
