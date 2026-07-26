import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const { date } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_date', date)
      .single()

    if (error && error.code !== 'PGRST116') throw error // ignore not-found error

    return NextResponse.json(data || null)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const { date } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      title,
      mood,
      energy,
      tags,
      section_learned,
      section_achievement,
      section_challenges,
      section_tomorrow,
      section_reflection,
      free_content,
      ai_summary,
    } = body

    // auto-calculate word_count from all text fields combined
    const allText = [title, section_learned, section_achievement, section_challenges, section_tomorrow, section_reflection, free_content]
      .filter(Boolean)
      .join(' ')
    const word_count = allText.trim() ? allText.trim().split(/\s+/).filter(Boolean).length : 0

    // Check if entry already exists (for timeline event)
    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('entry_date', date)
      .single()

    const payload: Record<string, any> = {
      user_id: user.id,
      entry_date: date,
      word_count,
      updated_at: new Date().toISOString(),
    }

    // Only include defined fields to avoid overwriting with null
    if (title !== undefined) payload.title = title
    if (mood !== undefined) payload.mood = mood || null
    if (energy !== undefined) payload.energy = energy || null
    if (tags !== undefined) payload.tags = tags
    if (section_learned !== undefined) payload.section_learned = section_learned
    if (section_achievement !== undefined) payload.section_achievement = section_achievement
    if (section_challenges !== undefined) payload.section_challenges = section_challenges
    if (section_tomorrow !== undefined) payload.section_tomorrow = section_tomorrow
    if (section_reflection !== undefined) payload.section_reflection = section_reflection
    if (free_content !== undefined) payload.free_content = free_content
    if (ai_summary !== undefined) payload.ai_summary = ai_summary

    const { data, error } = await supabase
      .from('journal_entries')
      .upsert(payload, { onConflict: 'user_id, entry_date' })
      .select()
      .single()

    if (error) throw error

    // Add timeline event only for new entries
    if (!existing) {
      try {
        await supabase.from('timeline_events').insert({
          user_id: user.id,
          event_type: 'journal_written',
          module: 'journal',
          title: `Journal: ${title || date}`,
          description: `${word_count} words`,
          icon: '📖',
          color: '#5BA0D0',
          event_date: date,
        })
      } catch {} // non-critical
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const { date } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('entry_date', date)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
