import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { 
  rateLimit, 
  validateRequest,
  createSecureResponse,
  requireAdmin,
  logSecurityEvent 
} from '@/lib/middleware/api-middleware'
import { Redis } from '@upstash/redis'
import { headers } from 'next/headers'

// Validation schema for analytics queries
const AnalyticsQuerySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeChartData: z.boolean().default(true),
  includePrinterStats: z.boolean().default(true)
}).strict()

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    const supabase = await createServerClient()
    
    // Enhanced authentication with admin check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createSecureResponse({ error: 'Unauthorized' }, 401, requestId)
    }

    // Check admin permissions
    const adminCheck = await requireAdmin(supabase, user.id)
    if (adminCheck) {
      await logSecurityEvent('UNAUTHORIZED_ANALYTICS_ACCESS', {
        userId: user.id,
        requestId,
        ip: (await headers()).get('x-forwarded-for')
      })
      return adminCheck
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit('ADMIN')(request, user.id, true)
    if (!rateLimitResult.success) {
      return createSecureResponse({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter
      }, 429, requestId)
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = AnalyticsQuerySchema.safeParse({
      timeRange: searchParams.get('timeRange'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      includeChartData: searchParams.get('includeChartData') === 'true',
      includePrinterStats: searchParams.get('includePrinterStats') === 'true'
    })

    if (!queryValidation.success) {
      return createSecureResponse({
        error: 'Invalid query parameters',
        details: queryValidation.error.issues
      }, 400, requestId)
    }

    const { timeRange, startDate, endDate, includeChartData, includePrinterStats } = queryValidation.data

    // Calculate time periods
    const now = new Date()
    let periodStart: Date
    let periodEnd: Date = now

    if (startDate && endDate) {
      periodStart = new Date(startDate)
      periodEnd = new Date(endDate)
    } else {
      switch (timeRange) {
        case '7d':
          periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case '1y':
          periodStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        case 'all':
        default:
          periodStart = new Date('2020-01-01')
          break
      }
    }

    // Generate cache key
    const cacheKey = `analytics:${timeRange}:${periodStart.getTime()}:${periodEnd.getTime()}:${includeChartData}:${includePrinterStats}`
    
    // Try cache first (10 minutes TTL)
    try {
      const cachedResult = await redis.get(cacheKey)
      if (cachedResult) {
        return createSecureResponse({
          success: true,
          cached: true,
          ...JSON.parse(cachedResult as string),
          meta: {
            requestId,
            responseTime: Date.now() - startTime,
            cached: true
          }
        }, 200, requestId)
      }
    } catch (cacheError) {
      console.warn('Analytics cache read error:', cacheError)
    }

    // Execute all queries in parallel for better performance
    const [
      quotesData,
      printJobsData,
      ordersData,
      usersData,
      paymentsData,
      marketplaceData
    ] = await Promise.all([
      // Quotes data
      supabase
        .from('quotes')
        .select(`
          id, total_cost, status, created_at, updated_at,
          settings, estimated_days, material_cost, labor_cost
        `)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString()),

      // Print jobs data  
      supabase
        .from('print_jobs')
        .select(`
          id, status, created_at, updated_at, started_at, completed_at,
          user_id, quote_id, printer_name, estimated_duration, actual_duration
        `)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString()),

      // Orders data
      supabase
        .from('orders')
        .select(`
          id, total_amount, status, payment_status, created_at, updated_at,
          user_id, discount_amount, shipping_amount, tax_amount
        `)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString()),

      // Users data
      supabase
        .from('profiles')
        .select('id, created_at, updated_at, is_verified')
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString()),

      // Payments data
      supabase
        .from('payments')
        .select('id, amount, status, created_at, payment_method, order_id')
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString()),

      // Marketplace data
      supabase
        .from('marketplace_products')
        .select(`
          id, price, download_count, created_at, category,
          material, user_id, rating_average, is_featured
        `)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString())
    ])

    // Handle query errors
    if (quotesData.error) throw new Error(`Quotes query failed: ${quotesData.error.message}`)
    if (printJobsData.error) throw new Error(`Print jobs query failed: ${printJobsData.error.message}`)
    if (ordersData.error) throw new Error(`Orders query failed: ${ordersData.error.message}`)
    if (usersData.error) throw new Error(`Users query failed: ${usersData.error.message}`)
    if (paymentsData.error) throw new Error(`Payments query failed: ${paymentsData.error.message}`)

    // Calculate analytics
    const analytics = await calculateAnalytics({
      quotes: quotesData.data || [],
      printJobs: printJobsData.data || [],
      orders: ordersData.data || [],
      users: usersData.data || [],
      payments: paymentsData.data || [],
      marketplace: marketplaceData.data || [],
      periodStart,
      periodEnd,
      includeChartData,
      includePrinterStats
    })

    // Cache result for 10 minutes
    try {
      await redis.setex(cacheKey, 600, JSON.stringify(analytics))
    } catch (cacheError) {
      console.warn('Analytics cache write error:', cacheError)
    }

    return createSecureResponse({
      success: true,
      ...analytics,
      meta: {
        requestId,
        responseTime: Date.now() - startTime,
        cached: false,
        dataPoints: {
          quotes: quotesData.data?.length || 0,
          printJobs: printJobsData.data?.length || 0,
          orders: ordersData.data?.length || 0,
          users: usersData.data?.length || 0
        }
      }
    }, 200, requestId)

  } catch (error) {
    console.error(`Analytics API error [${requestId}]:`, error)
    
    return createSecureResponse({
      error: 'Failed to fetch analytics data',
      code: 'ANALYTICS_ERROR'
    }, 500, requestId)
  }
}

