import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/habits?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('log_date', { ascending: true })

  if (from) query = query.gte('log_date', from)
  if (to) query = query.lte('log_date', to)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/habits — toggle a habit log (upsert done/undone)
// Works for both fixed habits (habit_id: int) and custom habits (habit_id: UUID string)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { habit_id, log_date, done } = body

  if (!habit_id || !log_date) {
    return NextResponse.json({ error: 'habit_id and log_date required' }, { status: 400 })
  }

  // Upsert — insert or update on conflict
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert(
      { user_id: user.id, habit_id, log_date, done: done ?? true },
      { onConflict: 'user_id,habit_id,log_date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
