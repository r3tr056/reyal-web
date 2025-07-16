import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

// Allowed file types for 3D models
const ALLOWED_TYPES = ['.stl', '.obj', '.3mf', '.ply']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file
    const fileExtension = path.extname(file.name).toLowerCase()
    if (!ALLOWED_TYPES.includes(fileExtension)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed types: ' + ALLOWED_TYPES.join(', ')
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }, { status: 400 })
    }

    // Generate unique filename
    const fileId = crypto.randomUUID()
    const filename = `${fileId}${fileExtension}`
    const uploadDir = path.join(process.cwd(), 'uploads', user.id)
    const filePath = path.join(uploadDir, filename)

    // Create upload directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Convert file to buffer and save
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Save file metadata to database
    const { data: dbFile, error: dbError } = await supabase
      .from('files')
      .insert({
        id: fileId,
        user_id: user.id,
        filename: filename,
        original_filename: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: fileExtension,
        mime_type: file.type,
        is_analyzed: false
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ 
        error: 'Failed to save file metadata'
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