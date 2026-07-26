import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tables } = await req.json()
    if (!tables) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 })
    }

    // Process each table (e.g., tasks, notes, categories, habits)
    const allowedTables = ['categories', 'tasks', 'subtasks', 'notes', 'custom_habits', 'habit_logs', 'goals', 'goal_milestones', 'dsa_problems', 'fitness_workouts', 'vault_achievements', 'journal_entries']
    
    let imported = 0
    
    for (const [tableName, rows] of Object.entries(tables)) {
      if (allowedTables.includes(tableName) && Array.isArray(rows) && rows.length > 0) {
        // Clear existing data for this user to prevent duplicates (optional, or just insert)
        // We will just insert new records. The client export should ideally handle this.
        // It's safer to just insert, but we might get ID conflicts if IDs are included.
        // So we remove IDs and user_ids to let them be auto-generated and linked to current user.
        
        const cleanRows = rows.map((r: any) => {
          const { id, user_id, ...rest } = r
          return { ...rest, user_id: user.id }
        })

        const { error } = await supabase.from(tableName).insert(cleanRows)
        if (error) {
          console.error(`Error importing ${tableName}:`, error)
        } else {
          imported += cleanRows.length
        }
      }
    }

    return NextResponse.json({ success: true, imported })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
