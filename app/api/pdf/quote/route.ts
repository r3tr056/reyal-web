import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Decimal } from 'decimal.js'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { createServerClient } from '@/lib/supabase/server'
import { 
  rateLimit, 
  sanitizeInput,
  createSecureResponse,
  logSecurityEvent, 
  createRateLimitResponse
} from '@/lib/middleware/api-middleware'

// Constants for security and business rules
const MAX_QUOTE_VALUE = 1000000
const MIN_QUOTE_VALUE = 1
const MAX_NOTES_LENGTH = 2000
const MAX_TERMS_LENGTH = 5000
const QUOTE_VALID_DAYS_DEFAULT = 30
const QUOTE_VALID_DAYS_MAX = 365
const PDF_MAX_SIZE = 10 * 1024 * 1024 // 10MB max PDF size
const FINANCIAL_PRECISION = 2

// Enhanced validation schema
const GenerateQuoteSchema = z.object({
  estimateId: z.string().uuid('Invalid estimate ID format'),
  validUntil: z.string()
    .datetime('Invalid datetime format')
    .optional()
    .transform(val => {
      if (!val) {
        const defaultDate = new Date()
        defaultDate.setDate(defaultDate.getDate() + QUOTE_VALID_DAYS_DEFAULT)
        return defaultDate.toISOString()
      }
      const date = new Date(val)
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + QUOTE_VALID_DAYS_MAX)
      
      if (date < new Date()) {
        throw new Error('Valid until date cannot be in the past')
      }
      if (date > maxDate) {
        throw new Error(`Valid until date cannot be more than ${QUOTE_VALID_DAYS_MAX} days in the future`)
      }
      return date.toISOString()
    }),
  terms: z.string()
    .max(MAX_TERMS_LENGTH, `Terms cannot exceed ${MAX_TERMS_LENGTH} characters`)
    .optional()
    .transform(val => val ? sanitizeInput(val) : val),
  notes: z.string()
    .max(MAX_NOTES_LENGTH, `Notes cannot exceed ${MAX_NOTES_LENGTH} characters`)
    .optional()
    .transform(val => val ? sanitizeInput(val) : val),
  includeWatermark: z.boolean().default(true),
  format: z.enum(['pdf', 'preview']).default('pdf')
}).strict()

// Enhanced color palette with accessibility considerations
const COLORS = {
  primary: [0, 123, 255] as const,
  secondary: [108, 117, 125] as const,
  success: [40, 167, 69] as const,
  danger: [220, 53, 69] as const,
  warning: [255, 193, 7] as const,
  info: [23, 162, 184] as const,
  dark: [33, 37, 41] as const,
  light: [248, 249, 250] as const,
  white: [255, 255, 255] as const,
  text: [52, 58, 64] as const
} as const

// Enhanced types
interface AutoTable extends jsPDF {
  lastAutoTable: { finalY: number }
  autoTable: (options: any) => void
}

interface QuoteData {
  quoteNumber: string
  validUntil: string
  amount: Decimal
  currency: string
  estimate: any
  customer: any
  company: any
  terms?: string
  notes?: string
}

interface AuditContext {
  userId: string
  userEmail: string
  ipAddress: string
  userAgent: string
  timestamp: string
  requestId: string
}

// Enhanced PDF generation functions with error handling
function addWatermark(pdf: jsPDF, text: string = "REYAL 3D PRINTING"): void {
  try {
    const pageWidth = pdf.internal.pageSize.width
    const pageHeight = pdf.internal.pageSize.height
    
    pdf.saveGraphicsState()
    pdf.setGState(pdf.GState({ opacity: 0.08 }))
    pdf.setTextColor(...COLORS.secondary)
    pdf.setFontSize(60)
    pdf.setFont('helvetica', 'bold')
    
    const x = pageWidth / 2
    const y = pageHeight / 2
    
    pdf.text(text, x, y, { 
      angle: 45, 
      align: 'center' 
    })
    
    pdf.restoreGraphicsState()
  } catch (error: any) {
    console.error('Error adding watermark:', error)
    // Continue without watermark if there's an error
  }
}

