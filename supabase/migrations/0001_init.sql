-- ============================================================================
-- SideShift — initial schema + RLS
-- Target: Supabase (Postgres + Auth + RLS)
-- NOTE: This migration is NOT auto-run. It is reviewed by a human before
--       being applied via the Supabase SQL editor or `supabase db push`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums are expressed as TEXT + CHECK constraints (Supabase/Postgres friendly,
-- no native enum churn on rename).
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- profiles  (1:1 with auth.users; role chosen at signup, immutable after)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('brand', 'creator', 'admin')),
  full_name   text not null,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- creator_profiles  (1:1 with profiles) — the "common application"
-- ----------------------------------------------------------------------------
create table if not exists public.creator_profiles (
  profile_id        uuid primary key references public.profiles (id) on delete cascade,
  gender            text,
  age               integer check (age is null or age between 13 and 120),
  portfolio_url     text,
  bio               text,
  instagram_handle  text,
  tiktok_handle     text
);

-- ----------------------------------------------------------------------------
-- brand_profiles  (1:1 with profiles)
-- ----------------------------------------------------------------------------
create table if not exists public.brand_profiles (
  profile_id   uuid primary key references public.profiles (id) on delete cascade,
  company_name text,
  website      text
);

-- ----------------------------------------------------------------------------
-- campaigns
-- ----------------------------------------------------------------------------
create table if not exists public.campaigns (
  id                  uuid primary key default gen_random_uuid(),
  brand_id            uuid not null references public.profiles (id) on delete cascade,
  platform            text not null check (platform in ('instagram', 'tiktok')),
  title               text not null,
  description         text not null,
  num_posts_required  integer not null default 1 check (num_posts_required > 0),
  start_date          date,
  end_date            date,
  status              text not null default 'draft' check (status in ('draft', 'live', 'closed')),
  created_at          timestamptz not null default now()
);

create index if not exists campaigns_brand_id_idx on public.campaigns (brand_id);
create index if not exists campaigns_status_idx on public.campaigns (status);

-- ----------------------------------------------------------------------------
-- applications  (unique: one per creator per campaign)
-- ----------------------------------------------------------------------------
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns (id) on delete cascade,
  creator_id      uuid not null references public.profiles (id) on delete cascade,
  price_per_post  numeric(10, 2) check (price_per_post is null or price_per_post >= 0),
  pitch           text,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at      timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

create index if not exists applications_campaign_id_idx on public.applications (campaign_id);
create index if not exists applications_creator_id_idx on public.applications (creator_id);

-- ----------------------------------------------------------------------------
-- notifications  (system-generated via triggers; never client-inserted)
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  type                   text not null check (type in ('application_received', 'application_approved', 'application_rejected')),
  message                text not null,
  related_application_id uuid references public.applications (id) on delete cascade,
  is_read                boolean not null default false,
  created_at             timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);

-- ============================================================================
-- Helper: current user's role (SECURITY DEFINER so RLS policies can read it
-- without recursive RLS on profiles).
-- ============================================================================
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles          enable row level security;
alter table public.creator_profiles  enable row level security;
alter table public.brand_profiles    enable row level security;
alter table public.campaigns         enable row level security;
alter table public.applications      enable row level security;
alter table public.notifications     enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update
  to authenticated
  with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- creator_profiles
-- ----------------------------------------------------------------------------
drop policy if exists creator_profiles_select_authenticated on public.creator_profiles;
create policy creator_profiles_select_authenticated
  on public.creator_profiles for select
  to authenticated
  using (true);

drop policy if exists creator_profiles_insert_self on public.creator_profiles;
create policy creator_profiles_insert_self
  on public.creator_profiles for insert
  to authenticated
  with check (profile_id = auth.uid() and public.current_role() = 'creator');

