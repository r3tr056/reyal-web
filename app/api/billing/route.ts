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

interface Payment {
  id: string
  payment_number: string
  invoice_id?: string
  order_id?: string
  user_id: string
  
  // Payment Details
  payment_date: string
  amount: number
  currency_code: string
  exchange_rate: number
  
  // Payment Method
  payment_method: 'card' | 'upi' | 'netbanking' | 'wallet' | 'cash' | 'bank_transfer' | 'cheque'
  payment_gateway?: string
  transaction_id?: string
  gateway_response?: any
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded'
  failure_reason?: string
  
  // References
  reference_number?: string
  notes?: string
  internal_notes?: string
  
  created_at: string
  updated_at: string
}

interface PaymentSummary {
  total_payments: number
  total_amount: number
  successful_payments: number
  failed_payments: number
  pending_payments: number
  refunded_amount: number
  payment_methods: Record<string, number>
  daily_volume: Array<{
    date: string
    amount: number
    count: number
  }>
}

const BillingQuerySchema = z.object({
  type: z.enum(['payments', 'refunds', 'analytics', 'transactions', 'summary']).default('summary'),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']).optional(),
  payment_method: z.enum(['card', 'upi', 'netbanking', 'wallet', 'cash', 'bank_transfer', 'cheque']).optional(),
  customer_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict()

export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('DEFAULT')(request)
    if (!rateLimitResult.success) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        endpoint: '/api/billing',
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
    const validation = BillingQuerySchema.safeParse(Object.fromEntries(searchParams))
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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS', {
        endpoint: '/api/billing',
        requestId
      })
      return createSecureResponse(
        { error: 'Authentication required' },
        401,
        requestId
      )
    }

    const { type, customer_id } = validation.data

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.is_admin
    
    if (!isAdmin && customer_id && customer_id !== user.id) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS', {
        endpoint: '/api/billing',
        userId: user.id,
        attemptedCustomerId: customer_id,
        requestId
      })
      return createSecureResponse(
        { error: 'Cannot access other users\' billing data' },
        403,
        requestId
      )
    }

    switch (type) {
      case 'payments':
        return handleGetPayments(request, user.id, isAdmin)
      case 'refunds':
        return handleGetRefunds(request, user.id, isAdmin)
      case 'analytics':
        return handleGetAnalytics(request, user.id, isAdmin)
      case 'transactions':
        return handleGetTransactions(request, user.id, isAdmin)
      default:
        return handleGetBillingSummary(request, user.id, isAdmin)
    }

  } catch (error) {
    await logSecurityEvent('INTERNAL_ERROR', {
      endpoint: '/api/billing',
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

async function handleGetPayments(request: NextRequest, userId: string, isAdmin: boolean) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const payment_method = searchParams.get('payment_method')
  const customer_id = searchParams.get('customer_id')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  // Mock payments data - in production, query from payments table
  const allPayments: Payment[] = [
    {
      id: 'pay_001',
      payment_number: 'PAY-2024-000001',
      invoice_id: 'inv_001',
      order_id: 'ord_001',
      user_id: 'user_001',
      payment_date: '2024-01-20T11:15:00Z',
      amount: 1525.00,
      currency_code: 'INR',
      exchange_rate: 1.0,
      payment_method: 'upi',
      payment_gateway: 'razorpay',
      transaction_id: 'txn_razorpay_123456',
      gateway_response: {
        razorpay_payment_id: 'pay_123456',
        razorpay_order_id: 'order_123456',
        razorpay_signature: 'signature_123456'
      },
      status: 'completed',
      reference_number: 'REF123456',
      notes: 'Payment for phone stand order',
      created_at: '2024-01-20T11:10:00Z',
      updated_at: '2024-01-20T11:15:00Z'
    },
    {
      id: 'pay_002',
      payment_number: 'PAY-2024-000002',
      invoice_id: 'inv_003',
      user_id: 'user_003',
      payment_date: '2024-01-25T14:30:00Z',
      amount: 561.00,
      currency_code: 'INR',
      exchange_rate: 1.0,
      payment_method: 'card',
      payment_gateway: 'stripe',
      transaction_id: 'pi_stripe_789012',
      gateway_response: {
        payment_intent_id: 'pi_789012',
        charge_id: 'ch_789012'
      },
      status: 'completed',
      reference_number: 'REF789012',
      created_at: '2024-01-25T14:25:00Z',
      updated_at: '2024-01-25T14:30:00Z'
    },
    {
      id: 'pay_003',
      payment_number: 'PAY-2024-000003',
      order_id: 'ord_004',
      user_id: 'user_002',
      payment_date: '2024-01-26T09:45:00Z',
      amount: 750.00,
      currency_code: 'INR',
      exchange_rate: 1.0,
      payment_method: 'netbanking',
      payment_gateway: 'payu',
      transaction_id: 'txn_payu_345678',
      status: 'failed',
      failure_reason: 'Insufficient funds',
      gateway_response: {
        error_code: 'E001',
        error_message: 'Transaction failed due to insufficient funds'
      },
      created_at: '2024-01-26T09:40:00Z',
      updated_at: '2024-01-26T09:45:00Z'
    }
  ]

  let filteredPayments = allPayments

  // Apply user filter if not admin
  if (!isAdmin) {
    filteredPayments = filteredPayments.filter(payment => payment.user_id === userId)
  } else if (customer_id) {
    filteredPayments = filteredPayments.filter(payment => payment.user_id === customer_id)
  }

  // Apply filters
  if (status) {
    filteredPayments = filteredPayments.filter(payment => payment.status === status)
  }

  if (payment_method) {
    filteredPayments = filteredPayments.filter(payment => payment.payment_method === payment_method)
  }

  // Pagination
  const startIndex = (page - 1) * limit
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + limit)

  return NextResponse.json({
    success: true,
    payments: paginatedPayments,
    pagination: {
      page,
      limit,
      total: filteredPayments.length,
      has_more: startIndex + limit < filteredPayments.length
    }
  })
}

async function handleGetRefunds(request: NextRequest, userId: string, isAdmin: boolean) {
  // Mock refunds data
  const refunds = [
    {
      id: 'ref_001',
      refund_number: 'REF-2024-000001',
      payment_id: 'pay_001',
      invoice_id: 'inv_001',
      user_id: 'user_001',
      refund_date: '2024-01-22T16:00:00Z',
      amount: 250.00,
      currency_code: 'INR',
      reason: 'Customer requested partial refund for damaged item',
      status: 'completed',
      gateway_refund_id: 'rfnd_razorpay_123',
      gateway_response: {
        razorpay_refund_id: 'rfnd_123456',
        status: 'processed'
      },
      notes: 'Partial refund for damaged phone stand',
      approved_by: 'admin_001',
      approved_at: '2024-01-22T15:30:00Z',
      created_at: '2024-01-22T15:00:00Z',
      updated_at: '2024-01-22T16:00:00Z'
    }
  ]

  return NextResponse.json({
    success: true,
    refunds: isAdmin ? refunds : refunds.filter(r => r.user_id === userId)
  })
}

async function handleGetAnalytics(request: NextRequest, userId: string, isAdmin: boolean) {
  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required for analytics' }, { status: 403 })
  }

  // Generate comprehensive billing analytics
  const analytics = {
    revenue_metrics: {
      total_revenue: 125430.75,
      monthly_revenue: 18650.25,
      daily_revenue: 1875.50,
      revenue_growth: 12.5, // percentage
      average_transaction_value: 847.32,
      recurring_revenue: 0 // For subscription models
    },
    payment_metrics: {
      total_payments: 156,
      successful_payments: 142,
      failed_payments: 14,
      success_rate: 91.0, // percentage
      total_refunds: 8,
      refund_rate: 5.6, // percentage
      refunded_amount: 2847.50
    },
    payment_methods: {
      upi: { count: 68, amount: 45230.25, percentage: 43.6 },
      card: { count: 52, amount: 38420.75, percentage: 33.3 },
      netbanking: { count: 28, amount: 32150.50, percentage: 17.9 },
      wallet: { count: 8, amount: 9629.25, percentage: 5.2 }
    },
    geographical_distribution: {
      'Mumbai': { amount: 35420.50, count: 45 },
      'Bangalore': { amount: 28650.25, count: 38 },
      'Delhi': { amount: 22350.75, count: 32 },
      'Pune': { amount: 18420.25, count: 25 },
      'Others': { amount: 20589.00, count: 16 }
    },
    time_series: {
      daily_volume: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: Math.random() * 5000 + 1000,
        count: Math.floor(Math.random() * 20) + 5,
        successful: Math.floor(Math.random() * 18) + 4,
        failed: Math.floor(Math.random() * 3)
      }))
    },
    customer_metrics: {
      total_customers: 89,
      paying_customers: 76,
      average_customer_value: 1650.42,
      customer_retention_rate: 78.5,
      top_customers: [
        { user_id: 'user_001', total_paid: 8450.75, orders: 12 },
        { user_id: 'user_002', total_paid: 6230.50, orders: 9 },
        { user_id: 'user_003', total_paid: 5875.25, orders: 8 }
      ]
    },
    gateway_performance: {
      razorpay: {
        success_rate: 94.2,
        average_processing_time: 2.3, // seconds
        total_volume: 68450.25,
        failed_count: 4
      },
      stripe: {
        success_rate: 96.8,
        average_processing_time: 1.8,
        total_volume: 42350.75,
        failed_count: 2
      },
      payu: {
        success_rate: 89.1,
        average_processing_time: 3.1,
        total_volume: 14629.75,
        failed_count: 8
      }
    },
    financial_health: {
      accounts_receivable: 15420.50,
      outstanding_invoices: 12,
      overdue_amount: 5230.25,
      bad_debt_percentage: 2.1,
      collection_efficiency: 87.5,
      days_sales_outstanding: 18.5
    }
  }

  return NextResponse.json({
    success: true,
    analytics,
    generated_at: new Date().toISOString(),
    period: 'last_30_days'
  })
}

