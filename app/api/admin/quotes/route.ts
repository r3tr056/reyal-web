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

const QuotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional(),
  customer_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  min_amount: z.coerce.number().min(0).optional(),
  max_amount: z.coerce.number().min(0).optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'total_amount', 'expires_at']).default('created_at'),
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
        endpoint: '/api/admin/quotes',
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
    const validation = QuotesQuerySchema.safeParse(Object.fromEntries(searchParams))
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
        endpoint: '/api/admin/quotes',
        requestId
      })
      return createSecureResponse(
        { error: 'Admin access required' },
        403,
        requestId
      )
    }

    const { 
      page, 
      limit, 
      status, 
      customer_id, 
      date_from, 
      date_to, 
      min_amount, 
      max_amount, 
      sort_by, 
      sort_order 
    } = validation.data

    const { offset } = getPagination(new URLSearchParams(Object.entries({
      page: page.toString(),
      limit: limit.toString()
    })))

    const mockQuotes = [
      {
        id: 'quote_001',
        quote_number: 'QUO-2024-000001',
        customer_id: 'user_001',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        status: 'pending',
        total_amount: 1250.00,
        currency: 'INR',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [
          {
            description: '3D Printed Model - Complex Geometry',
            quantity: 1,
            unit_price: 1000.00,
            total: 1000.00
          },
          {
            description: 'Express Shipping',
            quantity: 1,
            unit_price: 250.00,
            total: 250.00
          }
        ]
      },
      {
        id: 'quote_002',
        quote_number: 'QUO-2024-000002',
        customer_id: 'user_002',
        customer_name: 'Jane Smith',
        customer_email: 'jane@example.com',
        status: 'approved',
        total_amount: 750.00,
        currency: 'INR',
        expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            description: '3D Printed Prototype',
            quantity: 2,
            unit_price: 300.00,
            total: 600.00
          },
          {
            description: 'Standard Shipping',
            quantity: 1,
            unit_price: 150.00,
            total: 150.00
          }
        ]
      }
    ]

    let filteredQuotes = mockQuotes

    if (status) {
      filteredQuotes = filteredQuotes.filter(quote => quote.status === status)
    }

    if (customer_id) {
      filteredQuotes = filteredQuotes.filter(quote => quote.customer_id === customer_id)
    }

    if (min_amount !== undefined) {
      filteredQuotes = filteredQuotes.filter(quote => quote.total_amount >= min_amount)
    }

    if (max_amount !== undefined) {
      filteredQuotes = filteredQuotes.filter(quote => quote.total_amount <= max_amount)
    }

    if (date_from) {
      filteredQuotes = filteredQuotes.filter(quote => 
        new Date(quote.created_at) >= new Date(date_from)
      )
    }

    if (date_to) {
      filteredQuotes = filteredQuotes.filter(quote => 
        new Date(quote.created_at) <= new Date(date_to)
      )
    }

    filteredQuotes.sort((a, b) => {
      const aValue = sort_by === 'total_amount' ? a.total_amount : new Date(a[sort_by as keyof typeof a] as string).getTime()
      const bValue = sort_by === 'total_amount' ? b.total_amount : new Date(b[sort_by as keyof typeof b] as string).getTime()
      
      if (sort_order === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    const totalCount = filteredQuotes.length
    const paginatedQuotes = filteredQuotes.slice(offset, offset + limit)
    const totalPages = Math.ceil(totalCount / limit)

    const analytics = {
      total_quotes: totalCount,
      pending_quotes: filteredQuotes.filter(q => q.status === 'pending').length,
      approved_quotes: filteredQuotes.filter(q => q.status === 'approved').length,
      rejected_quotes: filteredQuotes.filter(q => q.status === 'rejected').length,
      expired_quotes: filteredQuotes.filter(q => q.status === 'expired').length,
      total_value: filteredQuotes.reduce((sum, quote) => sum + quote.total_amount, 0),
      average_quote_value: totalCount > 0 ? filteredQuotes.reduce((sum, quote) => sum + quote.total_amount, 0) / totalCount : 0
    }

    return createSecureResponse(
      {
        success: true,
        data: paginatedQuotes,
        analytics,
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
      endpoint: '/api/admin/quotes',
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