function addSecureHeader(pdf: jsPDF, company: any, quoteNumber: string): void {
  try {
    const pageWidth = pdf.internal.pageSize.width
    
    // Header background with gradient effect
    pdf.setFillColor(...COLORS.primary)
    pdf.rect(0, 0, pageWidth, 70, 'F')
    
    // Secondary accent
    pdf.setFillColor(...COLORS.info)
    pdf.rect(0, 0, pageWidth, 5, 'F')
    
    // Company logo placeholder with better design
    pdf.setFillColor(...COLORS.white)
    pdf.circle(45, 35, 18, 'F')
    pdf.setFillColor(...COLORS.primary)
    pdf.circle(45, 35, 15, 'F')
    
    // Logo text
    pdf.setTextColor(...COLORS.white)
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('R3D', 35, 40)
    
    // Company name with validation
    const companyName = sanitizeInput(company?.company_name || 'Reyal 3D Printing')
    pdf.setTextColor(...COLORS.white)
    pdf.setFontSize(28)
    pdf.setFont('helvetica', 'bold')
    pdf.text(companyName, 80, 30)
    
    // Tagline
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Professional 3D Printing & Rapid Prototyping', 80, 45)
    
    // Quote number with security formatting
    pdf.setFontSize(32)
    pdf.setFont('helvetica', 'bold')
    pdf.text('QUOTE', pageWidth - 120, 30)
    
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`#${quoteNumber}`, pageWidth - 120, 45)
    
    // Confidentiality notice
    pdf.setFontSize(8)
    pdf.setTextColor(200, 200, 200)
    pdf.text('CONFIDENTIAL', pageWidth - 120, 55)
    
  } catch (error: any) {
    console.error('Error adding header:', error)
    throw new Error('Failed to generate PDF header')
  }
}

function addCompanyInfo(pdf: jsPDF, company: any, startY: number): number {
  try {
    pdf.setTextColor(...COLORS.text)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    let yPos = startY
    const lineHeight = 14
    
    // Company information with icons and validation
    const companyData = [
      { icon: '📍', field: 'address', label: 'Address' },
      { icon: '📞', field: 'phone', label: 'Phone' },
      { icon: '✉️', field: 'email', label: 'Email' },
      { icon: '🌐', field: 'website', label: 'Website' }
    ]
    
    companyData.forEach(({ icon, field, label }) => {
      const value = company?.[field]
      if (value) {
        const sanitizedValue = sanitizeInput(value.toString())
        pdf.text(`${icon} ${sanitizedValue}`, 25, yPos)
        yPos += lineHeight
      }
    })
    
    return yPos + 10
  } catch (error: any) {
    console.error('Error adding company info:', error)
    return startY + 60 // Return fallback position
  }
}

function addQuoteDetails(pdf: jsPDF, quoteData: QuoteData): void {
  try {
    const pageWidth = pdf.internal.pageSize.width
    
    // Quote details box with enhanced styling
    pdf.setFillColor(...COLORS.light)
    pdf.setDrawColor(...COLORS.primary)
    pdf.setLineWidth(2)
    pdf.roundedRect(pageWidth - 140, 80, 120, 65, 5, 5, 'FD')
    
    // Title
    pdf.setTextColor(...COLORS.primary)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('QUOTE DETAILS', pageWidth - 135, 95)
    
    // Details with proper formatting
    const details = [
      { label: 'Quote Number:', value: quoteData.quoteNumber },
      { label: 'Date:', value: new Date().toLocaleDateString('en-US') },
      { label: 'Valid Until:', value: new Date(quoteData.validUntil).toLocaleDateString('en-US') },
      { label: 'Currency:', value: quoteData.currency },
      { label: 'Amount:', value: `${quoteData.currency} ${quoteData.amount.toFixed(FINANCIAL_PRECISION)}` }
    ]
    
    pdf.setTextColor(...COLORS.text)
    pdf.setFontSize(9)
    
    let yPos = 110
    details.forEach(({ label, value }) => {
      pdf.setFont('helvetica', 'bold')
      pdf.text(label, pageWidth - 135, yPos)
      pdf.setFont('helvetica', 'normal')
      pdf.text(sanitizeInput(value.toString()), pageWidth - 135, yPos + 8)
      yPos += 18
    })
    
  } catch (error: any) {
    console.error('Error adding quote details:', error)
    throw new Error('Failed to generate quote details')
  }
}

