-- ============================================================
-- Vany — Full Database Schema
-- Run this entire script in Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- 1. user_settings
-- ─────────────────────────────────────────────
create table if not exists public.user_settings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null unique,
  display_name    text not null default 'Vany',
  start_date      date not null default current_date,
  current_phase   int not null default 1,
  phase_progress  numeric(5,3) not null default 0.0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users manage own settings"
  on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 2. dsa_problems
-- ─────────────────────────────────────────────
create table if not exists public.dsa_problems (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users not null,
  title             text not null,
  topic_id          text not null,
  difficulty        text not null check (difficulty in ('easy', 'medium', 'hard')),
  platform_url      text,
  date_solved       date not null default current_date,
  next_review_date  date not null,
  review_count      int not null default 0,
  created_at        timestamptz not null default now()
);

alter table public.dsa_problems enable row level security;

create policy "Users manage own dsa_problems"
  on public.dsa_problems
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_dsa_problems_user_id on public.dsa_problems(user_id);
create index if not exists idx_dsa_problems_next_review on public.dsa_problems(user_id, next_review_date);

-- ─────────────────────────────────────────────
-- 3. habit_logs
-- ─────────────────────────────────────────────
create table if not exists public.habit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  habit_id    int not null,
  log_date    date not null,
  done        boolean not null default true,
  created_at  timestamptz not null default now(),
  unique(user_id, habit_id, log_date)
);

alter table public.habit_logs enable row level security;

create policy "Users manage own habit_logs"
  on public.habit_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_habit_logs_user_date on public.habit_logs(user_id, log_date);

-- ─────────────────────────────────────────────
-- 4. trailer_tasks
-- ─────────────────────────────────────────────
create table if not exists public.trailer_tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  title       text not null,
  assignee    text not null default 'You',
  stage       text not null default 'pre-prod',
  status      text not null default 'todo' check (status in ('todo', 'in-progress', 'done')),
  created_at  timestamptz not null default now()
);

alter table public.trailer_tasks enable row level security;

create policy "Users manage own trailer_tasks"
  on public.trailer_tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_trailer_tasks_user_id on public.trailer_tasks(user_id);

-- ─────────────────────────────────────────────
-- 5. phase_checkpoints
-- ─────────────────────────────────────────────
create table if not exists public.phase_checkpoints (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  phase_id    int not null,
  item_index  int not null,
  checked     boolean not null default false,
  updated_at  timestamptz not null default now(),
  unique(user_id, phase_id, item_index)
);

alter table public.phase_checkpoints enable row level security;

create policy "Users manage own phase_checkpoints"
  on public.phase_checkpoints
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Done! All 5 tables created with RLS enabled.
-- ─────────────────────────────────────────────
