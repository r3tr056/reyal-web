import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { profitMargin } = body

    if (typeof profitMargin !== 'number' || profitMargin < 0 || profitMargin > 1) {
      return NextResponse.json({ 
        error: 'Profit margin must be a number between 0 and 1 (0% to 100%)' 
      }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('business_settings')
      .upsert({
        key: 'default_profit_margin',
        value: profitMargin,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update profit margin', 
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profitMargin,
      message: `Profit margin updated to ${(profitMargin * 100).toFixed(1)}%`
    })

  } catch (error) {
    console.error('Profit margin update error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    const { data: setting } = await supabase
      .from('business_settings')
      .select('value')
      .eq('key', 'default_profit_margin')
      .single()

    const profitMargin = setting?.value || 0.35

    return NextResponse.json({
      success: true,
      profitMargin,
      percentage: `${(profitMargin * 100).toFixed(1)}%`
    })

  } catch (error) {
    console.error('Profit margin fetch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
