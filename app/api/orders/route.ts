import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Decimal } from 'decimal.js'
import { createServerClient } from '@/lib/supabase/server'
import { 
  rateLimit, 
  validateUUID,
  sanitizeInput,
  createSecureResponse,
  logSecurityEvent,
  getPagination, 
  createRateLimitResponse
} from '@/lib/middleware/api-middleware'
import { API_CONFIG } from '@/lib/config/api'

// Constants for security and business rules
const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20
const MAX_ORDER_VALUE = 1000000
const MIN_ORDER_VALUE = 1
const FINANCIAL_PRECISION = 2
const VALID_CURRENCIES = ['INR', 'USD', 'EUR'] as const
const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const
const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const
const TIER_1_CITIES = ['mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'pune', 'ahmedabad']
const TIER_2_CITIES = ['jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam']

const OrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  status: z.enum(VALID_STATUSES).optional(),
  payment_status: z.enum(VALID_PAYMENT_STATUSES).optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'total_amount']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
}).strict()

const ShippingAddressSchema = z.object({
  name: z.string().min(2).max(100).transform(sanitizeInput),
  phone: z.string().regex(/^[+]?[\d\s\-()]{10,15}$/, 'Invalid phone format'),
  address_line_1: z.string().min(5).max(200).transform(sanitizeInput),
  address_line_2: z.string().max(200).optional().transform(val => val ? sanitizeInput(val) : val),
  city: z.string().min(2).max(50).transform(sanitizeInput),
  state: z.string().min(2).max(50).transform(sanitizeInput),
  postal_code: z.string().regex(/^[0-9]{6}$/, 'Invalid postal code'),
  country: z.string().length(2).default('IN')
}).strict()

const OrderCreateSchema = z.object({
  shipping_address: ShippingAddressSchema,
  payment_method: z.enum(['cod', 'online', 'upi', 'card']),
  notes: z.string().max(500).optional().transform(val => val ? sanitizeInput(val) : val),
  customer_notes: z.string().max(1000).optional().transform(val => val ? sanitizeInput(val) : val),
  currency_code: z.enum(VALID_CURRENCIES).default('INR'),
  exchange_rate: z.number().min(0.01).max(1000).default(1.0),
  promotional_code: z.string().max(20).optional().transform(val => val ? sanitizeInput(val) : val)
}).strict()

interface OrderFinancialSummary {
  subtotal: string
  discount: string
  tax: string
  shipping: string
  total: string
}

interface AuditContext {
  userId: string
  userEmail: string
  ipAddress: string
  userAgent: string
  timestamp: string
  requestId: string
}

interface DeliveryGroup {
  items: any[]
  deliveryDate: Date
  estimatedCost: number
}


