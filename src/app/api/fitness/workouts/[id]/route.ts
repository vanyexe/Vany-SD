import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('fitness_workouts')
    .select('*, sets:fitness_workout_sets(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { sets, ...workoutData } = body;

  const { data: workout, error: workoutError } = await supabase
    .from('fitness_workouts')
    .update(workoutData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (workoutError) {
    return NextResponse.json({ error: workoutError.message }, { status: 500 });
  }

  if (sets) {
    // Delete existing sets
    await supabase
      .from('fitness_workout_sets')
      .delete()
      .eq('workout_id', id);

    // Insert new sets if any
    if (sets.length > 0) {
      const setsToInsert = sets.map((set: any) => ({
        ...set,
        workout_id: id,
        id: undefined // Let DB generate new IDs
      }));
      await supabase
        .from('fitness_workout_sets')
        .insert(setsToInsert);
    }
  }

  const { data: updatedWorkout } = await supabase
    .from('fitness_workouts')
    .select('*, sets:fitness_workout_sets(*)')
    .eq('id', id)
    .single();

  return NextResponse.json(updatedWorkout);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get workout info before deleting for the timeline event
  const { data: workout } = await supabase
    .from('fitness_workouts')
    .select('workout_date')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  const { error } = await supabase
    .from('fitness_workouts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create timeline event
  const timelineEvent = {
    user_id: user.id,
    event_type: 'workout_deleted',
    module: 'fitness',
    title: 'Deleted workout',
    icon: '🗑️',
    color: '#C4675A',
    event_date: workout?.workout_date || new Date().toISOString().split('T')[0]
  };

  await supabase.from('timeline_events').insert(timelineEvent);

  return NextResponse.json({ success: true });
}
