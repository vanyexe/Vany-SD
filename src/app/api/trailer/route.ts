import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/trailer — all tasks for user
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('trailer_tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/trailer — add a new task
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, assignee, stage, status } = body

  if (!title || !stage) {
    return NextResponse.json({ error: 'title and stage are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('trailer_tasks')
    .insert({
      user_id: user.id,
      title,
      assignee: assignee || 'You',
      stage,
      status: status || 'todo',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