export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    const supabase = await createServerClient()
    
    // Enhanced authentication with session validation
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || !user.email_confirmed_at) {
      return createSecureResponse({ error: 'Unauthorized' }, 401, requestId)
    }

    // Create audit context
    const auditContext: AuditContext = {
      userId: user.id,
      userEmail: user.email || 'unknown',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      requestId
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit('DEFAULT')(request, user.id)
    const rateLimitResponse = await createRateLimitResponse(rateLimitResult, requestId)
    if (rateLimitResponse) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', auditContext)
      return rateLimitResponse
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = OrderQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      payment_status: searchParams.get('payment_status'),
      sort_by: searchParams.get('sort_by'),
      sort_order: searchParams.get('sort_order')
    })

    if (!queryValidation.success) {
      return createSecureResponse({
        error: 'Invalid query parameters',
        details: queryValidation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, 400, requestId)
    }

    const { page, limit, status, payment_status, sort_by, sort_order } = queryValidation.data
    const offset = (page - 1) * limit

    // Build secure query with parameterized filters
    const { data: ordersResult, error: ordersError } = await supabase
      .rpc('get_user_orders_paginated', {
        p_user_id: user.id,
        p_limit: limit,
        p_offset: offset,
        p_status_filter: status,
        p_payment_status_filter: payment_status,
        p_sort_by: sort_by,
        p_sort_order: sort_order
      })

    if (ordersError) {
      console.error(`Orders fetch error [${requestId}]:`, ordersError)
      return createSecureResponse({
        error: 'Unable to retrieve orders',
        code: 'ORDERS_FETCH_FAILED'
      }, 500, requestId)
    }

    const { orders, total_count } = ordersResult

    // Calculate financial summaries with precision
    const ordersWithFinancials = orders.map((order: any) => ({
      ...order,
      financial_summary: calculateOrderFinancialSummary(order),
      // Remove sensitive fields for list view
      internal_notes: undefined,
      business_notes: undefined,
      accounting_entries: undefined
    }))

    // Log successful access
    await supabase
      .from('audit_logs')
      .insert({
        action: 'ORDERS_LIST',
        table_name: 'orders',
        user_id: user.id,
        ip_address: auditContext.ipAddress,
        user_agent: auditContext.userAgent,
        metadata: {
          request_id: requestId,
          page,
          limit,
          total_results: orders.length,
          filters: { status, payment_status },
          response_time: Date.now() - startTime
        }
      })

    return createSecureResponse({
      success: true,
      orders: ordersWithFinancials,
      pagination: {
        page,
        limit,
        total: total_count,
        totalPages: Math.ceil(total_count / limit),
        hasMore: orders.length === limit,
        hasNextPage: offset + limit < total_count,
        hasPreviousPage: page > 1
      },
      meta: {
        request_id: requestId,
        response_time: Date.now() - startTime,
        filters_applied: { status, payment_status, sort_by, sort_order }
      }
    }, 200, requestId)

  } catch (error: any) {
    console.error(`Orders GET error [${requestId}]:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    return createSecureResponse({
      error: 'Unable to retrieve orders',
      code: 'ORDERS_LIST_FAILED'
    }, 500, requestId)
  }
}

// POST /api/orders - Enhanced with atomic transactions and validation
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    const supabase = await createServerClient()
    
    // Enhanced authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || !user.email_confirmed_at) {
      return createSecureResponse({ error: 'Unauthorized' }, 401, requestId)
    }

    // Create audit context
    const auditContext: AuditContext = {
      userId: user.id,
      userEmail: user.email || 'unknown',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      requestId
    }

    // Strict rate limiting for order creation
    const rateLimitResult = await rateLimit('DEFAULT')(request, user.id, true)
    const rateLimitResponse = await createRateLimitResponse(rateLimitResult, requestId)
    if (rateLimitResponse) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED_CREATE', auditContext)
      return rateLimitResponse
    }

    // Parse and validate request body
    let body: any
    try {
      const rawBody = await request.text()
      body = JSON.parse(rawBody)
      
      // Check for suspicious payload size
      if (rawBody.length > 100000) { // 100KB limit
        await logSecurityEvent('SUSPICIOUS_PAYLOAD_SIZE', {
          ...auditContext,
          payloadSize: rawBody.length
        })
        return createSecureResponse({ error: 'Payload too large' }, 413, requestId)
      }
    } catch (parseError) {
      return createSecureResponse({ error: 'Invalid JSON format' }, 400, requestId)
    }

    // Comprehensive input validation
    const validation = OrderCreateSchema.safeParse(body)
    if (!validation.success) {
      return createSecureResponse({
        error: 'Invalid input data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, 400, requestId)
    }

    const orderData = validation.data

    // Check user's order creation limits (prevent abuse)
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (recentOrders && recentOrders.length >= 10) { // Max 10 orders per day
      await logSecurityEvent('ORDER_CREATION_LIMIT_EXCEEDED', auditContext)
      return createSecureResponse({
        error: 'Daily order creation limit exceeded',
        code: 'ORDER_LIMIT_EXCEEDED'
      }, 429, requestId)
    }

    // Execute atomic order creation using database function
    const { data: orderResult, error: orderError } = await supabase
      .rpc('create_order_atomic', {
        p_user_id: user.id,
        p_order_data: orderData,
        p_audit_context: auditContext,
        p_request_id: requestId
      })

    if (orderError) {
      if (orderError.code === 'P0001') {
        return createSecureResponse({ error: 'Cart is empty' }, 400, requestId)
      }
      if (orderError.code === 'P0002') {
        return createSecureResponse({ error: 'Invalid cart items' }, 400, requestId)
      }
      if (orderError.code === 'P0003') {
        return createSecureResponse({
          error: 'Order value exceeds limits',
          details: orderError.message
        }, 400, requestId)
      }
      throw orderError
    }

    const { 
      order, 
      financial_summary, 
      order_items_count,
      estimated_delivery_groups 
    } = orderResult

    // Log successful order creation
    await supabase
      .from('audit_logs')
      .insert({
        action: 'ORDER_CREATE',
        table_name: 'orders',
        record_id: order.id,
        user_id: user.id,
        ip_address: auditContext.ipAddress,
        user_agent: auditContext.userAgent,
        new_values: orderData,
        metadata: {
          request_id: requestId,
          order_number: order.order_number,
          total_amount: order.total_amount,
          items_count: order_items_count,
          response_time: Date.now() - startTime
        }
      })

    return createSecureResponse({
      success: true,
      order: {
        ...order,
        order_items_count,
        financial_summary,
        delivery_info: {
          estimated_delivery_groups,
          total_packages: estimated_delivery_groups.length
        }
      },
      audit: {
        created_by: {
          id: user.id,
          email: user.email
        },
        timestamp: auditContext.timestamp,
        request_id: requestId
      },
      message: 'Order created successfully'
    }, 201, requestId)

  } catch (error: any) {
    console.error(`Order CREATE error [${requestId}]:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    return createSecureResponse({
      error: 'Unable to create order',
      code: 'ORDER_CREATE_FAILED'
    }, 500, requestId)
  }
}

