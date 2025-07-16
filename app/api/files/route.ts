import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: files, error: filesError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (filesError) {
      return NextResponse.json({ 
        error: 'Failed to fetch files', 
        details: filesError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      files
    })

  } catch (error) {
    console.error('Files fetch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
