import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('fitness_workouts')
    .select('*, sets:fitness_workout_sets(*)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('workout_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) {
    query = query.gte('workout_date', from);
  }
  if (to) {
    query = query.lte('workout_date', to);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workouts: data, total: count || 0 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { sets, ...workoutData } = body;

  const { data: workout, error: workoutError } = await supabase
    .from('fitness_workouts')
    .insert({ ...workoutData, user_id: user.id })
    .select()
    .single();

  if (workoutError) {
    return NextResponse.json({ error: workoutError.message }, { status: 500 });
  }

  let createdSets = [];
  if (sets && sets.length > 0) {
    const setsToInsert = sets.map((set: any) => ({
      ...set,
      workout_id: workout.id
    }));

    const { data: insertedSets, error: setsError } = await supabase
      .from('fitness_workout_sets')
      .insert(setsToInsert)
      .select();

    if (setsError) {
      return NextResponse.json({ error: setsError.message }, { status: 500 });
    }
    createdSets = insertedSets;
  }

  // Create timeline event
  const timelineEvent = {
    user_id: user.id,
    event_type: 'workout_logged',
    module: 'fitness',
    title: `Logged workout: ${workoutData.title || 'Untitled'}`,
    description: `${sets ? sets.length : 0} exercises · ${workoutData.duration_min || 0} min`,
    icon: '💪',
    color: '#3FA793',
    event_date: workoutData.workout_date || new Date().toISOString().split('T')[0]
  };

  await supabase.from('timeline_events').insert(timelineEvent);

  return NextResponse.json({ ...workout, sets: createdSets });
}
