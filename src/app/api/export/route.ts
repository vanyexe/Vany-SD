import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'json'

    if (format === 'csv') {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!tasks || tasks.length === 0) {
        return new NextResponse('No tasks found', { status: 404 })
      }

      const headers = Object.keys(tasks[0]).join(',')
      const rows = tasks.map((task: any) => 
        Object.values(task).map(val => {
          if (val === null || val === undefined) return '""'
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
          return `"${String(val).replace(/"/g, '""')}"`
        }).join(',')
      ).join('\n')

      const csvContent = `${headers}\n${rows}`
      
      const response = new NextResponse(csvContent)
      response.headers.set('Content-Type', 'text/csv')
      response.headers.set('Content-Disposition', 'attachment; filename="tasks-export.csv"')
      return response
    }

    // Default JSON export
    const [settingsRes, tasksRes, dsaRes, habitsRes, notesRes, trailerRes, phaseRes] = await Promise.all([
      supabase.from('settings').select('*').eq('user_id', user.id).single(),
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('dsa_problems').select('*').eq('user_id', user.id),
      supabase.from('habit_logs').select('*').eq('user_id', user.id),
      supabase.from('notes').select('*').eq('user_id', user.id),
      supabase.from('trailer_tasks').select('*').eq('user_id', user.id),
      supabase.from('phase_checkpoints').select('*').eq('user_id', user.id),
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      settings: settingsRes.data || null,
      tasks: tasksRes.data || [],
      dsa_problems: dsaRes.data || [],
      habit_logs: habitsRes.data || [],
      notes: notesRes.data || [],
      trailer_tasks: trailerRes.data || [],
      phase_checkpoints: phaseRes.data || []
    }

    const response = new NextResponse(JSON.stringify(exportData, null, 2))
    response.headers.set('Content-Type', 'application/json')
    response.headers.set('Content-Disposition', 'attachment; filename="vany-export.json"')
    return response

  } catch (error: any) {
    console.error('Error exporting data:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