async function handleGetTransactions(request: NextRequest, userId: string, isAdmin: boolean) {
  // Combined view of all financial transactions
  const transactions = [
    {
      id: 'txn_001',
      type: 'payment',
      reference_id: 'pay_001',
      user_id: 'user_001',
      amount: 1525.00,
      currency: 'INR',
      status: 'completed',
      description: 'Payment for INV-2024-000001',
      date: '2024-01-20T11:15:00Z'
    },
    {
      id: 'txn_002',
      type: 'refund',
      reference_id: 'ref_001',
      user_id: 'user_001',
      amount: -250.00,
      currency: 'INR',
      status: 'completed',
      description: 'Partial refund for damaged item',
      date: '2024-01-22T16:00:00Z'
    },
    {
      id: 'txn_003',
      type: 'payment',
      reference_id: 'pay_002',
      user_id: 'user_003',
      amount: 561.00,
      currency: 'INR',
      status: 'completed',
      description: 'Payment for INV-2024-000003',
      date: '2024-01-25T14:30:00Z'
    }
  ]

  return NextResponse.json({
    success: true,
    transactions: isAdmin ? transactions : transactions.filter(t => t.user_id === userId)
  })
}

async function handleGetBillingSummary(request: NextRequest, userId: string, isAdmin: boolean) {
  const summary = {
    user_billing: {
      total_spent: isAdmin ? null : 2836.50,
      total_orders: isAdmin ? null : 8,
      average_order_value: isAdmin ? null : 354.56,
      payment_methods_used: isAdmin ? null : ['upi', 'card'],
      outstanding_balance: isAdmin ? null : 0.00,
      credit_balance: isAdmin ? null : 150.00
    },
    admin_overview: isAdmin ? {
      total_revenue: 125430.75,
      total_customers: 89,
      active_subscriptions: 0,
      pending_payments: 15420.50,
      monthly_recurring_revenue: 0,
      average_customer_value: 1650.42
    } : null
  }

  return NextResponse.json({
    success: true,
    summary
  })
}

