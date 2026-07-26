import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/checkpoints?phase_id=1
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const phase_id = searchParams.get('phase_id')

  let query = supabase
    .from('phase_checkpoints')
    .select('*')
    .eq('user_id', user.id)

  if (phase_id) query = query.eq('phase_id', Number(phase_id))

  const { data, error } = await query.order('item_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/checkpoints — upsert a checkbox state
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { phase_id, item_index, checked } = body

  if (phase_id === undefined || item_index === undefined) {
    return NextResponse.json({ error: 'phase_id and item_index required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('phase_checkpoints')
    .upsert(
      {
        user_id: user.id,
        phase_id,
        item_index,
        checked: checked ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,phase_id,item_index' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
