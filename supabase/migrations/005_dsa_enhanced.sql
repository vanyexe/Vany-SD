-- D:\Vany\yatra\supabase\migrations\005_dsa_enhanced.sql
alter table public.dsa_problems
  add column if not exists confidence_rating int check (confidence_rating between 1 and 5),
  add column if not exists time_taken_minutes int,
  add column if not exists companies text,
  add column if not exists notes text;
