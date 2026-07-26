-- Trigger function for updated_at if not exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Categories table
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  color       text not null default '#3FA793',  -- hex color
  icon        text not null default 'ðŸ“',        -- emoji
  created_at  timestamptz not null default now(),
  unique(user_id, name)
);
alter table public.categories enable row level security;
create policy "Users manage own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tasks table  
create table if not exists public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  title               text not null,
  description         text,
  notes               text,
  status              text not null default 'todo' check (status in ('todo','in-progress','done','archived')),
  priority            text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  category_id         uuid references public.categories(id) on delete set null,
  tags                text[] not null default '{}',
  due_date            date,
  due_time            time,
  start_date          date,
  estimated_minutes   int,
  progress            int not null default 0 check (progress >= 0 and progress <= 100),
  color               text,
  is_favorite         boolean not null default false,
  is_pinned           boolean not null default false,
  is_recurring        boolean not null default false,
  recurrence_rule     text,  -- 'daily'|'weekly'|'monthly'|'yearly'|custom JSON
  parent_id           uuid references public.tasks(id) on delete cascade,  -- for subtasks
  sort_order          int not null default 0,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.tasks enable row level security;
create policy "Users manage own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_tasks_user_status on public.tasks(user_id, status);
create index if not exists idx_tasks_user_due on public.tasks(user_id, due_date);
create index if not exists idx_tasks_parent on public.tasks(parent_id);

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Notes table
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  title       text not null default 'Untitled',
  content     jsonb not null default '[]',  -- block editor content (array of blocks)
  tags        text[] not null default '{}',
  is_pinned   boolean not null default false,
  is_favorite boolean not null default false,
  color       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.notes enable row level security;
create policy "Users manage own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_notes_user on public.notes(user_id, updated_at desc);

DROP TRIGGER IF EXISTS set_notes_updated_at ON public.notes;
CREATE TRIGGER set_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
-- Teams (each owner has one team)
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid references auth.users not null,
  created_at  timestamptz not null default now()
);
alter table public.teams enable row level security;

-- Team members with roles
create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid references public.teams(id) on delete cascade not null,
  user_id     uuid references auth.users not null,
  role        text not null default 'member' check (role in ('owner','admin','member')),
  invited_by  uuid references auth.users,
  joined_at   timestamptz not null default now(),
  unique(team_id, user_id)
);
alter table public.team_members enable row level security;

