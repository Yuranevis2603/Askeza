-- Journal: free-form thoughts, usually written after the last task of the day.
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  body text not null check (length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);
create index journal_entries_user_created on public.journal_entries (user_id, created_at desc);

alter table public.journal_entries enable row level security;
create policy "own rows" on public.journal_entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
