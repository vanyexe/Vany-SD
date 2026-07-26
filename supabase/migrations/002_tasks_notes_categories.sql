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
  icon        text not null default '📁',        -- emoji
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
