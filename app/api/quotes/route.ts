import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        *,
        uploaded_files (
          id,
          original_filename,
          file_type
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (quotesError) {
      return NextResponse.json({ 
        error: 'Failed to fetch quotes', 
        details: quotesError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      quotes
    })

  } catch (error) {
    console.error('Quotes fetch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