function addCustomerInfo(pdf: jsPDF, customer: any, startY: number): number {
  try {
    // Customer info box with enhanced styling
    pdf.setFillColor(...COLORS.light)
    pdf.setDrawColor(...COLORS.secondary)
    pdf.setLineWidth(1)
    pdf.roundedRect(25, startY, 180, 50, 3, 3, 'FD')
    
    pdf.setTextColor(...COLORS.primary)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('QUOTE FOR:', 30, startY + 15)
    
    // Customer details with validation
    const customerName = sanitizeInput(customer?.full_name || 'Valued Customer')
    const customerEmail = sanitizeInput(customer?.email || 'N/A')
    const customerCompany = sanitizeInput(customer?.company || '')
    const customerPhone = sanitizeInput(customer?.phone || '')
    
    pdf.setTextColor(...COLORS.text)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text(customerName, 30, startY + 30)
    
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    
    let yOffset = 38
    if (customerCompany) {
      pdf.text(customerCompany, 30, startY + yOffset)
      yOffset += 8
    }
    
    pdf.text(`📧 ${customerEmail}`, 30, startY + yOffset)
    
    if (customerPhone) {
      pdf.text(`📱 ${customerPhone}`, 120, startY + yOffset)
    }
    
    return startY + 60
  } catch (error: any) {
    console.error('Error adding customer info:', error)
    return startY + 60 // Return fallback position
  }
}

function addItemsTable(pdf: AutoTable, estimate: any, startY: number): number {
  try {
    const tableColumns = [
      'Description',
      'Material',
      'Quality',
      'Quantity',
      'Print Time',
      'Unit Price',
      'Total'
    ]
    
    // Safely extract data with defaults
    const filename = sanitizeInput(estimate.files?.filename || estimate.file_name || 'Custom 3D Print')
    const material = sanitizeInput(estimate.settings?.material || 'PLA')
    const quality = sanitizeInput(estimate.settings?.quality || 'Standard')
    const quantity = estimate.quantity || 1
    const printTime = estimate.print_time || estimate.estimated_time || 0
    const unitPrice = new Decimal(estimate.cost_breakdown?.unit_cost || estimate.unit_cost || 0)
    const totalPrice = unitPrice.mul(quantity)
    
    const tableRows = [[
      filename,
      material,
      quality,
      quantity.toString(),
      `${printTime.toFixed(1)}h`,
      `$${unitPrice.toFixed(FINANCIAL_PRECISION)}`,
      `$${totalPrice.toFixed(FINANCIAL_PRECISION)}`
    ]]
    
    pdf.autoTable({
      startY: startY,
      head: [tableColumns],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.text,
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: COLORS.light
      },
      columnStyles: {
        0: { cellWidth: 50, halign: 'left' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 25, right: 25 },
      styles: {
        lineColor: COLORS.secondary,
        lineWidth: 0.5
      }
    })
    
    return pdf.lastAutoTable.finalY
  } catch (error: any) {
    console.error('Error adding items table:', error)
    throw new Error('Failed to generate items table')
  }
}

