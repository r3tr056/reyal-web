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

const PrintersQuerySchema = z.object({
  active_only: z.enum(['true', 'false']).default('true'),
  sort_by: z.enum(['name', 'created_at', 'hourly_rate']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
}).strict()

export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('DEFAULT')(request)
    if (!rateLimitResult.success) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        endpoint: '/api/printers',
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

    const { searchParams } = new URL(request.url)
    const validation = PrintersQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!validation.success) {
      return createSecureResponse(
        { 
          error: 'Invalid query parameters',
          details: validation.error.errors
        },
        400,
        requestId
      )
    }

    const { active_only, sort_by, sort_order } = validation.data

    const supabase = await createServerClient()

    let query = supabase
      .from('printers')
      .select(`
        id,
        name,
        description,
        model,
        max_dimensions,
        layer_heights,
        supported_materials,
        features,
        is_active,
        hourly_rate,
        setup_cost,
        created_at
      `)

    if (active_only === 'true') {
      query = query.eq('is_active', true)
    }

    query = query.order(sort_by, { ascending: sort_order === 'asc' })

    const { data: printers, error } = await query

    if (error) {
      await logSecurityEvent('DATABASE_ERROR', {
        endpoint: '/api/printers',
        error: error.message,
        requestId
      })
      return createSecureResponse(
        { error: 'Failed to fetch printers' },
        500,
        requestId
      )
    }

    return createSecureResponse(
      { 
        success: true, 
        data: printers || [],
        meta: {
          count: printers?.length || 0
        }
      },
      200,
      requestId
    )

  } catch (error) {
    await logSecurityEvent('INTERNAL_ERROR', {
      endpoint: '/api/printers',
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