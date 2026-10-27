-- Abstinence trackers ("days without cigarettes") and their restart history.
create table public.trackers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 80),
  started_at timestamptz not null default now(),
  best_seconds bigint not null default 0 check (best_seconds >= 0),
  created_at timestamptz not null default now()
);

create table public.tracker_resets (
  id bigint generated always as identity primary key,
  tracker_id uuid not null references public.trackers on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  streak_seconds bigint not null check (streak_seconds >= 0),
  reset_at timestamptz not null default now()
);
create index tracker_resets_tracker on public.tracker_resets (tracker_id, reset_at desc);

alter table public.trackers enable row level security;
alter table public.tracker_resets enable row level security;
create policy "own rows" on public.trackers for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.tracker_resets for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
