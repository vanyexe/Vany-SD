import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Seed defaults if empty
    const { data: existing } = await supabase
      .from('achievement_categories')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (!existing || existing.length === 0) {
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

    const { data, error } = await supabase
      .from('achievement_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, icon, color } = body

    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const { data, error } = await supabase
      .from('achievement_categories')
      .insert({ user_id: user.id, name: name.trim(), icon: icon || '📁', color: color || '#3FA793' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