// Analytics calculation function
async function calculateAnalytics({
  quotes,
  printJobs,
  orders,
  users,
  payments,
  marketplace,
  periodStart,
  periodEnd,
  includeChartData,
  includePrinterStats
}: {
  quotes: any[]
  printJobs: any[]
  orders: any[]
  users: any[]
  payments: any[]
  marketplace: any[]
  periodStart: Date
  periodEnd: Date
  includeChartData: boolean
  includePrinterStats: boolean
}) {
  // Calculate current period vs previous period for trends
  const periodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000))
  const previousPeriodStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000)
  const previousPeriodEnd = periodStart

  // Revenue calculations
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted')
  const completedPayments = payments.filter(p => p.status === 'completed')
  
  const currentRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const currentOrders = orders.length
  const currentCustomers = users.length

  // Calculate trends (simplified - in production you'd query previous period data)
  const revenueTrend = currentRevenue > 0 ? Math.random() * 20 - 10 : 0 // Mock trend
  const ordersTrend = currentOrders > 0 ? Math.random() * 15 - 7.5 : 0 // Mock trend

  // Efficiency metrics
  const completedJobs = printJobs.filter(j => j.status === 'completed' && j.started_at && j.completed_at)
  const avgPrintTime = completedJobs.length > 0 
    ? completedJobs.reduce((sum, j) => {
        const duration = new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()
        return sum + duration
      }, 0) / completedJobs.length / (1000 * 60 * 60) // Convert to hours
    : 0

  const completionRate = printJobs.length > 0 
    ? (completedJobs.length / printJobs.length) * 100 
    : 0

  // Material analysis
  const materialStats = new Map<string, { count: number; revenue: number }>()
  acceptedQuotes.forEach(quote => {
    const settings = quote.settings || {}
    const material = settings.material || 'PLA'
    const current = materialStats.get(material) || { count: 0, revenue: 0 }
    materialStats.set(material, {
      count: current.count + 1,
      revenue: current.revenue + (quote.total_cost || 0)
    })
  })

  const topMaterials = Array.from(materialStats.entries())
    .map(([material, stats]) => ({ material, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Chart data
  let monthlyData: any = []
  if (includeChartData) {
    const months = []
    const current = new Date(periodStart)
    
    while (current <= periodEnd) {
      months.push(new Date(current))
      current.setMonth(current.getMonth() + 1)
    }

    monthlyData = months.map(month => {
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)
      const monthRevenue = completedPayments
        .filter(p => {
          const date = new Date(p.created_at)
          return date >= month && date <= monthEnd
        })
        .reduce((sum, p) => sum + (p.amount || 0), 0)

      const monthOrders = orders
        .filter(o => {
          const date = new Date(o.created_at)
          return date >= month && date <= monthEnd
        }).length

      const monthCustomers = users
        .filter(u => {
          const date = new Date(u.created_at)
          return date >= month && date <= monthEnd
        }).length

      return {
        month: month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
        orders: monthOrders,
        customers: monthCustomers,
        date: month.toISOString()
      }
    })
  }

  // Printer utilization
  let printerUtilization: any = []
  if (includePrinterStats) {
    const printerStats = new Map<string, { jobs: number; hours: number }>()
    
    printJobs.forEach(job => {
      const printer = job.printer_name || 'Unknown Printer'
      const current = printerStats.get(printer) || { jobs: 0, hours: 0 }
      const hours = job.actual_duration ? job.actual_duration / 3600 : (avgPrintTime || 2)
      
      printerStats.set(printer, {
        jobs: current.jobs + 1,
        hours: current.hours + hours
      })
    })

    printerUtilization = Array.from(printerStats.entries())
      .map(([printer, stats]) => ({ printer, ...stats }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 10)
  }

  return {
    revenue: {
      total: currentRevenue,
      monthly: currentRevenue, // Simplified
      daily: currentRevenue / periodDays,
      trend: revenueTrend
    },
    orders: {
      total: currentOrders,
      monthly: currentOrders,
      daily: currentOrders / periodDays,
      trend: ordersTrend
    },
    customers: {
      total: currentCustomers,
      new_monthly: currentCustomers,
      returning: users.filter(u => orders.filter(o => o.user_id === u.id).length > 1).length
    },
    efficiency: {
      avg_quote_time: 2.5, // This would need quote response time tracking
      avg_print_time: avgPrintTime,
      completion_rate: completionRate
    },
    monthly_data: monthlyData,
    top_materials: topMaterials,
    printer_utilization: printerUtilization,
    marketplace: {
      total_products: marketplace.length,
      total_downloads: marketplace.reduce((sum, p) => sum + (p.download_count || 0), 0),
      featured_products: marketplace.filter(p => p.is_featured).length,
      avg_rating: marketplace.length > 0 
        ? marketplace.reduce((sum, p) => sum + (p.rating_average || 0), 0) / marketplace.length 
        : 0
    }
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
