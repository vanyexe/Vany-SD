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
