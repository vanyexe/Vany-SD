import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const achievement_id = formData.get('achievement_id') as string | null

    if (!file || !achievement_id) {
      return NextResponse.json({ error: 'File and achievement_id are required' }, { status: 400 })
    }

    const timestamp = Date.now()
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const storage_path = `${user.id}/${achievement_id}/${timestamp}_${safeFilename}`

    const { error: uploadError } = await supabase.storage
      .from('achievement-files')
      .upload(storage_path, file)

    if (uploadError) throw uploadError

    const mime = file.type
    let file_type = 'document'
    if (mime.startsWith('image/')) file_type = 'image'
    else if (mime === 'application/pdf') file_type = 'pdf'

    const { data: achievementFile, error: insertError } = await supabase
      .from('achievement_files')
      .insert({
        achievement_id,
        file_name: file.name,
        storage_path,
        file_type,
        file_size: file.size,
        mime_type: mime
      })
      .select()
      .single()

    if (insertError) throw insertError

    const { data: urlData } = await supabase.storage
      .from('achievement-files')
      .createSignedUrl(storage_path, 3600)

    return NextResponse.json({
      id: achievementFile.id,
      storage_path,
      public_url: urlData?.signedUrl || null,
      file_name: file.name,
      file_type
    })
  } catch (error: any) {
    console.error('Error uploading achievement file:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
