create table if not exists public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  title       text not null,
  description text,
  event_date  date not null,
  color       text not null default '#8A9A9D',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

create policy "Users manage own calendar events" on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_calendar_events_user_date on public.calendar_events(user_id, event_date);

DROP TRIGGER IF EXISTS set_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER set_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
