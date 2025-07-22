import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Decimal } from 'decimal.js'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimit, requireAdmin, sanitizeInput, validateUUID, createSecureResponse, logSecurityEvent, createRateLimitResponse } from '@/lib/middleware/api-middleware'
import { API_CONFIG } from '@/lib/config/api'

const MAX_DISCOUNT_PERCENTAGE = 0.5 // 50%
const MAX_ORDER_VALUE = 100000 // 1 lakh INR
const FINANCIAL_PRECISION = 2
const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const
const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const

const OrderUpdateSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  payment_status: z.enum(VALID_PAYMENT_STATUSES).optional(),
  notes: z.string().max(1000).optional().transform(val => val ? sanitizeInput(val) : val),
  business_notes: z.string().max(2000).optional().transform(val => val ? sanitizeInput(val) : val),
  internal_notes: z.string().max(2000).optional().transform(val => val ? sanitizeInput(val) : val),
  discount_amount: z.number()
    .min(0, 'Discount cannot be negative')
    .max(MAX_ORDER_VALUE, 'Discount exceeds maximum allowed')
    .multipleOf(0.01, 'Invalid decimal precision')
    .optional(),
  shipping_amount: z.number()
    .min(0, 'Shipping amount cannot be negative')
    .max(50000, 'Shipping amount exceeds maximum')
    .multipleOf(0.01, 'Invalid decimal precision')
    .optional(),
}).strict()

// Always stay type safe!
interface OrderFinancialSummary {
  subtotal: string
  discount: string
  tax: string
  shipping: string
  total: string
  paid: string
  refunded: string
  balance: string
}

interface AuditContext {
  userId: string
  userEmail: string
  ipAddress: string
  userAgent: string
  timestamp: string
}

// GET /api/orders/[id] - Get specific order details with comprehensive finance data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {

  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    if (!validateUUID(params.id)) {
      await logSecurityEvent('INVALID_ORDER_ID_FORMAT', {
        orderId: params.id,
        requestID: requestId,
        ip: request.headers.get('x-forwarded-for') 
      })
      return createSecureResponse(
        { error: 'Invalid order ID format' }, 
        400, 
        requestId
      )
    }

    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || !user.email_confirmed_at) {
      return createSecureResponse({ error: 'Unauthorized' }, 401, requestId)
    }

    const auditContext: AuditContext = {
      userId: user.id,
      userEmail: user.email || 'unknown',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit('DEFAULT')(request, user.id)
    const rateLimitResponse = await createRateLimitResponse(rateLimitResult, requestId)
    if (rateLimitResponse) return rateLimitResponse

    const orderId = params.id

    // Get order with all related data
    const { data: orderData, error: orderError } = await supabase
      .rpc('get_order_with_permissions', {
        p_order_id: orderId,
        p_user_id: user.id
      })

    if (orderError) {
      if (orderError.code == 'P0001') { // Order not found
        return createSecureResponse({error: 'Order not found'}, 404, requestId)
      }
      if (orderError.code === 'P0002') { // Access denied
        await logSecurityEvent('UNAUTHORIZED_ORDER_ACCESS', {
          ...auditContext,
          orderId
        })
        return createSecureResponse({ error: 'Access denied' }, 403, requestId)
      }
      throw orderError
    }

    const { order, permissions } = orderData
    const financialSummary = calculateFinancialSummary(
      order.invoices || [],
      order.payments || [],
      order.refunds || [],
      order
    )

    const responseOrder = buildOrderResponse(order, permissions, financialSummary)
    await supabase
      .from('audit_logs')
      .insert({
        action: 'ORDER_VIEW',
        table_name: 'orders',
        record_id: orderId,
        user_id: user.id,
        ip_address: auditContext.ipAddress,
        user_agent: auditContext.userAgent,
        metadata: {
          request_id: requestId,
          response_time: Date.now() - startTime
        }
      })

    return createSecureResponse({
      success: true,
      order: responseOrder,
      meta: {
        permissions,
        request_id: requestId,
        response_time: Date.now() - startTime
      }
    }, 200, requestId)

  } catch (error: any) {
    console.error(`Order GET error [${requestId}]:`, {
      message: error.message,
      orderId: params.id,
      timestamp: new Date().toISOString()
    })

    return createSecureResponse(
      { 
        error: 'Unable to retrieve order',
        code: 'ORDER_RETRIEVAL_FAILED'
      }, 
      500, 
      requestId
    )
  }
}
// PATCH /api/orders/[id] - Enhanced with atomic operations and validation
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    // Input validation
    if (!validateUUID(params.id)) {
      return createSecureResponse(
        { error: 'Invalid order ID format' }, 
        400, 
        requestId
      )
    }

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
      timestamp: new Date().toISOString()
    }

    // Strict rate limiting for modifications
    const rateLimitResult = await rateLimit('DEFAULT')(request, user.id, true)
    const rateLimitResponse = await createRateLimitResponse(rateLimitResult, requestId)
    if (rateLimitResponse) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED_WRITE', { 
        ...auditContext, 
        orderId: params.id 
      })
      return rateLimitResponse
    }

    // Admin check with enhanced permissions
    const adminCheck = await requireAdmin(supabase, user.id)
    if (adminCheck) {
      await logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS', {
        ...auditContext,
        orderId: params.id
      })
      return adminCheck
    }

    // Parse and validate request body
    let body: any
    try {
      const rawBody = await request.text()
      body = JSON.parse(rawBody)
      
      // Check for suspicious payload size
      if (rawBody.length > 50000) { // 50KB limit
        await logSecurityEvent('SUSPICIOUS_PAYLOAD_SIZE', {
          ...auditContext,
          payloadSize: rawBody.length
        })
        return createSecureResponse(
          { error: 'Payload too large' }, 
          413, 
          requestId
        )
      }
    } catch (parseError) {
      return createSecureResponse(
        { error: 'Invalid JSON format' }, 
        400, 
        requestId
      )
    }

    // Comprehensive input validation
    const validation = OrderUpdateSchema.safeParse(body)
    if (!validation.success) {
      return createSecureResponse({
        error: 'Invalid input data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, 400, requestId)
    }

    const updateData = validation.data
    const orderId = params.id

    // Execute atomic update using database function
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_order_secure', {
        p_order_id: orderId,
        p_updates: updateData,
        p_admin_id: user.id,
        p_audit_context: auditContext,
        p_request_id: requestId
      })

    if (updateError) {
      if (updateError.code === 'P0001') {
        return createSecureResponse({ error: 'Order not found' }, 404, requestId)
      }
      if (updateError.code === 'P0003') {
        return createSecureResponse({
          error: 'Business rule violation',
          details: updateError.message
        }, 400, requestId)
      }
      throw updateError
    }

    const { 
      updated_order: updatedOrder, 
      actions_performed: actionsPerformed,
      financial_summary: financialSummary 
    } = updateResult

    // Log successful update
    await supabase
      .from('audit_logs')
      .insert({
        action: 'ORDER_UPDATE',
        table_name: 'orders',
        record_id: orderId,
        user_id: user.id,
        ip_address: auditContext.ipAddress,
        user_agent: auditContext.userAgent,
        old_values: updateResult.previous_values,
        new_values: updateData,
        metadata: {
          request_id: requestId,
          actions_performed: actionsPerformed,
          response_time: Date.now() - startTime
        }
      })

    return createSecureResponse({
      success: true,
      order: updatedOrder,
      actions_performed: actionsPerformed,
      financial_summary: financialSummary,
      audit: {
        updated_by: {
          id: user.id,
          email: user.email
        },
        timestamp: auditContext.timestamp,
        request_id: requestId
      }
    }, 200, requestId)

  } catch (error: any) {
    console.error(`Order PATCH error [${requestId}]:`, {
      message: error.message,
      orderId: params.id,
      userId: (error as any).userId,
      timestamp: new Date().toISOString()
    })

    return createSecureResponse({
      error: 'Unable to update order',
      code: 'ORDER_UPDATE_FAILED'
    }, 500, requestId)
  }
}

