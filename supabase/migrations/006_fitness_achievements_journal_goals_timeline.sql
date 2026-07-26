-- ============================================================
-- VANY EXPANSION: Fitness, Achievements, Journal, Goals, Timeline
-- Run this entire file in your Supabase SQL Editor
-- Safe to run: all statements use IF NOT EXISTS / ON CONFLICT
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 006: FITNESS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fitness_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'strength'
                    CHECK (category IN ('cardio','strength','flexibility','sports','other')),
  icon            TEXT NOT NULL DEFAULT '💪',
  color           TEXT NOT NULL DEFAULT '#3FA793',
  unit            TEXT NOT NULL DEFAULT 'reps'
                    CHECK (unit IN ('reps','distance_km','time_min','weight_kg','bodyweight')),
  has_sets        BOOLEAN NOT NULL DEFAULT true,
  has_reps        BOOLEAN NOT NULL DEFAULT true,
  has_weight      BOOLEAN NOT NULL DEFAULT false,
  has_distance    BOOLEAN NOT NULL DEFAULT false,
  has_duration    BOOLEAN NOT NULL DEFAULT false,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fitness_exercises ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='fitness_exercises' AND policyname='Users manage own exercises'
  ) THEN
    CREATE POLICY "Users manage own exercises" ON public.fitness_exercises
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fitness_exercises_user ON public.fitness_exercises (user_id, is_archived);

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fitness_workouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users NOT NULL,
  workout_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  duration_min    INT,
  title           TEXT,
  notes           TEXT,
  mood            INT CHECK (mood BETWEEN 1 AND 5),
  energy_level    INT CHECK (energy_level BETWEEN 1 AND 5),
  difficulty      INT CHECK (difficulty BETWEEN 1 AND 5),
  completed       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fitness_workouts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='fitness_workouts' AND policyname='Users manage own workouts'
  ) THEN
    CREATE POLICY "Users manage own workouts" ON public.fitness_workouts
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fitness_workouts_user_date ON public.fitness_workouts (user_id, workout_date DESC);

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fitness_workout_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id      UUID REFERENCES public.fitness_workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id     UUID REFERENCES public.fitness_exercises(id) ON DELETE SET NULL,
  exercise_name   TEXT NOT NULL,
  set_number      INT NOT NULL DEFAULT 1,
  reps            INT,
  weight_kg       NUMERIC(6,2),
  distance_km     NUMERIC(6,3),
  duration_min    INT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fitness_workout_sets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='fitness_workout_sets' AND policyname='Users manage own workout sets'
  ) THEN
    CREATE POLICY "Users manage own workout sets" ON public.fitness_workout_sets
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.fitness_workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.fitness_workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fitness_workout_sets_workout ON public.fitness_workout_sets (workout_id);

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fitness_prs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users NOT NULL,
  exercise_name   TEXT NOT NULL,
  pr_type         TEXT NOT NULL
                    CHECK (pr_type IN ('max_reps','max_weight_kg','max_distance_km','max_duration_min','best_streak_days')),
  value           NUMERIC(10,3) NOT NULL,
  achieved_at     DATE NOT NULL,
  workout_id      UUID REFERENCES public.fitness_workouts(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_name, pr_type)
);

ALTER TABLE public.fitness_prs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='fitness_prs' AND policyname='Users manage own PRs'
  ) THEN
    CREATE POLICY "Users manage own PRs" ON public.fitness_prs
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fitness_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  challenge_type  TEXT NOT NULL DEFAULT 'weekly'
                    CHECK (challenge_type IN ('daily','weekly','monthly','custom')),
  target_value    NUMERIC(10,2) NOT NULL,
  current_value   NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL,
  exercise_id     UUID REFERENCES public.fitness_exercises(id) ON DELETE SET NULL,
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE NOT NULL,
  completed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fitness_challenges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='fitness_challenges' AND policyname='Users manage own fitness challenges'
  ) THEN
    CREATE POLICY "Users manage own fitness challenges" ON public.fitness_challenges
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fitness_challenges_user ON public.fitness_challenges (user_id, completed, end_date);

