import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const defaultExercises = [
  {name:'Running',category:'cardio',icon:'🏃',color:'#3FA793',unit:'distance_km',has_sets:false,has_reps:false,has_weight:false,has_distance:true,has_duration:true},
  {name:'Walking',category:'cardio',icon:'🚶',color:'#5BA0D0',unit:'distance_km',has_sets:false,has_reps:false,has_weight:false,has_distance:true,has_duration:true},
  {name:'Push-ups',category:'strength',icon:'💪',color:'#C4675A',unit:'reps',has_sets:true,has_reps:true,has_weight:false,has_distance:false,has_duration:false},
  {name:'Pull-ups',category:'strength',icon:'🤸',color:'#D6A24C',unit:'reps',has_sets:true,has_reps:true,has_weight:false,has_distance:false,has_duration:false},
  {name:'Chin-ups',category:'strength',icon:'💪',color:'#D6A24C',unit:'reps',has_sets:true,has_reps:true,has_weight:false,has_distance:false,has_duration:false},
  {name:'Squats',category:'strength',icon:'🏋️',color:'#7C5CBF',unit:'reps',has_sets:true,has_reps:true,has_weight:true,has_distance:false,has_duration:false},
  {name:'Plank',category:'strength',icon:'🧘',color:'#3FA793',unit:'time_min',has_sets:true,has_reps:false,has_weight:false,has_distance:false,has_duration:true},
  {name:'Sit-ups',category:'strength',icon:'💪',color:'#C4675A',unit:'reps',has_sets:true,has_reps:true,has_weight:false,has_distance:false,has_duration:false},
  {name:'Burpees',category:'strength',icon:'🔥',color:'#C4675A',unit:'reps',has_sets:true,has_reps:true,has_weight:false,has_distance:false,has_duration:false},
  {name:'Cycling',category:'cardio',icon:'🚴',color:'#5BA0D0',unit:'distance_km',has_sets:false,has_reps:false,has_weight:false,has_distance:true,has_duration:true},
  {name:'Swimming',category:'cardio',icon:'🏊',color:'#5BA0D0',unit:'distance_km',has_sets:false,has_reps:false,has_weight:false,has_distance:true,has_duration:true},
  {name:'Gym Workout',category:'strength',icon:'🏋️',color:'#7C5CBF',unit:'reps',has_sets:true,has_reps:true,has_weight:true,has_distance:false,has_duration:false},
  {name:'Stretching',category:'flexibility',icon:'🧘',color:'#3FA793',unit:'time_min',has_sets:false,has_reps:false,has_weight:false,has_distance:false,has_duration:true},
  {name:'Yoga',category:'flexibility',icon:'🧘',color:'#7C5CBF',unit:'time_min',has_sets:false,has_reps:false,has_weight:false,has_distance:false,has_duration:true}
];

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('fitness_exercises')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data && data.length === 0) {
    const exercisesToInsert = defaultExercises.map(ex => ({
      ...ex,
      user_id: user.id
    }));

    const { data: newExercises, error: insertError } = await supabase
      .from('fitness_exercises')
      .insert(exercisesToInsert)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json(newExercises);
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { data, error } = await supabase
    .from('fitness_exercises')
    .insert({ ...body, user_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
