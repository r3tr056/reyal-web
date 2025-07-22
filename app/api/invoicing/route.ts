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
import jsPDF from 'jspdf'

interface Invoice {
  id: string
  invoice_number: string
  order_id?: string
  user_id: string
  
  // Invoice Details
  invoice_date: string
  due_date: string
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'refunded'
  
  // Financial Amounts
  subtotal: number
  tax_amount: number
  discount_amount: number
  shipping_amount: number
  total_amount: number
  paid_amount: number
  balance_due: number
  
  // Currency & Locale
  currency_code: string
  exchange_rate: number
  
  // Addresses
  billing_address: any
  shipping_address?: any
  
  // Terms & Notes
  payment_terms: string
  notes?: string
  internal_notes?: string
  
  // Metadata
  pdf_url?: string
  sent_at?: string
  viewed_at?: string
  paid_at?: string
  
  // Line items
  line_items?: InvoiceLineItem[]
  
  created_at: string
  updated_at: string
}

interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  sku?: string
  quantity: number
  unit_price: number
  line_total: number
  tax_rate: number
  tax_amount: number
}

const InvoiceQuerySchema = z.object({
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded']).optional(),
  customer_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  include_analytics: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict()

// GET /api/invoicing - Get invoices with filters and analytics
export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('DEFAULT')(request)
    if (!rateLimitResult.success) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        endpoint: '/api/invoicing',
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
    const validation = InvoiceQuerySchema.safeParse(Object.fromEntries(searchParams))
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
        endpoint: '/api/invoicing',
        requestId
      })
      return createSecureResponse(
        { error: 'Authentication required' },
        401,
        requestId
      )
    }

    const { status, customer_id, date_from, date_to, include_analytics, page, limit } = validation.data

    // Check if user is admin or requesting own invoices
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.is_admin
    
    if (!isAdmin && customer_id && customer_id !== user.id) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS', {
        endpoint: '/api/invoicing',
        userId: user.id,
        attemptedCustomerId: customer_id,
        requestId
      })
      return createSecureResponse(
        { error: 'Cannot access other users\' invoices' },
        403,
        requestId
      )
    }

    // Mock invoice data - in production, query from invoices table
    const allInvoices: Invoice[] = [
      {
        id: 'inv_001',
        invoice_number: 'INV-2024-000001',
        order_id: 'ord_001',
        user_id: 'user_001',
        invoice_date: '2024-01-15T00:00:00Z',
        due_date: '2024-02-14T00:00:00Z',
        status: 'paid',
        subtotal: 1250.00,
        tax_amount: 225.00,
        discount_amount: 0.00,
        shipping_amount: 50.00,
        total_amount: 1525.00,
        paid_amount: 1525.00,
        balance_due: 0.00,
        currency_code: 'INR',
        exchange_rate: 1.0,
        billing_address: {
          name: 'Rajesh Kumar',
          company: 'TechCorp Pvt Ltd',
          address: '123 Tech Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India',
          email: 'rajesh@techcorp.in',
          phone: '+91 9876543210'
        },
        payment_terms: 'Net 30',
        notes: 'Thank you for your business!',
        pdf_url: '/invoices/INV-2024-000001.pdf',
        sent_at: '2024-01-15T10:30:00Z',
        viewed_at: '2024-01-15T14:22:00Z',
        paid_at: '2024-01-20T11:15:00Z',
        line_items: [
          {
            id: 'line_001',
            invoice_id: 'inv_001',
            description: '3D Printed Phone Stand - Premium PLA+',
            sku: 'PHONE-STAND-001',
            quantity: 5,
            unit_price: 250.00,
            line_total: 1250.00,
            tax_rate: 0.18,
            tax_amount: 225.00
          }
        ],
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-20T11:15:00Z'
      },
      {
        id: 'inv_002',
        invoice_number: 'INV-2024-000002',
        order_id: 'ord_002',
        user_id: 'user_002',
        invoice_date: '2024-01-20T00:00:00Z',
        due_date: '2024-02-19T00:00:00Z',
        status: 'overdue',
        subtotal: 850.00,
        tax_amount: 153.00,
        discount_amount: 50.00,
        shipping_amount: 75.00,
        total_amount: 1028.00,
        paid_amount: 0.00,
        balance_due: 1028.00,
        currency_code: 'INR',
        exchange_rate: 1.0,
        billing_address: {
          name: 'Priya Sharma',
          address: '456 Design Avenue',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          country: 'India',
          email: 'priya.sharma@example.com',
          phone: '+91 9123456789'
        },
        payment_terms: 'Net 30',
        notes: 'Custom miniature figurine set',
        pdf_url: '/invoices/INV-2024-000002.pdf',
        sent_at: '2024-01-20T09:00:00Z',
        viewed_at: '2024-01-21T16:45:00Z',
        line_items: [
          {
            id: 'line_002',
            invoice_id: 'inv_002',
            description: 'Custom Miniature Figurine Set',
            sku: 'FIGURINE-CUSTOM-001',
            quantity: 1,
            unit_price: 850.00,
            line_total: 850.00,
            tax_rate: 0.18,
            tax_amount: 153.00
          }
        ],
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-01-21T16:45:00Z'
      },
      {
        id: 'inv_003',
        invoice_number: 'INV-2024-000003',
        user_id: 'user_003',
        invoice_date: '2024-01-25T00:00:00Z',
        due_date: '2024-02-24T00:00:00Z',
        status: 'sent',
        subtotal: 450.00,
        tax_amount: 81.00,
        discount_amount: 0.00,
        shipping_amount: 30.00,
        total_amount: 561.00,
        paid_amount: 0.00,
        balance_due: 561.00,
        currency_code: 'INR',
        exchange_rate: 1.0,
        billing_address: {
          name: 'Amit Patel',
          address: '789 Innovation Hub',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
          country: 'India',
          email: 'amit.patel@startup.io',
          phone: '+91 9876543211'
        },
        payment_terms: 'Net 30',
        pdf_url: '/invoices/INV-2024-000003.pdf',
        sent_at: '2024-01-25T11:30:00Z',
        line_items: [
          {
            id: 'line_003',
            invoice_id: 'inv_003',
            description: 'Prototype Parts - Engineering Grade PETG',
            sku: 'PROTO-PARTS-001',
            quantity: 3,
            unit_price: 150.00,
            line_total: 450.00,
            tax_rate: 0.18,
            tax_amount: 81.00
          }
        ],
        created_at: '2024-01-25T00:00:00Z',
        updated_at: '2024-01-25T11:30:00Z'
      }
    ]

    let filteredInvoices = allInvoices

    // Apply user filter if not admin
    if (!isAdmin) {
      filteredInvoices = filteredInvoices.filter(inv => inv.user_id === user.id)
    } else if (customer_id) {
      filteredInvoices = filteredInvoices.filter(inv => inv.user_id === customer_id)
    }

    // Apply other filters
    if (status) {
      filteredInvoices = filteredInvoices.filter(inv => inv.status === status)
    }

    if (date_from) {
      filteredInvoices = filteredInvoices.filter(inv => 
        new Date(inv.invoice_date) >= new Date(date_from)
      )
    }

    if (date_to) {
      filteredInvoices = filteredInvoices.filter(inv => 
        new Date(inv.invoice_date) <= new Date(date_to)
      )
    }

    // Pagination
    const startIndex = (page - 1) * limit
    const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + limit)

    // Calculate analytics if requested
    let analytics = null
    if (include_analytics && isAdmin) {
      const totalInvoices = filteredInvoices.length
      const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)
      const totalPaid = filteredInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0)
      const totalOutstanding = filteredInvoices.reduce((sum, inv) => sum + inv.balance_due, 0)
      
      const statusCounts = filteredInvoices.reduce((counts, inv) => {
        counts[inv.status] = (counts[inv.status] || 0) + 1
        return counts
      }, {} as Record<string, number>)

      const avgDaysToPayment = filteredInvoices
        .filter(inv => inv.paid_at)
        .reduce((sum, inv) => {
          const invoiceDate = new Date(inv.invoice_date)
          const paidDate = new Date(inv.paid_at!)
          const daysDiff = Math.floor((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
          return sum + daysDiff
        }, 0) / filteredInvoices.filter(inv => inv.paid_at).length || 0

      const overdueInvoices = filteredInvoices.filter(inv => 
        inv.status === 'overdue' || 
        (inv.balance_due > 0 && new Date(inv.due_date) < new Date())
      )

      analytics = {
        total_invoices: totalInvoices,
        total_amount: Math.round(totalAmount * 100) / 100,
        total_paid: Math.round(totalPaid * 100) / 100,
        total_outstanding: Math.round(totalOutstanding * 100) / 100,
        collection_rate: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 10000) / 100 : 0,
        average_days_to_payment: Math.round(avgDaysToPayment * 10) / 10,
        overdue_count: overdueInvoices.length,
        overdue_amount: Math.round(overdueInvoices.reduce((sum, inv) => sum + inv.balance_due, 0) * 100) / 100,
        status_breakdown: statusCounts,
        aging_analysis: {
          current: filteredInvoices.filter(inv => {
            const daysPastDue = Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
            return daysPastDue <= 0 && inv.balance_due > 0
          }).reduce((sum, inv) => sum + inv.balance_due, 0),
          days_1_30: filteredInvoices.filter(inv => {
            const daysPastDue = Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
            return daysPastDue > 0 && daysPastDue <= 30 && inv.balance_due > 0
          }).reduce((sum, inv) => sum + inv.balance_due, 0),
          days_31_60: filteredInvoices.filter(inv => {
            const daysPastDue = Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
            return daysPastDue > 30 && daysPastDue <= 60 && inv.balance_due > 0
          }).reduce((sum, inv) => sum + inv.balance_due, 0),
          days_61_90: filteredInvoices.filter(inv => {
            const daysPastDue = Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
            return daysPastDue > 60 && daysPastDue <= 90 && inv.balance_due > 0
          }).reduce((sum, inv) => sum + inv.balance_due, 0),
          days_90_plus: filteredInvoices.filter(inv => {
            const daysPastDue = Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
            return daysPastDue > 90 && inv.balance_due > 0
          }).reduce((sum, inv) => sum + inv.balance_due, 0)
        }
      }
    }

    return NextResponse.json({
      success: true,
      invoices: paginatedInvoices,
      pagination: {
        page,
        limit,
        total: filteredInvoices.length,
        has_more: startIndex + limit < filteredInvoices.length
      },
      analytics,
      filters: {
        status,
        customer_id,
        date_from,
        date_to
      }
    })

  } catch (error) {
    await logSecurityEvent('INTERNAL_ERROR', {
      endpoint: '/api/invoicing',
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

// POST /api/invoicing - Create new invoice or perform invoice actions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, invoice_data, invoice_id } = body

    switch (action) {
      case 'create_invoice':
        return handleCreateInvoice(invoice_data, user.id)
      
      case 'send_invoice':
        return handleSendInvoice(invoice_id, user.id)
      
      case 'mark_paid':
        return handleMarkPaid(invoice_id, body.payment_data, user.id)
      
      case 'apply_payment':
        return handleApplyPayment(invoice_id, body.payment_data, user.id)
      
      case 'void_invoice':
        return handleVoidInvoice(invoice_id, body.reason, user.id)
      
      case 'generate_pdf':
        return handleGeneratePDF(invoice_id, user.id)
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action. Supported: create_invoice, send_invoice, mark_paid, apply_payment, void_invoice, generate_pdf' 
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Invoicing POST error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

async function handleCreateInvoice(invoiceData: any, userId: string) {
  // Validate required fields
  const requiredFields = ['user_id', 'line_items', 'billing_address']
  for (const field of requiredFields) {
    if (!invoiceData[field]) {
      return NextResponse.json({ 
        error: `Missing required field: ${field}` 
      }, { status: 400 })
    }
  }

  // Calculate totals
  const lineItems = invoiceData.line_items
  const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0)
  const taxAmount = lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price * (item.tax_rate || 0)), 0)
  const discountAmount = invoiceData.discount_amount || 0
  const shippingAmount = invoiceData.shipping_amount || 0
  const totalAmount = subtotal + taxAmount - discountAmount + shippingAmount

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber()
  
  const newInvoice = {
    id: `inv_${Date.now()}`,
    invoice_number: invoiceNumber,
    ...invoiceData,
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    discount_amount: Math.round(discountAmount * 100) / 100,
    shipping_amount: Math.round(shippingAmount * 100) / 100,
    total_amount: Math.round(totalAmount * 100) / 100,
    paid_amount: 0,
    balance_due: Math.round(totalAmount * 100) / 100,
    status: 'draft',
    invoice_date: invoiceData.invoice_date || new Date().toISOString(),
    due_date: invoiceData.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    currency_code: invoiceData.currency_code || 'INR',
    exchange_rate: invoiceData.exchange_rate || 1.0,
    payment_terms: invoiceData.payment_terms || 'Net 30',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: userId
  }

  // In production, insert into invoices table and invoice_line_items table

  return NextResponse.json({
    success: true,
    invoice: newInvoice,
    message: 'Invoice created successfully'
  })
}

async function handleSendInvoice(invoiceId: string, userId: string) {
  if (!invoiceId) {
    return NextResponse.json({ 
      error: 'invoice_id is required' 
    }, { status: 400 })
  }

  // In production, update invoice status and send email
  const sentAt = new Date().toISOString()
  
  // Mock email sending logic
  const emailSent = true // Would integrate with email service

  if (!emailSent) {
    return NextResponse.json({ 
      error: 'Failed to send invoice email' 
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    invoice_id: invoiceId,
    sent_at: sentAt,
    status: 'sent',
    message: 'Invoice sent successfully'
  })
}

async function handleMarkPaid(invoiceId: string, paymentData: any, userId: string) {
  if (!invoiceId) {
    return NextResponse.json({ 
      error: 'invoice_id is required' 
    }, { status: 400 })
  }

  const paidAt = new Date().toISOString()
  const paymentAmount = paymentData.amount
  
  // In production, update invoice and create payment record
  return NextResponse.json({
    success: true,
    invoice_id: invoiceId,
    payment_amount: paymentAmount,
    paid_at: paidAt,
    status: 'paid',
    message: 'Invoice marked as paid successfully'
  })
}

async function handleApplyPayment(invoiceId: string, paymentData: any, userId: string) {
  const { amount, payment_method, transaction_id } = paymentData
  
  if (!invoiceId || !amount) {
    return NextResponse.json({ 
      error: 'invoice_id and amount are required' 
    }, { status: 400 })
  }

  // In production, create payment record and update invoice
  const payment = {
    id: `pay_${Date.now()}`,
    payment_number: await generatePaymentNumber(),
    invoice_id: invoiceId,
    amount: amount,
    payment_method: payment_method || 'unknown',
    transaction_id,
    status: 'completed',
    payment_date: new Date().toISOString(),
    created_by: userId
  }

  return NextResponse.json({
    success: true,
    payment,
    message: 'Payment applied successfully'
  })
}

async function handleVoidInvoice(invoiceId: string, reason: string, userId: string) {
  if (!invoiceId) {
    return NextResponse.json({ 
      error: 'invoice_id is required' 
    }, { status: 400 })
  }

  // In production, update invoice status and create audit log
  return NextResponse.json({
    success: true,
    invoice_id: invoiceId,
    status: 'cancelled',
    void_reason: reason,
    voided_at: new Date().toISOString(),
    voided_by: userId,
    message: 'Invoice voided successfully'
  })
}

async function handleGeneratePDF(invoiceId: string, userId: string) {
  if (!invoiceId) {
    return NextResponse.json({ 
      error: 'invoice_id is required' 
    }, { status: 400 })
  }

  try {
    // Get invoice data (mock for now)
    const invoice = {
      invoice_number: 'INV-2024-000001',
      invoice_date: '2024-01-15',
      due_date: '2024-02-14',
      billing_address: {
        name: 'Rajesh Kumar',
        company: 'TechCorp Pvt Ltd',
        address: '123 Tech Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001'
      },
      line_items: [
        {
          description: '3D Printed Phone Stand',
          quantity: 5,
          unit_price: 250.00,
          line_total: 1250.00
        }
      ],
      subtotal: 1250.00,
      tax_amount: 225.00,
      total_amount: 1525.00
    }

    // Generate PDF
    const doc = new jsPDF()
    
    // Company header
    doc.setFontSize(20)
    doc.text('REYAL 3D PRINTING', 20, 30)
    doc.setFontSize(12)
    doc.text('Professional 3D Printing Services', 20, 40)
    doc.text('Mumbai, Maharashtra, India', 20, 50)
    
    // Invoice title
    doc.setFontSize(16)
    doc.text('INVOICE', 150, 30)
    doc.setFontSize(12)
    doc.text(`Invoice #: ${invoice.invoice_number}`, 150, 40)
    doc.text(`Date: ${invoice.invoice_date}`, 150, 50)
    doc.text(`Due Date: ${invoice.due_date}`, 150, 60)
    
    // Billing address
    doc.text('Bill To:', 20, 80)
    doc.text(invoice.billing_address.name, 20, 90)
    if (invoice.billing_address.company) {
      doc.text(invoice.billing_address.company, 20, 100)
    }
    doc.text(invoice.billing_address.address, 20, 110)
    doc.text(`${invoice.billing_address.city}, ${invoice.billing_address.state} ${invoice.billing_address.pincode}`, 20, 120)
    
    // Line items header
    const startY = 150
    doc.text('Description', 20, startY)
    doc.text('Qty', 120, startY)
    doc.text('Rate', 140, startY)
    doc.text('Amount', 170, startY)
    
    // Line items
    let currentY = startY + 10
    invoice.line_items.forEach((item) => {
      doc.text(item.description, 20, currentY)
      doc.text(item.quantity.toString(), 120, currentY)
      doc.text(`₹${item.unit_price.toFixed(2)}`, 140, currentY)
      doc.text(`₹${item.line_total.toFixed(2)}`, 170, currentY)
      currentY += 10
    })
    
    // Totals
    const totalsY = currentY + 20
    doc.text('Subtotal:', 140, totalsY)
    doc.text(`₹${invoice.subtotal.toFixed(2)}`, 170, totalsY)
    
    doc.text('Tax (18%):', 140, totalsY + 10)
    doc.text(`₹${invoice.tax_amount.toFixed(2)}`, 170, totalsY + 10)
    
    doc.setFontSize(14)
    doc.text('Total:', 140, totalsY + 25)
    doc.text(`₹${invoice.total_amount.toFixed(2)}`, 170, totalsY + 25)
    
    // Convert to base64
    const pdfBase64 = doc.output('datauristring')
    
    return NextResponse.json({
      success: true,
      invoice_id: invoiceId,
      pdf_data: pdfBase64,
      filename: `${invoice.invoice_number}.pdf`,
      message: 'PDF generated successfully'
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate PDF' 
    }, { status: 500 })
  }
}

async function generateInvoiceNumber(): Promise<string> {
  // In production, this would query the database to get the next sequence number
  const year = new Date().getFullYear()
  const nextNumber = 1 // Would get from DB sequence
  return `INV-${year}-${nextNumber.toString().padStart(6, '0')}`
}

async function generatePaymentNumber(): Promise<string> {
  // In production, this would query the database to get the next sequence number
  const year = new Date().getFullYear()
  const nextNumber = 1 // Would get from DB sequence
  return `PAY-${year}-${nextNumber.toString().padStart(6, '0')}`
}

// PUT /api/invoicing - Update existing invoice
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { invoice_id, updates } = body

    if (!invoice_id) {
      return NextResponse.json({ 
        error: 'invoice_id is required' 
      }, { status: 400 })
    }

    // In production, update the invoice in the database
    const updatedInvoice = {
      id: invoice_id,
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: 'Invoice updated successfully'
    })

  } catch (error) {
    console.error('Invoicing PUT error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
