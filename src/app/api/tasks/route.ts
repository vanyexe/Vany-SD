import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category_id = searchParams.get('category_id')
    const tag = searchParams.get('tag')
    const due_before = searchParams.get('due_before')
    const due_after = searchParams.get('due_after')
    const is_favorite = searchParams.get('is_favorite')
    const search = searchParams.get('search')
    const parent_id = searchParams.get('parent_id')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase.from('tasks').select('*')

    query = query.eq('user_id', user.id)

    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (category_id) query = query.eq('category_id', category_id)
    if (tag) query = query.contains('tags', [tag])
    if (due_before) query = query.lte('due_date', due_before)
    if (due_after) query = query.gte('due_date', due_after)
    if (is_favorite === 'true') query = query.eq('is_favorite', true)
    if (search) query = query.ilike('title', `%${search}%`)

    if (parent_id === 'null') {
      query = query.is('parent_id', null)
    } else if (parent_id) {
      query = query.eq('parent_id', parent_id)
    }

    query = query
      .order('is_pinned', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...body,
        user_id: user.id
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
