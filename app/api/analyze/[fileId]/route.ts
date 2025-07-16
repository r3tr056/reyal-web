import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ServerModelProcessor } from '@/lib/upload/server-file-processor'

export async function POST(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { supabase } = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId } = params

    const { data: fileRecord, error: fileError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (fileError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (fileRecord.status === 'analyzing') {
      return NextResponse.json({ error: 'File is already being analyzed' }, { status: 409 })
    }

    if (fileRecord.status === 'analyzed') {
      return NextResponse.json({
        success: true,
        analysis: fileRecord.analysis_data
      })
    }

    await supabase
      .from('uploaded_files')
      .update({ status: 'analyzing' })
      .eq('id', fileId)

    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('3d-models')
        .download(fileRecord.storage_path)

      if (downloadError || !fileData) {
        throw new Error('Failed to download file for analysis')
      }

      const fileBuffer = await fileData.arrayBuffer()
      let analysis

      if (fileRecord.file_type === '.stl') {
        analysis = await ServerModelProcessor.analyzeSTL(fileBuffer)
      } else if (fileRecord.file_type === '.obj') {
        const text = new TextDecoder().decode(fileBuffer)
        analysis = await ServerModelProcessor.analyzeOBJ(text)
      } else {
        throw new Error(`Unsupported file type for analysis: ${fileRecord.file_type}`)
      }

      const { error: updateError } = await supabase
        .from('uploaded_files')
        .update({
          status: 'analyzed',
          analysis_data: analysis
        })
        .eq('id', fileId)

      if (updateError) {
        throw new Error('Failed to save analysis results')
      }

      return NextResponse.json({
        success: true,
        analysis
      })

    } catch (analysisError) {
      await supabase
        .from('uploaded_files')
        .update({ status: 'error' })
        .eq('id', fileId)

      return NextResponse.json({
        error: 'Analysis failed',
        details: analysisError instanceof Error ? analysisError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
