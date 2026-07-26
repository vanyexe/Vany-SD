-- Custom habits (extends the 5 fixed habits)
create table if not exists public.custom_habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  icon        text not null default '⭐',
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
  ('first_problem', 'First Blood', 'Log your first DSA problem', '⚔️', 25, 'dsa'),
  ('problems_10', 'Getting Started', 'Solve 10 DSA problems', '🎯', 50, 'dsa'),
  ('problems_50', 'Half Century', 'Solve 50 DSA problems', '💯', 150, 'dsa'),
  ('problems_100', 'Century', 'Solve 100 DSA problems', '🏆', 300, 'dsa'),
  ('problems_500', 'DSA Master', 'Solve 500 DSA problems', '👑', 1000, 'dsa'),
  ('streak_3', 'On a Roll', '3-day habit streak', '🔥', 30, 'habits'),
  ('streak_7', 'Week Warrior', '7-day habit streak', '⚡', 75, 'habits'),
  ('streak_30', 'Month Champion', '30-day habit streak', '🌟', 250, 'habits'),
  ('streak_100', 'Centurion', '100-day habit streak', '💎', 750, 'habits'),
  ('first_task', 'Getting Things Done', 'Complete your first task', '✅', 25, 'tasks'),
  ('tasks_10', 'Productive', 'Complete 10 tasks', '📋', 50, 'tasks'),
  ('tasks_100', 'Task Master', 'Complete 100 tasks', '🎖️', 200, 'tasks'),
  ('phase_1', 'Phase 1 Complete', 'Complete all Phase 1 checkpoints', '🗺️', 200, 'general'),
  ('focus_first', 'In The Zone', 'Complete your first focus session', '🎯', 30, 'general'),
  ('focus_10h', 'Deep Work', 'Accumulate 10 hours of focus time', '⏰', 200, 'general'),
  ('all_habits_day', 'Perfect Day', 'Complete all habits in a single day', '🌅', 100, 'habits'),
  ('week_perfect', 'Perfect Week', 'Complete all habits for 7 consecutive days', '🏅', 300, 'habits')
on conflict (id) do nothing;
