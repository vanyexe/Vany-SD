import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = user.user.id;

    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('auto_track', true);

    if (goalsError) throw goalsError;
    if (!goals || goals.length === 0) return NextResponse.json({ data: [] });

    const updatedGoals = [];

    for (const goal of goals) {
      let currentValue = goal.current_value || 0;
      let progressPct = goal.progress_pct || 0;

      if (goal.track_module === 'dsa' && goal.track_metric === 'problems_solved') {
        const { count } = await supabase.from('dsa_problems').select('*', { count: 'exact', head: true }).eq('user_id', userId);
        currentValue = count || 0;
      } else if (goal.track_module === 'fitness' && goal.track_metric === 'workouts_done') {
        const { count } = await supabase.from('fitness_workouts').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('workout_date', goal.created_at);
        currentValue = count || 0;
      } else if (goal.track_module === 'fitness' && goal.track_metric === 'streak') {
         const { data: workouts } = await supabase.from('fitness_workouts').select('workout_date').eq('user_id', userId).order('workout_date', { ascending: false });
         if (workouts && workouts.length > 0) {
             let streak = 0;
             let currentDate = new Date();
             for (const workout of workouts) {
                 const wDate = new Date(workout.workout_date);
                 const diffTime = Math.abs(currentDate.getTime() - wDate.getTime());
                 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                 if (diffDays <= 1) {
                     streak++;
                     currentDate = wDate;
                 } else if (streak === 0 && diffDays <= 2) {
                     // Might have missed today but hit yesterday
                     streak++;
                     currentDate = wDate;
                 } else {
                     break;
                 }
             }
             currentValue = streak;
         } else {
             currentValue = 0;
         }
      } else if (goal.track_module === 'habits' && goal.track_metric === 'streak') {
         const { count } = await supabase.from('habit_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('done', true);
         currentValue = count || 0;
      } else if (goal.track_module === 'achievements' && goal.track_metric === 'total') {
        const { count } = await supabase.from('vault_achievements').select('*', { count: 'exact', head: true }).eq('user_id', userId);
        currentValue = count || 0;
      } else if (goal.track_module === 'tasks' && goal.track_metric === 'completed') {
        const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'done');
        currentValue = count || 0;
      }

      if (goal.target_value && goal.target_value > 0) {
        progressPct = Math.min(100, Math.round((currentValue / goal.target_value) * 100));
      }

      if (currentValue !== goal.current_value || progressPct !== goal.progress_pct) {
        const { data: updated } = await supabase
          .from('goals')
          .update({ current_value: currentValue, progress_pct: progressPct })
          .eq('id', goal.id)
          .select()
          .single();
        if (updated) updatedGoals.push(updated);
      } else {
        updatedGoals.push(goal);
      }
    }

    return NextResponse.json({ data: updatedGoals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