// POST /api/billing - Process payments, refunds, and billing actions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, payment_data, refund_data, invoice_id } = body

    switch (action) {
      case 'process_payment':
        return handleProcessPayment(payment_data, user.id)
      
      case 'verify_payment':
        return handleVerifyPayment(body.payment_id, body.gateway_data, user.id)
      
      case 'process_refund':
        return handleProcessRefund(refund_data, user.id)
      
      case 'update_payment_status':
        return handleUpdatePaymentStatus(body.payment_id, body.status, body.notes, user.id)
      
      case 'generate_receipt':
        return handleGenerateReceipt(body.payment_id, user.id)
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action. Supported: process_payment, verify_payment, process_refund, update_payment_status, generate_receipt' 
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Billing POST error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

async function handleProcessPayment(paymentData: any, userId: string) {
  const requiredFields = ['amount', 'payment_method']
  for (const field of requiredFields) {
    if (!paymentData[field]) {
      return NextResponse.json({ 
        error: `Missing required field: ${field}` 
      }, { status: 400 })
    }
  }

  // Generate payment ID and process through gateway
  const paymentId = `pay_${Date.now()}`
  const paymentNumber = `PAY-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`

  // Mock payment processing
  const gatewayResponse = {
    gateway_payment_id: `gateway_${Date.now()}`,
    status: 'success',
    transaction_id: `txn_${Date.now()}`
  }

  const payment = {
    id: paymentId,
    payment_number: paymentNumber,
    user_id: userId,
    amount: paymentData.amount,
    currency_code: paymentData.currency_code || 'INR',
    payment_method: paymentData.payment_method,
    payment_gateway: getGatewayForMethod(paymentData.payment_method),
    transaction_id: gatewayResponse.transaction_id,
    gateway_response: gatewayResponse,
    status: 'completed', // In real scenario, might be 'pending'
    payment_date: new Date().toISOString(),
    invoice_id: paymentData.invoice_id,
    order_id: paymentData.order_id,
    notes: paymentData.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // In production, save to payments table and update related invoice/order

  return NextResponse.json({
    success: true,
    payment,
    gateway_response: gatewayResponse,
    message: 'Payment processed successfully'
  })
}

async function handleVerifyPayment(paymentId: string, gatewayData: any, userId: string) {
  if (!paymentId) {
    return NextResponse.json({ 
      error: 'payment_id is required' 
    }, { status: 400 })
  }

  // Mock payment verification
  const verificationResult = {
    payment_id: paymentId,
    status: 'verified',
    gateway_status: 'captured',
    verified_amount: gatewayData.amount,
    verification_date: new Date().toISOString()
  }

  return NextResponse.json({
    success: true,
    verification: verificationResult,
    message: 'Payment verified successfully'
  })
}

async function handleProcessRefund(refundData: any, userId: string) {
  const requiredFields = ['payment_id', 'amount', 'reason']
  for (const field of requiredFields) {
    if (!refundData[field]) {
      return NextResponse.json({ 
        error: `Missing required field: ${field}` 
      }, { status: 400 })
    }
  }

  // Check if user is admin for refund processing
  // In production, implement proper authorization

  const refundId = `ref_${Date.now()}`
  const refundNumber = `REF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`

  const refund = {
    id: refundId,
    refund_number: refundNumber,
    payment_id: refundData.payment_id,
    user_id: refundData.user_id || userId,
    amount: refundData.amount,
    currency_code: 'INR',
    reason: refundData.reason,
    status: 'pending', // Would be processed through gateway
    refund_date: new Date().toISOString(),
    notes: refundData.notes,
    approved_by: userId,
    approved_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return NextResponse.json({
    success: true,
    refund,
    message: 'Refund initiated successfully'
  })
}

async function handleUpdatePaymentStatus(paymentId: string, status: string, notes: string, userId: string) {
  if (!paymentId || !status) {
    return NextResponse.json({ 
      error: 'payment_id and status are required' 
    }, { status: 400 })
  }

  // In production, update payment status in database
  return NextResponse.json({
    success: true,
    payment_id: paymentId,
    status,
    updated_at: new Date().toISOString(),
    updated_by: userId,
    message: 'Payment status updated successfully'
  })
}

async function handleGenerateReceipt(paymentId: string, userId: string) {
  if (!paymentId) {
    return NextResponse.json({ 
      error: 'payment_id is required' 
    }, { status: 400 })
  }

  // Mock receipt data
  const receipt = {
    receipt_number: `REC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
    payment_id: paymentId,
    amount: 1525.00,
    payment_date: '2024-01-20T11:15:00Z',
    payment_method: 'UPI',
    transaction_id: 'txn_123456',
    generated_at: new Date().toISOString()
  }

  return NextResponse.json({
    success: true,
    receipt,
    message: 'Receipt generated successfully'
  })
}

function getGatewayForMethod(paymentMethod: string): string {
  const gatewayMap: Record<string, string> = {
    upi: 'razorpay',
    card: 'stripe',
    netbanking: 'payu',
    wallet: 'paytm'
  }
  return gatewayMap[paymentMethod] || 'razorpay'
}
