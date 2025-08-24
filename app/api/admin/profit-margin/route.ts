import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { 
  rateLimit, 
  createSecureResponse,
  logSecurityEvent
} from '@/lib/middleware/api-middleware'
import { API_CONFIG } from '@/lib/config/api'
import { randomUUID } from 'crypto'

const ProfitMarginSchema = z.object({
  profitMargin: z.number().min(0).max(1)
}).strict()

async function verifyAdminAccess(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    throw new Error('Admin access required')
  }

  return { user, profile }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('ADMIN')(request)
    if (!rateLimitResult.success) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        endpoint: '/api/admin/profit-margin',
        method: 'POST',
        requestId
      })
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '200',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '0'
          }
        }
      )
    }

    const supabase = await createServerClient()
    
    let user
    try {
      const adminCheck = await verifyAdminAccess(supabase)
      user = adminCheck.user
    } catch (error) {
      await logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS', {
        endpoint: '/api/admin/profit-margin',
        requestId
      })
      return createSecureResponse(
        { error: 'Admin access required' },
        403,
        requestId
      )
    }

    const body = await request.json()
    const validation = ProfitMarginSchema.safeParse(body)
    if (!validation.success) {
      return createSecureResponse(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        },
        400,
        requestId
      )
    }

    const { profitMargin } = validation.data

    const { error: updateError } = await supabase
      .from('business_settings')
      .upsert({
        key: 'default_profit_margin',
        value: profitMargin,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      await logSecurityEvent('DATABASE_ERROR', {
        endpoint: '/api/admin/profit-margin',
        error: updateError.message,
        requestId
      })
      return createSecureResponse(
        { error: 'Failed to update profit margin' },
        500,
        requestId
      )
    }

    return createSecureResponse(
      {
        success: true,
        profitMargin,
        message: `Profit margin updated to ${(profitMargin * 100).toFixed(1)}%`
      },
      200,
      requestId
    )

  } catch (error) {
    await logSecurityEvent('INTERNAL_ERROR', {
      endpoint: '/api/admin/profit-margin',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    })
    
    return createSecureResponse(
      { error: 'Internal server error' },
      500,
      requestId
    )
  }
}

export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('DEFAULT')(request)
    if (!rateLimitResult.success) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        endpoint: '/api/admin/profit-margin',
        method: 'GET',
        requestId
      })
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '0'
          }
        }
      )
    }

    const supabase = await createServerClient()
    
    const { data: setting } = await supabase
      .from('business_settings')
      .select('value')
      .eq('key', 'default_profit_margin')
      .single()

    const profitMargin = setting?.value || 0.35

    return createSecureResponse(
      {
        success: true,
        profitMargin,
        percentage: `${(profitMargin * 100).toFixed(1)}%`
      },
      200,
      requestId
    )

  } catch (error) {
    await logSecurityEvent('INTERNAL_ERROR', {
      endpoint: '/api/admin/profit-margin',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    })
    
    return createSecureResponse(
      { error: 'Internal server error' },
      500,
      requestId
    )
  }
}
