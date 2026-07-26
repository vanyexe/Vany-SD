import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('fitness_prs')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const { exercise_name, pr_type, value, achieved_at } = body;

  // Check if existing PR is higher
  const { data: existingPR } = await supabase
    .from('fitness_prs')
    .select('id, value')
    .eq('user_id', user.id)
    .eq('exercise_name', exercise_name)
    .eq('pr_type', pr_type)
    .single();

  if (existingPR) {
    if (value > existingPR.value) {
      // Update PR
      const { data, error } = await supabase
        .from('fitness_prs')
        .update({ value, achieved_at })
        .eq('id', existingPR.id)
        .select()
        .single();
        
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    } else {
      // Not a new PR, return existing
      return NextResponse.json(existingPR);
    }
  } else {
    // Insert new PR
    const { data, error } = await supabase
      .from('fitness_prs')
      .insert({
        user_id: user.id,
        exercise_name,
        pr_type,
        value,
        achieved_at
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }
}