// Enhanced helper functions with proper validation and error handling

function calculateOrderFinancialSummary(order: any): OrderFinancialSummary {
  try {
    // Use Decimal.js for precise calculations
    const subtotal = new Decimal(order.subtotal_amount || 0)
    const discount = new Decimal(order.discount_amount || 0)
    const tax = new Decimal(order.tax_amount || 0)
    const shipping = new Decimal(order.shipping_amount || 0)
    const total = new Decimal(order.total_amount || 0)

    return {
      subtotal: subtotal.toFixed(FINANCIAL_PRECISION),
      discount: discount.toFixed(FINANCIAL_PRECISION),
      tax: tax.toFixed(FINANCIAL_PRECISION),
      shipping: shipping.toFixed(FINANCIAL_PRECISION),
      total: total.toFixed(FINANCIAL_PRECISION)
    }
  } catch (error) {
    console.error('Error calculating financial summary:', error)
    return {
      subtotal: '0.00',
      discount: '0.00',
      tax: '0.00',
      shipping: '0.00',
      total: '0.00'
    }
  }
}

function generateSecureOrderNumber(): string {
  const date = new Date()
  const dateString = date.toISOString().slice(0, 10).replace(/-/g, '')
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = crypto.randomUUID().slice(-8).toUpperCase()
  return `ORD${dateString}-${timestamp}-${random}`
}

function calculateEstimatedDelivery(cartItems: any[]): string {
  try {
    if (!cartItems || cartItems.length === 0) {
      throw new Error('No cart items provided')
    }

    // Find the maximum estimated days from all items
    const maxDays = Math.max(...cartItems.map(item => {
      const estimatedDays = item.quotes?.estimated_days || 3
      const complexityMultiplier = getComplexityMultiplier(item.quotes?.settings)
      return Math.ceil(estimatedDays * complexityMultiplier)
    }))
    
    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + maxDays + 2) // Add 2 buffer days
    
    return deliveryDate.toISOString()
  } catch (error) {
    console.error('Error calculating estimated delivery:', error)
    // Fallback to 7 days
    const fallbackDate = new Date()
    fallbackDate.setDate(fallbackDate.getDate() + 7)
    return fallbackDate.toISOString()
  }
}

function calculateShippingCostSecure(
  cartItems: any[], 
  shippingAddress: any, 
  shippingConfig: any
): { cost: number; groups: DeliveryGroup[] } {
  try {
    const baseCost = new Decimal(shippingConfig?.base_cost || 50)
    const weightMultiplier = new Decimal(shippingConfig?.weight_multiplier || 25)
    const packageGapDays = shippingConfig?.package_gap_days || 2

    const deliveryGroups = groupItemsByDeliveryDate(cartItems, packageGapDays)
    let totalCost = new Decimal(0)

    for (const group of deliveryGroups) {
      // Calculate weight for this package
      const packageWeight = group.items.reduce((sum, item) => {
        const volume = new Decimal(item.quotes?.volume || 1)
        const quantity = new Decimal(item.quantity || 1)
        const estimatedWeight = volume.mul(0.01).mul(quantity)
        return sum.plus(estimatedWeight)
      }, new Decimal(0))

      // Base cost per package
      let packageCost = baseCost

      // Add weight-based cost (after first kg is free)
      if (packageWeight.gt(1)) {
        const extraWeight = packageWeight.minus(1)
        packageCost = packageCost.plus(extraWeight.mul(weightMultiplier))
      }

      // Distance-based pricing with validation
      const cityTier: number = getCityTier(shippingAddress.city)
      const multipliers: Record<number, number> = { 1: 1.0, 2: 1.2, 3: 1.5 }
      const multiplier = multipliers[cityTier] || 2.0
      
      packageCost = packageCost.mul(multiplier)
      group.estimatedCost = packageCost.toNumber()
      totalCost = totalCost.plus(packageCost)
    }

    return {
      cost: Math.max(totalCost.toNumber(), baseCost.toNumber()), // Minimum base cost
      groups: deliveryGroups
    }
  } catch (error) {
    console.error('Error calculating shipping cost:', error)
    return {
      cost: 50, // Fallback cost
      groups: []
    }
  }
}