drop policy if exists creator_profiles_update_self on public.creator_profiles;
create policy creator_profiles_update_self
  on public.creator_profiles for update
  to authenticated
  with check (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- brand_profiles
-- ----------------------------------------------------------------------------
drop policy if exists brand_profiles_select_authenticated on public.brand_profiles;
create policy brand_profiles_select_authenticated
  on public.brand_profiles for select
  to authenticated
  using (true);

drop policy if exists brand_profiles_insert_self on public.brand_profiles;
create policy brand_profiles_insert_self
  on public.brand_profiles for insert
  to authenticated
  with check (profile_id = auth.uid() and public.current_role() = 'brand');

drop policy if exists brand_profiles_update_self on public.brand_profiles;
create policy brand_profiles_update_self
  on public.brand_profiles for update
  to authenticated
  with check (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- campaigns
--   - any authenticated user can view (app filters `status='live'` for creators)
--   - brands have full CRUD on their own campaigns
-- ----------------------------------------------------------------------------
drop policy if exists campaigns_select_authenticated on public.campaigns;
create policy campaigns_select_authenticated
  on public.campaigns for select
  to authenticated
  using (true);

drop policy if exists campaigns_insert_brand on public.campaigns;
create policy campaigns_insert_brand
  on public.campaigns for insert
  to authenticated
  with check (brand_id = auth.uid() and public.current_role() = 'brand');

drop policy if exists campaigns_update_brand on public.campaigns;
create policy campaigns_update_brand
  on public.campaigns for update
  to authenticated
  with check (brand_id = auth.uid());

drop policy if exists campaigns_delete_brand on public.campaigns;
create policy campaigns_delete_brand
  on public.campaigns for delete
  to authenticated
  using (brand_id = auth.uid());

-- ----------------------------------------------------------------------------
-- applications
--   - creator: full CRUD on their own applications
--   - brand:   read + status-change on applications for their own campaigns
-- ----------------------------------------------------------------------------
drop policy if exists applications_select_own_or_brand on public.applications;
create policy applications_select_own_or_brand
  on public.applications for select
  to authenticated
  using (
    creator_id = auth.uid()
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.brand_id = auth.uid()
    )
  );

drop policy if exists applications_insert_creator on public.applications;
create policy applications_insert_creator
  on public.applications for insert
  to authenticated
  with check (creator_id = auth.uid() and public.current_role() = 'creator');

-- creator edits own application (pitch / price); cannot change status
drop policy if exists applications_update_creator on public.applications;
create policy applications_update_creator
  on public.applications for update
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid() and status = 'pending');

-- brand changes status on applications for their own campaigns
drop policy if exists applications_update_brand_status on public.applications;
create policy applications_update_brand_status
  on public.applications for update
  to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.brand_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.brand_id = auth.uid()
    )
  );

drop policy if exists applications_delete_creator on public.applications;
create policy applications_delete_creator
  on public.applications for delete
  to authenticated
  using (creator_id = auth.uid());

-- ----------------------------------------------------------------------------
-- notifications  (system-written via triggers; client only reads + marks read)
-- ----------------------------------------------------------------------------
drop policy if exists notifications_select_self on public.notifications;
create policy notifications_select_self
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- Triggers: automated notifications (the "screening"/notify loop)
-- ============================================================================
create or replace function public.notify_on_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_brand uuid;
  v_creator_name text;
begin
  select brand_id into v_brand from public.campaigns where id = new.campaign_id;
  select full_name into v_creator_name from public.profiles where id = new.creator_id;

  if TG_OP = 'INSERT' then
    insert into public.notifications (user_id, type, message, related_application_id)
    values (v_brand, 'application_received',
            coalesce(v_creator_name, 'A creator') || ' applied to your campaign.', new.id);
  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'approved' then
      insert into public.notifications (user_id, type, message, related_application_id)
      values (new.creator_id, 'application_approved',
              'Your application was approved!', new.id);
    elsif new.status = 'rejected' then
      insert into public.notifications (user_id, type, message, related_application_id)
      values (new.creator_id, 'application_rejected',
              'Your application was not approved this time.', new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_application on public.applications;
create trigger trg_notify_on_application
  after insert or update on public.applications
  for each row execute function public.notify_on_application();
