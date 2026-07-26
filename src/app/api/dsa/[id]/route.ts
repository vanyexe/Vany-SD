import { getISTDateString } from '@/lib/dateUtils';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

  const body = await request.json()
  
  if (body.review_count_increment) {
    const { data: existing, error: fetchError } = await supabase
      .from('dsa_problems')
      .select('review_count, next_review_date')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
      
    if (fetchError || !existing) return NextResponse.json({ error: 'Problem not found' }, { status: 404 })

    const newReviewCount = existing.review_count + 1
    const daysToAdd = newReviewCount === 1 ? 30 : 90 // basic spaced repetition
    
    const d = new Date()
    d.setDate(d.getDate() + daysToAdd)
    const next_review_date = getISTDateString(d)

    const { data, error } = await supabase
      .from('dsa_problems')
      .update({ review_count: newReviewCount, next_review_date })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Normal update
  const updates = { ...body }
  delete updates.id // don't allow updating id
  delete updates.user_id

  const { data, error } = await supabase
    .from('dsa_problems')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

  const { error } = await supabase
    .from('dsa_problems')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
