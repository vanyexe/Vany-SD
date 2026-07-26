import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')

    if (!q || q.trim() === '') {
      return NextResponse.json({ tasks: [], dsa: [], notes: [], trailer: [], workouts: [], achievements: [] })
    }

    const searchQuery = `%${q}%`

    // Run searches in parallel
    const [tasksRes, dsaRes, notesRes, trailerRes, workoutsRes, achievementsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, description, status')
        .eq('user_id', user.id)
        .or(`title.ilike.${searchQuery},description.ilike.${searchQuery}`)
        .limit(5),
      
      supabase
        .from('dsa_problems')
        .select('id, title, difficulty, status')
        .eq('user_id', user.id)
        .ilike('title', searchQuery)
        .limit(5),

      supabase
        .from('notes')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .ilike('title', searchQuery)
        .limit(5),

      supabase
        .from('trailer_tasks')
        .select('id, title, status')
        // Trailer tasks may not directly belong to user_id, but for now we assume they have user_id
        // Adjust if they use team_id
        .eq('user_id', user.id)
        .ilike('title', searchQuery)
        .limit(5),

      supabase
        .from('fitness_workouts')
        .select('id, title, notes')
        .eq('user_id', user.id)
        .or(`title.ilike.${searchQuery},notes.ilike.${searchQuery}`)
        .limit(5),

      supabase
        .from('vault_achievements')
        .select('id, title, description, organization')
        .eq('user_id', user.id)
        .or(`title.ilike.${searchQuery},description.ilike.${searchQuery},organization.ilike.${searchQuery}`)
        .limit(5)
    ])

    return NextResponse.json({
      tasks: tasksRes.data || [],
      dsa: dsaRes.data || [],
      notes: notesRes.data || [],
      trailer: trailerRes.data || [],
      workouts: (workoutsRes.data || []).map((w: any) => ({ ...w, type: 'workout' })),
      achievements: (achievementsRes.data || []).map((a: any) => ({ ...a, type: 'achievement' }))
    })
  } catch (error: any) {
    console.error('Error searching:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