function addEnhancedCostBreakdown(pdf: AutoTable, breakdown: any, startY: number): number {
  try {
    const pageWidth = pdf.internal.pageSize.width
    
    // Safely extract and validate cost data
    const costItems = [
      { label: 'Material Cost', value: new Decimal(breakdown?.materialCost || breakdown?.material_cost || 0) },
      { label: 'Labor Cost', value: new Decimal(breakdown?.laborCost || breakdown?.labor_cost || 0) },
      { label: 'Machine Time', value: new Decimal(breakdown?.machineTime || breakdown?.machine_time || 0) },
      { label: 'Post-Processing', value: new Decimal(breakdown?.postProcessingCost || breakdown?.post_processing || 0) },
      { label: 'Setup Fee', value: new Decimal(breakdown?.setupCost || breakdown?.setup_cost || 0) },
      { label: 'Urgency Fee', value: new Decimal(breakdown?.urgencyCost || breakdown?.urgency_cost || 0) }
    ]
    
    const subtotal = costItems.reduce((sum, item) => sum.plus(item.value), new Decimal(0))
    const profitMargin = new Decimal(breakdown?.profitMargin || breakdown?.profit_margin || 0)
    const taxes = new Decimal(breakdown?.taxes || breakdown?.tax_amount || 0)
    const total = new Decimal(breakdown?.total || breakdown?.total_cost || 0)
    
    // Filter out zero-value items for cleaner display
    const nonZeroItems = costItems.filter(item => item.value.gt(0))
    
    const costData = nonZeroItems.map(item => [
      item.label,
      `$${item.value.toFixed(FINANCIAL_PRECISION)}`
    ])
    
    // Add subtotal, margin, and taxes if applicable
    if (nonZeroItems.length > 1) {
      costData.push(['Subtotal', `$${subtotal.toFixed(FINANCIAL_PRECISION)}`])
    }
    
    if (profitMargin.gt(0)) {
      costData.push(['Profit Margin', `$${profitMargin.toFixed(FINANCIAL_PRECISION)}`])
    }
    
    if (taxes.gt(0)) {
      costData.push(['Taxes', `$${taxes.toFixed(FINANCIAL_PRECISION)}`])
    }
    
    // Cost breakdown table
    pdf.autoTable({
      startY: startY + 15,
      body: costData,
      theme: 'plain',
      styles: {
        fontSize: 10,
        textColor: COLORS.text,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 80, halign: 'left' },
        1: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: pageWidth - 140 }
    })
    
    // Total row with enhanced styling
    pdf.autoTable({
      startY: pdf.lastAutoTable.finalY + 2,
      body: [['TOTAL AMOUNT', `$${total.toFixed(FINANCIAL_PRECISION)}`]],
      theme: 'grid',
      styles: {
        fontSize: 14,
        fontStyle: 'bold',
        textColor: COLORS.white,
        cellPadding: 8
      },
      headStyles: {
        fillColor: COLORS.success
      },
      bodyStyles: {
        fillColor: COLORS.success
      },
      columnStyles: {
        0: { cellWidth: 80, halign: 'left' },
        1: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: pageWidth - 140 }
    })
    
    return pdf.lastAutoTable.finalY
  } catch (error: any) {
    console.error('Error adding cost breakdown:', error)
    return startY + 100 // Return fallback position
  }
}

function addTermsAndNotes(pdf: jsPDF, terms?: string, notes?: string, startY: number = 0): void {
  try {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = startY + 30
    
    if (terms && terms.trim()) {
      pdf.setTextColor(...COLORS.primary)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('TERMS & CONDITIONS', 25, yPos)
      
      pdf.setTextColor(...COLORS.text)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      
      const cleanTerms = sanitizeInput(terms)
      const splitTerms = pdf.splitTextToSize(cleanTerms, pageWidth - 50)
      pdf.text(splitTerms, 25, yPos + 12)
      yPos += 20 + (splitTerms.length * 10)
    }
    
    if (notes && notes.trim()) {
      yPos += 15
      pdf.setTextColor(...COLORS.primary)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('ADDITIONAL NOTES', 25, yPos)
      
      pdf.setTextColor(...COLORS.text)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      
      const cleanNotes = sanitizeInput(notes)
      const splitNotes = pdf.splitTextToSize(cleanNotes, pageWidth - 50)
      pdf.text(splitNotes, 25, yPos + 12)
    }
  } catch (error: any) {
    console.error('Error adding terms and notes:', error)
    // Continue without terms/notes if there's an error
  }
}

function addSecureFooter(pdf: jsPDF, quoteNumber: string): void {
  try {
    const pageWidth = pdf.internal.pageSize.width
    const pageHeight = pdf.internal.pageSize.height
    
    // Footer separator
    pdf.setDrawColor(...COLORS.primary)
    pdf.setLineWidth(2)
    pdf.line(25, pageHeight - 40, pageWidth - 25, pageHeight - 40)
    
    // Main footer text
    pdf.setTextColor(...COLORS.text)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Thank you for choosing Reyal 3D Printing Services', pageWidth / 2, pageHeight - 30, { align: 'center' })
    
    // Legal notice
    pdf.setFontSize(8)
    pdf.setTextColor(...COLORS.secondary)
    pdf.text('This quote is confidential and valid for the specified period only. Subject to our terms and conditions.', 
             pageWidth / 2, pageHeight - 22, { align: 'center' })
    
    // Security footer
    pdf.setFontSize(7)
    pdf.text(`Quote ID: ${quoteNumber} | Generated: ${new Date().toISOString()}`, 
             pageWidth / 2, pageHeight - 14, { align: 'center' })
    
    // Page number (if implementing multi-page support)
    pdf.text('Page 1', pageWidth - 30, pageHeight - 10)
  } catch (error: any) {
    console.error('Error adding footer:', error)
    // Continue without footer if there's an error
  }
}

