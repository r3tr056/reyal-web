import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { supabase } = createClient(request)

    const { data: materials, error } = await supabase
      .from('materials')
      .select('*')
      .eq('available', true)
      .order('name')

    if (error) {
      console.error('Error fetching materials:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch materials' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      materials: materials || []
    })

  } catch (error) {
    console.error('Materials API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
