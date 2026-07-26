import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type Params = { params: { id: string } | Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const supabase = await createClient();
    const { id } = await Promise.resolve(params);

    const { data, error } = await supabase
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', id)
      .order('target_date', { ascending: true, nullsFirst: true });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const supabase = await createClient();
    const { id } = await Promise.resolve(params);
    const body = await request.json();

    const { data: milestone, error } = await supabase
      .from('goal_milestones')
      .insert({
        goal_id: id,
        title: body.title,
        target_date: body.target_date ?? null,
        completed: false,
      })
      .select()
      .single();

    if (error) throw error;

    await updateGoalProgress(supabase, id);

    return NextResponse.json({ data: milestone }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — toggle milestone. Body: { id: milestoneId, completed: boolean }
export async function PATCH(request: Request, { params }: Params) {
  try {
    const supabase = await createClient();
    const { id } = await Promise.resolve(params);
    const body = await request.json();

    // Support both { id } and legacy { milestone_id }
    const milestoneId = body.id ?? body.milestone_id;
    const completed = body.completed;

    const updateData: Record<string, unknown> = { completed };
    if (completed) {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }

    const { data: milestone, error } = await supabase
      .from('goal_milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .eq('goal_id', id)
      .select()
      .single();

    if (error) throw error;

    await updateGoalProgress(supabase, id);

    return NextResponse.json({ data: milestone });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remove milestone. Body: { id: milestoneId }
export async function DELETE(request: Request, { params }: Params) {
  try {
    const supabase = await createClient();
    const { id } = await Promise.resolve(params);
    const body = await request.json();
    const milestoneId = body.id;

    const { error } = await supabase
      .from('goal_milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('goal_id', id);

    if (error) throw error;

    await updateGoalProgress(supabase, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function updateGoalProgress(supabase: any, goalId: string) {
  const { data: milestones } = await supabase
    .from('goal_milestones')
    .select('completed')
    .eq('goal_id', goalId);

  if (milestones && milestones.length > 0) {
    const total = milestones.length;
    const completed = milestones.filter((m: any) => m.completed).length;
    const progress_pct = Math.round((completed / total) * 100);

    await supabase.from('goals').update({ progress_pct }).eq('id', goalId);
  }
}
