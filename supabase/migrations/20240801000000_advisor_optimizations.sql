-- Supabase Advisor Optimizations Migration

-- 1. Fix Mutable Search Path on security definer function
ALTER FUNCTION public.set_updated_at() SET search_path = '';

-- 2. Missing RLS Policy on achievements
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);

-- 3. Unindexed Foreign Keys
CREATE INDEX IF NOT EXISTS achievement_files_user_id_idx ON public.achievement_files(user_id);
CREATE INDEX IF NOT EXISTS custom_habits_user_id_idx ON public.custom_habits(user_id);
CREATE INDEX IF NOT EXISTS fitness_challenges_exercise_id_idx ON public.fitness_challenges(exercise_id);
CREATE INDEX IF NOT EXISTS fitness_prs_workout_id_idx ON public.fitness_prs(workout_id);
CREATE INDEX IF NOT EXISTS fitness_workout_sets_exercise_id_idx ON public.fitness_workout_sets(exercise_id);
CREATE INDEX IF NOT EXISTS focus_sessions_task_id_idx ON public.focus_sessions(task_id);
CREATE INDEX IF NOT EXISTS focus_sessions_user_id_idx ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS goal_milestones_user_id_idx ON public.goal_milestones(user_id);
CREATE INDEX IF NOT EXISTS project_links_user_id_idx ON public.project_links(user_id);
CREATE INDEX IF NOT EXISTS tasks_category_id_idx ON public.tasks(category_id);
CREATE INDEX IF NOT EXISTS team_invites_invited_by_idx ON public.team_invites(invited_by);
CREATE INDEX IF NOT EXISTS team_invites_team_id_idx ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS team_members_invited_by_idx ON public.team_members(invited_by);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS teams_owner_id_idx ON public.teams(owner_id);
CREATE INDEX IF NOT EXISTS trailer_tasks_team_id_idx ON public.trailer_tasks(team_id);
CREATE INDEX IF NOT EXISTS user_achievements_achievement_id_idx ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS vault_achievements_category_id_idx ON public.vault_achievements(category_id);

-- 4. Auth RLS Initplan Optimizations
-- We use a DO block to dynamically update all policies that contain auth.uid() directly.

DO $$
DECLARE
    pol RECORD;
    new_qual text;
    new_with_check text;
    alter_stmt text;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
          AND (qual NOT LIKE '%(select auth.uid())%' AND with_check NOT LIKE '%(select auth.uid())%')
    LOOP
        new_qual := replace(pol.qual, 'auth.uid()', '(select auth.uid())');
        new_with_check := replace(pol.with_check, 'auth.uid()', '(select auth.uid())');
        
        alter_stmt := format('ALTER POLICY %I ON %I.%I ', pol.policyname, pol.schemaname, pol.tablename);
        
        IF new_qual IS NOT NULL THEN
            alter_stmt := alter_stmt || format(' USING (%s) ', new_qual);
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            alter_stmt := alter_stmt || format(' WITH CHECK (%s) ', new_with_check);
        END IF;
        
        EXECUTE alter_stmt;
    END LOOP;
END
$$;