function groupItemsByDeliveryDate(cartItems: any[], gapDays: number = 2): DeliveryGroup[] {
  try {
    if (!cartItems || cartItems.length === 0) return []

    // Calculate completion dates for all items
    const itemsWithDates = cartItems.map(item => {
      const completionDate = new Date(calculateItemCompletion(item))
      return { ...item, completionDate }
    }).filter(item => item.completionDate instanceof Date && !isNaN(item.completionDate.getTime()))

    // Sort by completion date
    itemsWithDates.sort((a, b) => a.completionDate.getTime() - b.completionDate.getTime())

    const groups: DeliveryGroup[] = []
    let currentGroup: any[] = []
    let currentGroupDate: Date | null = null

    const gapMs = gapDays * 24 * 60 * 60 * 1000

    for (const item of itemsWithDates) {
      if (!currentGroupDate || 
          Math.abs(item.completionDate.getTime() - currentGroupDate.getTime()) <= gapMs) {
        // Add to current group
        currentGroup.push(item)
        currentGroupDate = currentGroupDate ? 
          new Date(Math.max(currentGroupDate.getTime(), item.completionDate.getTime())) : 
          item.completionDate
      } else {
        // Create new group
        if (currentGroup.length > 0 && currentGroupDate) {
          groups.push({
            items: [...currentGroup],
            deliveryDate: new Date(currentGroupDate.getTime()),
            estimatedCost: 0 // Will be calculated later
          })
        }
        currentGroup = [item]
        currentGroupDate = item.completionDate
      }
    }

    // Add the last group
    if (currentGroup.length > 0 && currentGroupDate) {
      groups.push({
        items: [...currentGroup],
        deliveryDate: new Date(currentGroupDate.getTime()),
        estimatedCost: 0
      })
    }

    return groups
  } catch (error) {
    console.error('Error grouping items by delivery date:', error)
    return []
  }
}

function getCityTier(city: string): number {
  try {
    if (!city || typeof city !== 'string') return 3
    
    const cityLower = city.toLowerCase().trim()
    
    if (TIER_1_CITIES.includes(cityLower)) return 1
    if (TIER_2_CITIES.includes(cityLower)) return 2
    return 3
  } catch (error) {
    console.error('Error determining city tier:', error)
    return 3 // Default to highest cost tier
  }
}

function calculateItemCompletion(item: any): string {
  try {
    // Calculate completion time based on print settings and complexity
    const baseTime = item.quotes?.estimated_days || 3
    const complexityMultiplier = getComplexityMultiplier(item.quotes?.settings)
    
    const completionDays = Math.ceil(baseTime * complexityMultiplier)
    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + completionDays)
    
    return completionDate.toISOString()
  } catch (error) {
    console.error('Error calculating item completion:', error)
    // Fallback to 5 days
    const fallbackDate = new Date()
    fallbackDate.setDate(fallbackDate.getDate() + 5)
    return fallbackDate.toISOString()
  }
}

function getComplexityMultiplier(settings: any): number {
  try {
    if (!settings || typeof settings !== 'object') return 1.0

    let multiplier = 1.0
    
    // Factor in print quality with validation
    const quality = settings.quality?.toLowerCase()
    switch (quality) {
      case 'high': multiplier *= 1.5; break
      case 'ultra': multiplier *= 2.0; break
      case 'draft': multiplier *= 0.8; break
    }
    
    // Factor in material type with validation
    const material = settings.material?.toLowerCase()
    switch (material) {
      case 'resin': multiplier *= 1.3; break
      case 'metal': multiplier *= 2.0; break
      case 'ceramic': multiplier *= 1.8; break
    }
    
    // Factor in supports
    if (settings.supports === true) multiplier *= 1.2
    
    // Ensure reasonable bounds
    return Math.min(Math.max(multiplier, 0.5), 5.0)
  } catch (error) {
    console.error('Error calculating complexity multiplier:', error)
    return 1.0
  }
}