// Main API endpoint
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    const supabase = await createServerClient()
    
    // Enhanced authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || !user.email_confirmed_at) {
      return createSecureResponse({ error: 'Authentication required' }, 401, requestId)
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

    // Apply rate limiting for PDF generation (resource intensive)
    const rateLimitResult = await rateLimit('PDF_GENERATION')(request, user.id, true)
    const rateLimitResponse = await createRateLimitResponse(rateLimitResult, requestId)
    if (rateLimitResponse) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED_PDF', auditContext)
      return rateLimitResponse
    }

    // Parse and validate request body
    let body: any
    try {
      const rawBody = await request.text()
      body = JSON.parse(rawBody)
      
      if (rawBody.length > 100000) { // 10KB limit for quote generation
        await logSecurityEvent('SUSPICIOUS_PAYLOAD_SIZE_QUOTE', {
          ...auditContext,
          payloadSize: rawBody.length
        })
        return createSecureResponse({ error: 'Request too large' }, 413, requestId)
      }
    } catch (parseError) {
      return createSecureResponse({ error: 'Invalid JSON format' }, 400, requestId)
    }

    // Validate input data
    const validation = GenerateQuoteSchema.safeParse(body)
    if (!validation.success) {
      return createSecureResponse({
        error: 'Invalid input data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, 400, requestId)
    }

    const validatedData = validation.data

    // Fetch estimate with comprehensive data and authorization check
    const { data: estimate, error: estimateError } = await supabase
      .rpc('get_estimate_for_quote', {
        p_estimate_id: validatedData.estimateId,
        p_user_id: user.id
      })

    if (estimateError || !estimate) {
      if (estimateError?.code === 'P0001') {
        return createSecureResponse({ error: 'Estimate not found' }, 404, requestId)
      }
      if (estimateError?.code === 'P0002') {
        await logSecurityEvent('UNAUTHORIZED_ESTIMATE_ACCESS', {
          ...auditContext,
          estimateId: validatedData.estimateId
        })
        return createSecureResponse({ error: 'Access denied' }, 403, requestId)
      }
      
      console.error(`Estimate fetch error [${requestId}]:`, estimateError)
      return createSecureResponse({
        error: 'Unable to retrieve estimate',
        code: 'ESTIMATE_FETCH_FAILED'
      }, 500, requestId)
    }

    // Validate estimate has required data for quote generation
    if (!estimate.cost_breakdown?.total || estimate.cost_breakdown.total <= 0) {
      return createSecureResponse({
        error: 'Estimate must have valid cost breakdown to generate quote',
        code: 'INVALID_ESTIMATE_DATA'
      }, 400, requestId)
    }

    // Get company settings with caching
    const { data: company } = await supabase
      .from('company_settings')
      .select('*')
      .single()

    const companyInfo = company || {
      company_name: 'Reyal 3D Printing',
      address: 'Professional 3D Printing Services',
      phone: '+1 (555) 000-0000',
      email: 'quotes@reyal3d.com',
      website: 'www.reyal3d.com',
      default_terms: `1. This quote is valid for ${QUOTE_VALID_DAYS_DEFAULT} days from the date of issue.
2. 50% advance payment required to start production.
3. Final payment due upon completion.
4. Delivery times are estimates and may vary based on complexity.
5. Changes to specifications may affect pricing and delivery time.`
    }

    // Generate secure quote number
    const quoteNumber = `Q${new Date().getFullYear()}${(Date.now().toString().slice(-8))}`
    
    // Prepare quote data
    const quoteData: QuoteData = {
      quoteNumber,
      validUntil: validatedData.validUntil,
      amount: new Decimal(estimate.cost_breakdown.total),
      currency: estimate.currency || 'USD',
      estimate,
      customer: estimate.user,
      company: companyInfo,
      terms: validatedData.terms,
      notes: validatedData.notes
    }

    // Generate PDF with error handling and memory management
    let pdfBuffer: Buffer
    let pdfSize: number
    
    try {
      const pdf = new jsPDF() as AutoTable
      
      // Add watermark if requested
      if (validatedData.includeWatermark) {
        addWatermark(pdf, companyInfo.company_name?.toUpperCase())
      }
      
      // Build PDF content
      addSecureHeader(pdf, companyInfo, quoteNumber)
      
      let yPos = addCompanyInfo(pdf, companyInfo, 90)
      addQuoteDetails(pdf, quoteData)
      
      yPos = Math.max(yPos, 160)
      yPos = addCustomerInfo(pdf, estimate.user, yPos)
      
      yPos += 20
      const tableEndY = addItemsTable(pdf, estimate, yPos)
      
      const breakdownEndY = addEnhancedCostBreakdown(pdf, estimate.cost_breakdown, tableEndY)
      
      addTermsAndNotes(
        pdf, 
        validatedData.terms || companyInfo.default_terms, 
        validatedData.notes,
        breakdownEndY
      )
      
      addSecureFooter(pdf, quoteNumber)
      
      // Generate buffer with size check
      const arrayBuffer = pdf.output('arraybuffer')
      pdfBuffer = Buffer.from(arrayBuffer)
      pdfSize = pdfBuffer.length
      
      if (pdfSize > PDF_MAX_SIZE) {
        throw new Error(`Generated PDF size (${(pdfSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size`)
      }
      
    } catch (pdfError) {
      console.error(`PDF generation error [${requestId}]:`, pdfError)
      return createSecureResponse({
        error: 'Failed to generate PDF',
        code: 'PDF_GENERATION_FAILED'
      }, 500, requestId)
    }

    // Save quote record with atomic transaction
    const { data: savedQuote, error: quoteError } = await supabase
      .rpc('save_quote_atomic', {
        p_quote_data: {
          quote_number: quoteNumber,
          user_id: user.id,
          estimate_id: validatedData.estimateId,
          amount: quoteData.amount.toString(),
          currency: quoteData.currency,
          valid_until: validatedData.validUntil,
          terms: validatedData.terms,
          notes: validatedData.notes,
          status: 'generated',
          pdf_size: pdfSize
        },
        p_audit_context: auditContext,
        p_request_id: requestId
      })

    if (quoteError) {
      console.error(`Quote save error [${requestId}]:`, quoteError)
      return createSecureResponse({
        error: 'Failed to save quote record',
        code: 'QUOTE_SAVE_FAILED'
      }, 500, requestId)
    }

    // Log successful generation
    await supabase
      .from('audit_logs')
      .insert({
        action: 'QUOTE_GENERATED',
        table_name: 'quotes',
        record_id: savedQuote.quote_id,
        user_id: user.id,
        ip_address: auditContext.ipAddress,
        user_agent: auditContext.userAgent,
        metadata: {
          request_id: requestId,
          quote_number: quoteNumber,
          estimate_id: validatedData.estimateId,
          amount: quoteData.amount.toString(),
          pdf_size: pdfSize,
          generation_time: Date.now() - startTime
        }
      })

    // Return PDF with secure headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quote-${quoteNumber}.pdf"`,
        'Content-Length': pdfSize.toString(),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Request-ID': requestId,
        'X-Quote-Number': quoteNumber,
        'X-Generation-Time': (Date.now() - startTime).toString()
      }
    })

  } catch (error: any) {
    console.error(`Quote generation error [${requestId}]:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    if (error instanceof z.ZodError) {
      return createSecureResponse({
        error: 'Invalid input data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, 400, requestId)
    }
    
    return createSecureResponse({
      error: 'Unable to generate quote',
      code: 'QUOTE_GENERATION_FAILED'
    }, 500, requestId)
  }
}

// Optimize for Vercel serverless
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30
