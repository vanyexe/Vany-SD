import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Support Next.js 15+ promise-based params
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const { data, error } = await supabase
      .from('goals')
      .select('*, milestones:goal_milestones(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: goal, error } = await supabase
      .from('goals')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (body.status === 'completed') {
      await supabase.from('timeline_events').insert({
        user_id: user.user.id,
        event_type: 'goal_completed',
        module: 'goals',
        title: `Completed Goal: ${goal.title}`,
        icon: '🏆',
        color: '#FFD700',
        event_date: new Date().toISOString(),
      });
    }

    return NextResponse.json({ data: goal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