-- ──────────────────────────────────────────────────────────────
-- 007: ACHIEVEMENTS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.achievement_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users NOT NULL,
  name            TEXT NOT NULL,
  icon            TEXT NOT NULL DEFAULT '🏆',
  color           TEXT NOT NULL DEFAULT '#D6A24C',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.achievement_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='achievement_categories' AND policyname='Users manage own achievement categories'
  ) THEN
    CREATE POLICY "Users manage own achievement categories" ON public.achievement_categories
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_achievements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users NOT NULL,
  title               TEXT NOT NULL,
  category_id         UUID REFERENCES public.achievement_categories(id) ON DELETE SET NULL,
  category_name       TEXT,
  description         TEXT,
  achievement_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  organization        TEXT,
  event_name          TEXT,
  position            TEXT,
  team_members        TEXT[] NOT NULL DEFAULT '{}',
  technologies        TEXT[] NOT NULL DEFAULT '{}',
  skills_learned      TEXT[] NOT NULL DEFAULT '{}',
  tags                TEXT[] NOT NULL DEFAULT '{}',
  personal_reflection TEXT,
  lessons_learned     TEXT,
  future_improvements TEXT,
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_achievements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='vault_achievements' AND policyname='Users manage own achievements'
  ) THEN
    CREATE POLICY "Users manage own achievements" ON public.vault_achievements
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vault_achievements_user_date ON public.vault_achievements (user_id, achievement_date DESC);
CREATE INDEX IF NOT EXISTS idx_vault_achievements_tags ON public.vault_achievements USING gin(tags);

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.achievement_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id  UUID REFERENCES public.vault_achievements(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users NOT NULL,
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL CHECK (file_type IN ('image','pdf','document','other')),
  storage_path    TEXT NOT NULL,
  public_url      TEXT,
  file_size_bytes INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievement_files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='achievement_files' AND policyname='Users manage own achievement files'
  ) THEN
    CREATE POLICY "Users manage own achievement files" ON public.achievement_files
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_achievement_files_achievement ON public.achievement_files (achievement_id);

-- ──────────────────────────────────────────────────────────────
-- 008: JOURNAL
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users NOT NULL,
  entry_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  title               TEXT,
  mood                INT CHECK (mood BETWEEN 1 AND 5),
  energy              INT CHECK (energy BETWEEN 1 AND 5),
  word_count          INT NOT NULL DEFAULT 0,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  section_learned     TEXT,
  section_achievement TEXT,
  section_challenges  TEXT,
  section_tomorrow    TEXT,
  section_reflection  TEXT,
  free_content        TEXT,
  ai_summary          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='journal_entries' AND policyname='Users manage own journal'
  ) THEN
    CREATE POLICY "Users manage own journal" ON public.journal_entries
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON public.journal_entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_fts ON public.journal_entries USING gin(
  to_tsvector('english',
    coalesce(title,'') || ' ' ||
    coalesce(free_content,'') || ' ' ||
    coalesce(section_learned,'') || ' ' ||
    coalesce(section_reflection,'') || ' ' ||
    coalesce(section_achievement,'')
  )
);

-- ──────────────────────────────────────────────────────────────
-- 009: GOALS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'personal'
                    CHECK (category IN ('career','learning','fitness','personal','financial','project','other')),
  target_date     DATE,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','completed','paused','cancelled')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high')),
  auto_track      BOOLEAN NOT NULL DEFAULT false,
  track_module    TEXT,
  track_metric    TEXT,
  track_target    NUMERIC(10,2),
  current_value   NUMERIC(10,2) NOT NULL DEFAULT 0,
  progress_pct    INT NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  icon            TEXT NOT NULL DEFAULT '🎯',
  color           TEXT NOT NULL DEFAULT '#3FA793',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='goals' AND policyname='Users manage own goals'
  ) THEN
    CREATE POLICY "Users manage own goals" ON public.goals
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_goals_user_status ON public.goals (user_id, status);

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id         UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users NOT NULL,
  title           TEXT NOT NULL,
  target_date     DATE,
  completed       BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='goal_milestones' AND policyname='Users manage own milestones'
  ) THEN
    CREATE POLICY "Users manage own milestones" ON public.goal_milestones
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON public.goal_milestones (goal_id);

-- ──────────────────────────────────────────────────────────────
-- 010: LIFE TIMELINE
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.timeline_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users NOT NULL,
  event_type      TEXT NOT NULL,
  module          TEXT NOT NULL
                    CHECK (module IN ('dsa','habits','fitness','achievements','tasks','notes','phases','trailer','journal','goals','focus')),
  title           TEXT NOT NULL,
  description     TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  icon            TEXT NOT NULL DEFAULT '⭐',
  color           TEXT NOT NULL DEFAULT '#3FA793',
  event_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='timeline_events' AND policyname='Users manage own timeline'
  ) THEN
    CREATE POLICY "Users manage own timeline" ON public.timeline_events
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_timeline_events_user_date ON public.timeline_events (user_id, event_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_user_module ON public.timeline_events (user_id, module);
CREATE INDEX IF NOT EXISTS idx_timeline_events_fts ON public.timeline_events USING gin(
  to_tsvector('english', title || ' ' || coalesce(description,''))
);

-- ──────────────────────────────────────────────────────────────
-- SUPABASE STORAGE: achievement-files bucket
-- ──────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'achievement-files',
  'achievement-files',
  false,
  52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf','image/svg+xml','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='Users upload own achievement files'
  ) THEN
    CREATE POLICY "Users upload own achievement files" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'achievement-files' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='Users view own achievement files'
  ) THEN
    CREATE POLICY "Users view own achievement files" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'achievement-files' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='Users delete own achievement files'
  ) THEN
    CREATE POLICY "Users delete own achievement files" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'achievement-files' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Done! All tables, indexes, and storage bucket created.
