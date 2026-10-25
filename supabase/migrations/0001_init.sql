-- Askeza: initial schema. Every table is private to its owner via RLS.

create table public.players (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text,
  time_zone text not null default 'Europe/Kyiv',
  daily_goal int not null default 250 check (daily_goal between 50 and 1000),
  level int not null default 1 check (level between 1 and 10),
  max_level int not null default 1 check (max_level between 1 and 10),
  comeback boolean not null default false,
  level_changed_on date not null default current_date,
  last_event text check (last_event in ('up', 'down', 'restored')),
  created_on date not null default current_date
);

-- XP ledger. (source, ref) makes every award idempotent and reversible.
create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  amount int not null,
  source text not null check (source in ('task', 'habit', 'focus', 'mission', 'impression', 'comeback')),
  ref text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source, ref)
);
create index xp_events_user_day on public.xp_events (user_id, day);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  time text,
  title text not null check (length(title) between 1 and 200),
  area text not null check (area in ('focus', 'instagram', 'project', 'body')),
  xp int not null default 10 check (xp between 0 and 100),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index tasks_user_day on public.tasks (user_id, day);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  key text,
  name text not null check (length(name) between 1 and 80),
  sort int not null default 0,
  archived boolean not null default false
);

create table public.habit_logs (
  habit_id uuid not null references public.habits on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  primary key (habit_id, day)
);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  minutes int not null check (minutes between 1 and 180),
  area text not null default 'project' check (area in ('focus', 'instagram', 'project', 'body')),
  created_at timestamptz not null default now()
);

-- Daily numbers the user enters: reels_minutes, followers, reels_published.
create table public.metrics (
  user_id uuid not null references auth.users on delete cascade,
  key text not null check (key in ('reels_minutes', 'followers', 'reels_published')),
  day date not null,
  value numeric not null check (value >= 0),
  primary key (user_id, key, day)
);

create table public.mission_progress (
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  progress int not null default 0 check (progress >= 0),
  completed_on date,
  primary key (user_id, key)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('development', 'impression')),
  area text check (area in ('instagram', 'project', 'body')),
  title text not null check (length(title) between 1 and 200),
  note text,
  status text check (status in ('idea', 'planned', 'prep', 'done')),
  current_value numeric,
  target_value numeric,
  unit text,
  unlock_level int,
  next_action text,
  next_action_xp int,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.goal_steps (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  done boolean not null default false,
  unlock_level int,
  due text,
  sort int not null default 0
);

do $$
declare t text;
begin
  foreach t in array array['players', 'xp_events', 'tasks', 'habits', 'habit_logs', 'focus_sessions', 'metrics', 'mission_progress', 'goals', 'goal_steps']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Starter data for a new account: player row, habits, the three 2027 goals and a few impressions.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare g uuid;
begin
  insert into public.players (user_id, display_name) values (new.id, split_part(new.email, '@', 1));

  insert into public.habits (user_id, key, name, sort) values
    (new.id, 'breathing', 'Дихання 3 хв', 0),
    (new.id, null, 'Сон до 23:30', 1),
    (new.id, null, 'Читання 20 хв', 2),
    (new.id, null, 'Вода 2 л', 3),
    (new.id, null, '10 000 кроків', 4);

  insert into public.goals (user_id, kind, area, title, current_value, target_value, unit, unlock_level, next_action, next_action_xp, sort)
    values (new.id, 'development', 'instagram', 'Вирости до 10 000 підписників', 0, 10000, 'підписників', 6, 'Оформити bio і аватар профілю', 30, 0)
    returning id into g;
  insert into public.goal_steps (goal_id, user_id, title, unlock_level, due, sort) values
    (g, new.id, 'Оформити профіль: аватар, bio, хайлайти', 6, null, 0),
    (g, new.id, 'Перші 10 Reels', 7, null, 1),
    (g, new.id, 'Пости 3 рази на тиждень', 8, null, 2),
    (g, new.id, '5 000 підписників', null, 'серпень', 3),
    (g, new.id, '10 000 підписників', null, 'грудень', 4);

  insert into public.goals (user_id, kind, area, title, current_value, target_value, unit, unlock_level, next_action, next_action_xp, sort)
    values (new.id, 'development', 'project', 'Запустити власний проєкт', 0, 100, '%', 5, 'Записати ідею і 5 питань для інтерв’ю', 20, 1)
    returning id into g;
  insert into public.goal_steps (goal_id, user_id, title, unlock_level, due, sort) values
    (g, new.id, 'Ідея та 10 інтерв’ю', null, null, 0),
    (g, new.id, 'Клікабельний прототип', null, null, 1),
    (g, new.id, 'Лендінг і список очікування', null, 'березень', 2),
    (g, new.id, 'Бета для 20 людей', 9, null, 3),
    (g, new.id, 'Публічний запуск', null, 'вересень', 4);

  insert into public.goals (user_id, kind, area, title, current_value, target_value, unit, unlock_level, next_action, next_action_xp, sort)
    values (new.id, 'development', 'body', 'Побудувати спортивне тіло', 0, 100, '%', 4, 'Перше тренування «Все тіло · А»', 50, 2)
    returning id into g;
  insert into public.goal_steps (goal_id, user_id, title, unlock_level, due, sort) values
    (g, new.id, '2 тренування на тиждень, 4 тижні', null, null, 0),
    (g, new.id, 'Мінус 2 кг', null, null, 1),
    (g, new.id, 'Спліт «Верх/Низ» 3 рази на тиждень', 8, null, 2),
    (g, new.id, 'Жим 80 кг · 12 підтягувань', null, 'червень', 3),
    (g, new.id, 'Цільова вага і 12% жиру', null, 'грудень', 4);

  insert into public.goals (user_id, kind, title, note, status, sort) values
    (new.id, 'impression', 'Піти в гори', 'Карпати, Говерла', 'idea', 0),
    (new.id, 'impression', 'Покататися на сноуборді', 'Буковель', 'idea', 1),
    (new.id, 'impression', 'Стрибнути з парашутом', 'Тандем-стрибок', 'idea', 2);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sum of the caller's XP. Runs with the caller's rights, so RLS still applies.
create function public.xp_total() returns int
language sql stable security invoker set search_path = '' as $$
  select coalesce(sum(amount), 0)::int from public.xp_events where user_id = (select auth.uid());
$$;

-- The trigger function must never be callable over the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
