import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('goals')
      .select('*, milestones:goal_milestones(*)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({ ...body, user_id: user.user.id })
      .select()
      .single();

    if (goalError) throw goalError;

    // Create timeline event
    await supabase.from('timeline_events').insert({
      user_id: user.user.id,
      event_type: 'goal_created',
      module: 'goals',
      title: `Goal: ${goal.title}`,
      icon: '🎯',
      color: '#3FA793',
      event_date: new Date().toISOString(),
    });

    return NextResponse.json({ data: goal }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
