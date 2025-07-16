import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ServerModelProcessor } from '@/lib/upload/server-file-processor'

export async function POST(request: NextRequest) {
  try {
    const { supabase, response } = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const validation = ServerModelProcessor.validateFile(file.name, file.size)
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'File validation failed', 
        details: validation.errors 
      }, { status: 400 })
    }

    const fileId = crypto.randomUUID()
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    const filename = `${fileId}${fileExtension}`
    const storagePath = `${user.id}/${filename}`

    const fileBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('3d-models')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
      })

    if (uploadError) {
      return NextResponse.json({ 
        error: 'File upload failed', 
        details: uploadError.message 
      }, { status: 500 })
    }

    const { data: dbFile, error: dbError } = await supabase
      .from('uploaded_files')
      .insert({
        id: fileId,
        user_id: user.id,
        filename: filename,
        original_filename: file.name,
        file_size: file.size,
        file_type: validation.fileType,
        storage_path: storagePath,
        status: 'uploaded'
      })
      .select()
      .single()

    if (dbError) {
      await supabase.storage.from('3d-models').remove([storagePath])
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      file: dbFile
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}