import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: locations, error } = await supabase
      .from('serviceable_locations')
      .select(`
        id,
        name,
        state,
        delivery_days,
        same_day_available,
        express_delivery_days,
        rush_delivery_days,
        shipping_cost,
        free_shipping_threshold,
        is_active,
        sort_order
      `)
      .eq('is_active', true)
      .order('sort_order')

    if (error) {
      console.error('Locations fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: locations || []
    })

  } catch (error) {
    console.error('Locations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
