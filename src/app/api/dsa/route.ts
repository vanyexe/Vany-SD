import { getISTDateString } from '@/lib/dateUtils';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return getISTDateString(d)
}

// GET /api/dsa — all problems for user
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('dsa_problems')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/dsa — log a new problem
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, topic_id, difficulty, platform_url } = body

  if (!title || !topic_id || !difficulty) {
    return NextResponse.json({ error: 'title, topic_id, difficulty are required' }, { status: 400 })
  }

  const today = getISTDateString()
  const next_review_date = addDays(today, 7)

  const { data, error } = await supabase
    .from('dsa_problems')
    .insert({
      user_id: user.id,
      title,
      topic_id,
      difficulty,
      platform_url: platform_url || null,
      date_solved: today,
      next_review_date,
      review_count: 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
