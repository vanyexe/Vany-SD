import { getISTDateString } from '@/lib/dateUtils';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/settings — fetch or auto-create user settings
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Try to fetch existing settings
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // Row doesn't exist yet — create it (first login, Day 1)
      const today = getISTDateString()
      const { data: newRow, error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          display_name: 'Vany',
          start_date: today,
          current_phase: 1,
          phase_progress: 0.0,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Settings insert error:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      return NextResponse.json(newRow)
    }

    if (error) {
      console.error('Settings fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Uncaught error in settings GET:', err, err?.message, err?.stack)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

// POST /api/settings — update current_phase, phase_progress, display_name
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { current_phase, phase_progress, display_name, start_date } = body

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (current_phase !== undefined) updates.current_phase = current_phase
  if (phase_progress !== undefined) updates.phase_progress = phase_progress
  if (display_name !== undefined) updates.display_name = display_name
  if (start_date !== undefined) updates.start_date = start_date

  const { data, error } = await supabase
    .from('user_settings')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
