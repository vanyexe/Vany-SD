import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('journal_entries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)

    if (fromDate) query = query.gte('entry_date', fromDate)
    if (toDate) query = query.lte('entry_date', toDate)
    
    if (search) {
      const sq = `%${search}%`
      query = query.or(`title.ilike.${sq},free_content.ilike.${sq},ai_summary.ilike.${sq}`)
    }

    query = query.order('entry_date', { ascending: false }).range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) throw error

    return NextResponse.json({ entries: data, total: count || 0 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
