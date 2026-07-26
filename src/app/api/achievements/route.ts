import { getISTDateString } from '@/lib/dateUtils';
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Auto-seed default categories if none exist
    const { data: categoryCheck } = await supabase
      .from('achievement_categories')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
    
    if (!categoryCheck || categoryCheck.length === 0) {
      const defaults = [
        {name:'Hackathon',icon:'🏆',color:'#D6A24C'},{name:'Competition',icon:'🥇',color:'#C4675A'},
        {name:'Certificate',icon:'📜',color:'#3FA793'},{name:'Project',icon:'💻',color:'#7C5CBF'},
        {name:'Open Source',icon:'🔧',color:'#5BA0D0'},{name:'Internship',icon:'💼',color:'#D6A24C'},
        {name:'Course',icon:'📚',color:'#3FA793'},{name:'Award',icon:'🏅',color:'#D6A24C'},
        {name:'Leadership',icon:'👥',color:'#C4675A'},{name:'Research',icon:'🔬',color:'#7C5CBF'},
        {name:'Workshop',icon:'🛠️',color:'#5BA0D0'},{name:'Fitness Milestone',icon:'💪',color:'#3FA793'},
        {name:'Personal Achievement',icon:'⭐',color:'#D6A24C'}
      ].map(c => ({ ...c, user_id: user.id }))
      
      await supabase.from('achievement_categories').insert(defaults)
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const year = searchParams.get('year')
    const featured = searchParams.get('featured')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('vault_achievements')
      .select('*, files:achievement_files(*), category:achievement_categories(*)', { count: 'exact' })
      .eq('user_id', user.id)

    if (category) query = query.eq('category_id', category)
    if (featured === 'true') query = query.eq('is_featured', true)
    if (year) {
      const start = `${year}-01-01`
      const end = `${year}-12-31`
      query = query.gte('achievement_date', start).lte('achievement_date', end)
    }
    if (search) query = query.ilike('title', `%${search}%`)

    query = query.range(offset, offset + limit - 1).order('achievement_date', { ascending: false })

    const { data: achievements, count, error } = await query

    if (error) throw error

    return NextResponse.json({ achievements: achievements || [], total: count || 0, hasMore: offset + limit < (count || 0) })
  } catch (error: any) {
    console.error('Error in achievements GET:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { 
      title, description, category_id, achievement_date, organization, event_name, position,
      team_members, technologies, skills_learned, tags, personal_reflection,
      lessons_learned, future_improvements, is_featured 
    } = body

    const insertDate = achievement_date || getISTDateString()

    const { data: achievement, error } = await supabase
      .from('vault_achievements')
      .insert({
        user_id: user.id,
        title,
        description,
        category_id,
        achievement_date: insertDate,
        organization,
        event_name,
        position,
        team_members: team_members || [],
        technologies: technologies || [],
        skills_learned: skills_learned || [],
        tags: tags || [],
        personal_reflection,
        lessons_learned,
        future_improvements,
        is_featured: is_featured || false,
      })
      .select('*, category:achievement_categories(name, icon, color)')
      .single()

    if (error) throw error

    const categoryData = achievement.category as any
    
    try {
      await supabase.from('timeline_events').insert({
        user_id: user.id,
        event_type: 'achievement_added',
        module: 'achievements',
        title: `Achievement: ${title}`,
        description: categoryData?.name || 'Achievement',
        icon: categoryData?.icon || '🏆',
        color: categoryData?.color || '#D6A24C',
        event_date: insertDate,
      })
    } catch {} // non-critical

    return NextResponse.json(achievement)
  } catch (error: any) {
    console.error('Error in achievements POST:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