// Enhanced helper functions with proper error handling and validation

function calculateFinancialSummary(
  invoices: any[],
  payments: any[],
  refunds: any[],
  order: any
): OrderFinancialSummary {
  try {
    // Use Decimal.js for precise financial calculations
    const subtotal = new Decimal(order.subtotal_amount || 0)
    const discount = new Decimal(order.discount_amount || 0)
    const tax = new Decimal(order.tax_amount || 0)
    const shipping = new Decimal(order.shipping_amount || 0)
    const total = new Decimal(order.total_amount || 0)

    // Calculate paid amount from completed payments only
    const paid = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum.plus(new Decimal(p.amount || 0)), new Decimal(0))

    // Calculate refunded amount from completed refunds only
    const refunded = refunds
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum.plus(new Decimal(r.amount || 0)), new Decimal(0))

    const balance = total.minus(paid).plus(refunded)

    return {
      subtotal: subtotal.toFixed(FINANCIAL_PRECISION),
      discount: discount.toFixed(FINANCIAL_PRECISION),
      tax: tax.toFixed(FINANCIAL_PRECISION),
      shipping: shipping.toFixed(FINANCIAL_PRECISION),
      total: total.toFixed(FINANCIAL_PRECISION),
      paid: paid.toFixed(FINANCIAL_PRECISION),
      refunded: refunded.toFixed(FINANCIAL_PRECISION),
      balance: balance.toFixed(FINANCIAL_PRECISION)
    }
  } catch (error) {
    console.error('Error calculating financial summary:', error)
    // Return safe defaults
    return {
      subtotal: '0.00',
      discount: '0.00',
      tax: '0.00',
      shipping: '0.00',
      total: '0.00',
      paid: '0.00',
      refunded: '0.00',
      balance: '0.00'
    }
  }
}

function buildOrderResponse(order: any, permissions: any, financialSummary: OrderFinancialSummary) {
  // Base order data that all users can see
  const baseOrder = {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    created_at: order.created_at,
    updated_at: order.updated_at
  }

  // Add financial data based on permissions
  if (permissions.can_view_financial) {
    Object.assign(baseOrder, {
      subtotal_amount: order.subtotal_amount,
      discount_amount: order.discount_amount,
      tax_amount: order.tax_amount,
      shipping_amount: order.shipping_amount,
      total_amount: order.total_amount,
      payment_status: order.payment_status,
      financial_summary: financialSummary,
      invoices: order.invoices || [],
      payments: order.payments || [],
      refunds: order.refunds || []
    })
  }

  // Add sensitive data based on permissions
  if (permissions.can_view_sensitive) {
    Object.assign(baseOrder, {
      internal_notes: order.internal_notes,
      business_notes: order.business_notes,
      accounting_entries: order.accounting_entries || []
    })
  }

  // Add order items and history for owners and admins
  if (permissions.can_view_details) {
    Object.assign(baseOrder, {
      order_items: order.order_items || [],
      order_history: order.order_history || []
    })
  }

  return baseOrder
}