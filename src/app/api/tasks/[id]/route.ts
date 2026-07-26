import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = (await params).id

    // Fetch the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (taskError) throw taskError
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Fetch subtasks
    const { data: subtasks, error: subtasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_id', id)
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })

    if (subtasksError) throw subtasksError

    return NextResponse.json({ ...task, subtasks: subtasks || [] })
  } catch (error: any) {
    console.error('Error fetching task:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = (await params).id
    const body = await req.json()

    // Prevent updating user_id
    delete body.user_id
    delete body.id

    if (body.status === 'done' && !body.completed_at) {
      body.completed_at = new Date().toISOString()
    } else if (body.status && body.status !== 'done') {
      body.completed_at = null
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = (await params).id

    // Check current status
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) throw fetchError
    if (!currentTask) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (currentTask.status === 'archived') {
      // Permanent delete
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      return NextResponse.json({ success: true, deleted: true })
    } else {
      // Soft delete
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, archived: true, data })
    }
  } catch (error: any) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
