import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: achievement, error } = await supabase
      .from('vault_achievements')
      .select('*, files:achievement_files(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    if (achievement.files && achievement.files.length > 0) {
      for (const file of achievement.files) {
        const { data: urlData } = await supabase.storage
          .from('achievement-files')
          .createSignedUrl(file.storage_path, 3600)
        
        file.public_url = urlData?.signedUrl || null
      }
    }

    return NextResponse.json(achievement)
  } catch (error: any) {
    console.error('Error in GET achievement by ID:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { data: achievement, error } = await supabase
      .from('vault_achievements')
      .update(body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(achievement)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: files } = await supabase
      .from('achievement_files')
      .select('storage_path')
      .eq('achievement_id', (await params).id)

    const { error } = await supabase
      .from('vault_achievements')
      .delete()
      .eq('id', (await params).id)
      .eq('user_id', user.id)

    if (error) throw error

    if (files && files.length > 0) {
      const paths = files.map(f => f.storage_path)
      await supabase.storage.from('achievement-files').remove(paths)
    }

    try {
      await supabase.from('timeline_events').insert({
        user_id: user.id,
        event_type: 'achievement_deleted',
        module: 'achievements',
        title: 'Achievement deleted',
        icon: '🗑️',
        color: '#C4675A',
        event_date: new Date().toISOString().slice(0, 10),
      })
    } catch {} // non-critical

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