-- Invites
create table if not exists public.team_invites (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid references public.teams(id) on delete cascade not null,
  email       text not null,
  role        text not null default 'member',
  token       text not null unique default encode(gen_random_bytes(24), 'base64'),
  invited_by  uuid references auth.users not null,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.team_invites enable row level security;

-- Update trailer_tasks to support team_id
alter table public.trailer_tasks add column if not exists team_id uuid references public.teams(id);
alter table public.trailer_tasks add column if not exists description text;
alter table public.trailer_tasks add column if not exists priority text default 'medium' check (priority in ('low','medium','high','urgent'));
alter table public.trailer_tasks add column if not exists due_date date;
alter table public.trailer_tasks add column if not exists labels text[] default '{}';
alter table public.trailer_tasks add column if not exists updated_at timestamptz default now();

-- RLS policies for teams
create policy "Team owners can manage team" on public.teams
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Team members can view team" on public.teams
  for select using (
    auth.uid() = owner_id or 
    exists(select 1 from public.team_members where team_id = teams.id and user_id = auth.uid())
  );

-- RLS policies for team_members
create policy "Team owners manage members" on public.team_members
  for all using (
    exists(select 1 from public.teams where id = team_members.team_id and owner_id = auth.uid())
  );

create policy "Users can view their team members" on public.team_members
  for select using (
    user_id = auth.uid() or 
    exists(select 1 from public.team_members tm where tm.team_id = team_members.team_id and tm.user_id = auth.uid())
  );

-- RLS policies for team_invites
create policy "Team owners manage invites" on public.team_invites
  for all using (
    exists(select 1 from public.teams where id = team_invites.team_id and owner_id = auth.uid())
  );

create policy "Invited users can view their invites" on public.team_invites
  for select using (
    email = (select email from auth.users where id = auth.uid())
  );
-- Custom habits (extends the 5 fixed habits)
create table if not exists public.custom_habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  icon        text not null default 'â­',
  color       text not null default '#3FA793',
  description text,
  goal_per_week int default 7,  -- how many times per week
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.custom_habits enable row level security;
create policy "Users manage own custom_habits" on public.custom_habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- XP and levels
create table if not exists public.user_xp (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null unique,
  total_xp    int not null default 0,
  level       int not null default 1,
  updated_at  timestamptz not null default now()
);
alter table public.user_xp enable row level security;
create policy "Users manage own xp" on public.user_xp
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Achievement definitions (seeded data - all users share these)
create table if not exists public.achievements (
  id          text primary key,  -- e.g., 'first_problem', 'streak_7'
  name        text not null,
  description text not null,
  icon        text not null,  -- emoji
  xp_reward   int not null default 50,
  category    text not null default 'general'  -- 'dsa'|'habits'|'tasks'|'general'
);

-- User unlocked achievements
create table if not exists public.user_achievements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  achievement_id  text references public.achievements(id) not null,
  unlocked_at     timestamptz not null default now(),
  unique(user_id, achievement_id)
);
alter table public.user_achievements enable row level security;
create policy "Users manage own achievements" on public.user_achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Focus sessions (Pomodoro)
create table if not exists public.focus_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  task_id       uuid references public.tasks(id) on delete set null,
  duration_min  int not null,  -- planned duration in minutes
  actual_min    int,           -- actual duration (null if abandoned)
  mode          text not null default '25/5',  -- '25/5'|'50/10'|'custom'
  completed     boolean not null default false,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz
);
alter table public.focus_sessions enable row level security;
create policy "Users manage own focus_sessions" on public.focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed achievements
insert into public.achievements (id, name, description, icon, xp_reward, category) values
  ('first_problem', 'First Blood', 'Log your first DSA problem', 'âš”ï¸', 25, 'dsa'),
  ('problems_10', 'Getting Started', 'Solve 10 DSA problems', 'ðŸŽ¯', 50, 'dsa'),
  ('problems_50', 'Half Century', 'Solve 50 DSA problems', 'ðŸ’¯', 150, 'dsa'),
  ('problems_100', 'Century', 'Solve 100 DSA problems', 'ðŸ†', 300, 'dsa'),
  ('problems_500', 'DSA Master', 'Solve 500 DSA problems', 'ðŸ‘‘', 1000, 'dsa'),
  ('streak_3', 'On a Roll', '3-day habit streak', 'ðŸ”¥', 30, 'habits'),
  ('streak_7', 'Week Warrior', '7-day habit streak', 'âš¡', 75, 'habits'),
  ('streak_30', 'Month Champion', '30-day habit streak', 'ðŸŒŸ', 250, 'habits'),
  ('streak_100', 'Centurion', '100-day habit streak', 'ðŸ’Ž', 750, 'habits'),
  ('first_task', 'Getting Things Done', 'Complete your first task', 'âœ…', 25, 'tasks'),
  ('tasks_10', 'Productive', 'Complete 10 tasks', 'ðŸ“‹', 50, 'tasks'),
  ('tasks_100', 'Task Master', 'Complete 100 tasks', 'ðŸŽ–ï¸', 200, 'tasks'),
  ('phase_1', 'Phase 1 Complete', 'Complete all Phase 1 checkpoints', 'ðŸ—ºï¸', 200, 'general'),
  ('focus_first', 'In The Zone', 'Complete your first focus session', 'ðŸŽ¯', 30, 'general'),
  ('focus_10h', 'Deep Work', 'Accumulate 10 hours of focus time', 'â°', 200, 'general'),
  ('all_habits_day', 'Perfect Day', 'Complete all habits in a single day', 'ðŸŒ…', 100, 'habits'),
  ('week_perfect', 'Perfect Week', 'Complete all habits for 7 consecutive days', 'ðŸ…', 300, 'habits')
on conflict (id) do nothing;
-- D:\Vany\yatra\supabase\migrations\005_dsa_enhanced.sql
alter table public.dsa_problems
  add column if not exists confidence_rating int check (confidence_rating between 1 and 5),
  add column if not exists time_taken_minutes int,
  add column if not exists companies text,
  add column if not exists notes text;
