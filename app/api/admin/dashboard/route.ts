import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { 
  rateLimit, 
  sanitizeInput,
  createSecureResponse,
  logSecurityEvent,
  createRateLimitResponse
} from '@/lib/middleware/api-middleware'
import { API_CONFIG } from '@/lib/config/api'
import { randomUUID } from 'crypto'

const DashboardQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d')
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

function calculateDateRange(period: string) {
  const endDate = new Date()
  const startDate = new Date()
  
  switch (period) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7)
      break
    case '30d':
      startDate.setDate(endDate.getDate() - 30)
      break
    case '90d':
      startDate.setDate(endDate.getDate() - 90)
      break
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1)
      break
  }
  
  return { startDate, endDate }
}

function generateMockDashboardData(period: string) {
  const { startDate, endDate } = calculateDateRange(period)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  const baseOrders = Math.floor(daysDiff * 2.5)
  const baseRevenue = baseOrders * 125.50
  
  const summary = {
    totalRevenue: baseRevenue,
    totalOrders: baseOrders,
    completedOrders: Math.floor(baseOrders * 0.75),
    pendingOrders: Math.floor(baseOrders * 0.15),
    totalPayments: baseRevenue * 0.85,
    outstandingInvoices: Math.floor(baseOrders * 0.1),
    overdueinvoices: Math.floor(baseOrders * 0.05),
    averageOrderValue: baseRevenue / baseOrders
  }

  const dailyRevenue = []
  for (let i = Math.min(6, daysDiff - 1); i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    const dayRevenue = Math.floor(Math.random() * 500) + 200
    const dayOrders = Math.floor(dayRevenue / 125) + Math.floor(Math.random() * 3)
    
    dailyRevenue.push({
      date: date.toISOString().split('T')[0],
      revenue: dayRevenue,
      orders: dayOrders
    })
  }

  const statusDistribution = {
    pending: summary.pendingOrders,
    confirmed: Math.floor(baseOrders * 0.05),
    in_production: Math.floor(baseOrders * 0.05),
    shipped: Math.floor(baseOrders * 0.1),
    delivered: summary.completedOrders,
    cancelled: Math.floor(baseOrders * 0.05)
  }

  const recentOrders = []
  for (let i = 0; i < 10; i++) {
    const statuses = ['pending', 'confirmed', 'shipped', 'delivered']
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const amount = Math.floor(Math.random() * 300) + 50
    
    recentOrders.push({
      id: `ord_${Date.now()}_${i}`,
      status,
      total_amount: amount,
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      profiles: {
        full_name: `Customer ${i + 1}`,
        email: `customer${i + 1}@example.com`
      },
      order_items: [
        { quantity: Math.floor(Math.random() * 3) + 1 }
      ]
    })
  }

  return {
    summary,
    charts: {
      dailyRevenue,
      statusDistribution
    },
    recentOrders,
    lowStockMaterials: [],
    period
  }
}

export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('ADMIN')(request)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, requestId)
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams)
    
    const validatedQuery = DashboardQuerySchema.parse(queryParams)
    const { period } = validatedQuery

    const supabase = await createServerClient()
    const { user } = await verifyAdminAccess(supabase)

    await logSecurityEvent('admin_dashboard_access', {
      userId: user.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { period }
    })

    const { startDate, endDate } = calculateDateRange(period)

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, created_at, is_verified')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (profilesError) {
      throw new Error(`Database error: ${profilesError.message}`)
    }

    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('id, file_size, created_at, is_analyzed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (filesError) {
      throw new Error(`Database error: ${filesError.message}`)
    }

    const totalUsers = profiles?.length || 0
    const totalFiles = files?.length || 0
    const totalFileSize = files?.reduce((sum, file) => sum + file.file_size, 0) || 0
    const analyzedFiles = files?.filter(f => f.is_analyzed).length || 0

    const mockData = generateMockDashboardData(period)
    
    const responseData = {
      ...mockData,
      realData: {
        totalUsers,
        totalFiles,
        totalFileSize,
        analyzedFiles,
        analysisRate: totalFiles > 0 ? (analyzedFiles / totalFiles) * 100 : 0
      }
    }

    return createSecureResponse({
      success: true,
      data: responseData
    }, 200, requestId)

  } catch (error) {
    await logSecurityEvent('admin_dashboard_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return createSecureResponse({ error: 'Unauthorized' }, 401, requestId)
      }
      if (error.message === 'Admin access required') {
        return createSecureResponse({ error: 'Admin access required' }, 403, requestId)
      }
      if (error.message.startsWith('Database error:')) {
        return createSecureResponse({ error: 'Database error occurred' }, 500, requestId)
      }
    }

    return createSecureResponse({ error: 'Internal server error' }, 500, requestId)
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('ADMIN')(request)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, requestId)
    }

    const supabase = await createServerClient()
    const { user } = await verifyAdminAccess(supabase)

    const body = await request.json()
    const { action, targetIds, payload } = body

    if (!action || !targetIds || !Array.isArray(targetIds)) {
      return createSecureResponse({ 
        error: 'Action and targetIds are required' 
      }, 400, requestId)
    }

    await logSecurityEvent('admin_bulk_action', {
      userId: user.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { action, targetCount: targetIds.length }
    })

    const results = []

    for (const targetId of targetIds) {
      try {
        switch (action) {
          case 'verifyUser':
            const { error: verifyError } = await supabase
              .from('profiles')
              .update({ is_verified: true })
              .eq('id', targetId)

            if (verifyError) {
              results.push({ targetId, success: false, error: verifyError.message })
            } else {
              results.push({ targetId, success: true, action: 'verified' })
            }
            break

          case 'deleteFile':
            const { error: deleteError } = await supabase
              .from('files')
              .delete()
              .eq('id', targetId)

            if (deleteError) {
              results.push({ targetId, success: false, error: deleteError.message })
            } else {
              results.push({ targetId, success: true, action: 'deleted' })
            }
            break

          default:
            results.push({ targetId, success: false, error: 'Unknown action' })
        }
      } catch (error) {
        results.push({ 
          targetId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return createSecureResponse({
      success: true,
      message: `Bulk operation completed: ${successCount} successful, ${failureCount} failed`,
      results
    }, 200, requestId)

  } catch (error) {
    await logSecurityEvent('admin_bulk_action_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return createSecureResponse({ error: 'Unauthorized' }, 401, requestId)
      }
      if (error.message === 'Admin access required') {
        return createSecureResponse({ error: 'Admin access required' }, 403, requestId)
      }
    }

    return createSecureResponse({ error: 'Internal server error' }, 500, requestId)
  }
}
