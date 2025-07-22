import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { 
  rateLimit, 
  validateUUID,
  sanitizeInput,
  createSecureResponse,
  logSecurityEvent,
  getPagination
} from '@/lib/middleware/api-middleware'
import { API_CONFIG } from '@/lib/config/api'
import { randomUUID } from 'crypto'

const UsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional(),
  role: z.enum(['user', 'admin']).optional(),
  search: z.string().max(100).optional().transform(val => val ? sanitizeInput(val) : val),
  sort_by: z.enum(['created_at', 'email', 'last_login']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
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

export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('ADMIN')(request)
    if (!rateLimitResult.success) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        endpoint: '/api/admin/users',
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
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '200',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '0'
          }
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const validation = UsersQuerySchema.safeParse(Object.fromEntries(searchParams))
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

    const supabase = await createServerClient()
    
    try {
      await verifyAdminAccess(supabase)
    } catch (error) {
      await logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS', {
        endpoint: '/api/admin/users',
        requestId
      })
      return createSecureResponse(
        { error: 'Admin access required' },
        403,
        requestId
      )
    }

    const { page, limit, status, role, search, sort_by, sort_order } = validation.data
    const { offset } = getPagination(new URLSearchParams(Object.entries({
      page: page.toString(),
      limit: limit.toString()
    })))

    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        is_admin,
        is_verified,
        avatar_url,
        phone,
        created_at,
        updated_at,
        last_sign_in_at
      `)

    if (status) {
      if (status === 'active') {
        query = query.eq('is_verified', true)
      } else if (status === 'pending') {
        query = query.eq('is_verified', false)
      }
    }

    if (role) {
      query = query.eq('is_admin', role === 'admin')
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1)

    const { data: users, error, count } = await query

    if (error) {
      await logSecurityEvent('DATABASE_ERROR', {
        endpoint: '/api/admin/users',
        error: error.message,
        requestId
      })
      return createSecureResponse(
        { error: 'Failed to fetch users' },
        500,
        requestId
      )
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)

    return createSecureResponse(
      {
        success: true,
        data: users || [],
        meta: {
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      },
      200,
      requestId
    )

  } catch (error) {
    await logSecurityEvent('INTERNAL_ERROR', {
      endpoint: '/api/admin/users',
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
