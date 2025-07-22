import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: colors, error } = await supabase
      .from('available_colors')
      .select(`
        id,
        name,
        hex_code,
        material_compatibility,
        additional_cost,
        is_available,
        sort_order
      `)
      .eq('is_available', true)
      .order('sort_order')

    if (error) {
      console.error('Colors fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch colors' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: colors || []
    })

  } catch (error) {
    console.error('Colors API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
