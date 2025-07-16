import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    // Get current user from request headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const isAdmin = request.headers.get('x-user-admin') === 'true'
    
    if (!userId || !isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Verify admin status from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, is_verified, email, full_name')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin verification failed' },
        { status: 403 }
      )
    }

    // Return admin user data
    return NextResponse.json({
      success: true,
      admin: {
        id: userId,
        email: profile.email,
        full_name: profile.full_name,
        is_verified: profile.is_verified,
        verified_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Admin verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}