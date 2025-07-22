import { NextRequest, NextResponse } from 'next/server'
import { API_CONFIG, validateInput } from '@/lib/config/api'
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit result interface
export interface RateLimitResult {
  success: boolean
  retryAfter?: number
  remaining?: number
  limit?: number
  resetTime?: number
}

// Enhanced rate limiting middleware
export function rateLimit(limitType: keyof typeof API_CONFIG.RATE_LIMITS = 'DEFAULT') {
  return async (request: NextRequest, userId?: string, isAdmin?: boolean): Promise<RateLimitResult> => {
    const config = API_CONFIG.RATE_LIMITS[limitType]
    
    // Use admin limits if user is admin
    const actualConfig = isAdmin && limitType === 'DEFAULT' ? API_CONFIG.RATE_LIMITS.ADMIN : config
    
    // Get IP address from headers (works with proxies like Vercel)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0] || realIp || 'anonymous'
    
    const identifier = userId || ip
    const key = `${limitType}:${identifier}`
    const now = Date.now()
    
    let entry = rateLimitStore.get(key)
    
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + actualConfig.windowMs }
    }
    
    entry.count++
    rateLimitStore.set(key, entry)
    
    const remaining = Math.max(0, actualConfig.maxRequests - entry.count)
    
    if (entry.count > actualConfig.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      
      return {
        success: false,
        retryAfter,
        remaining: 0,
        limit: actualConfig.maxRequests,
        resetTime: entry.resetTime
      }
    }
    
    return {
      success: true,
      remaining,
      limit: actualConfig.maxRequests,
      resetTime: entry.resetTime
    }
  }
}

// Helper function to create rate limit exceeded response
export function createRateLimitResponse(
  result: RateLimitResult,
  requestId: string
): NextResponse {
  return NextResponse.json(
    { 
      error: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter
    },
    { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit?.toString() || '0',
        'X-RateLimit-Remaining': result.remaining?.toString() || '0',
        'X-RateLimit-Reset': result.resetTime?.toString() || '0',
        'Retry-After': result.retryAfter?.toString() || '3600',
        'X-Request-ID': requestId
      }
    }
  )
}

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Validation middleware
export function validateRequest(schema: any) {
  return async (data: any) => {
    const validation = validateInput(data, schema)
    
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.errors
        },
        { status: 400 }
      )
    }
    
    return null // Validation passed
  }
}

// Pagination helper
export function getPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(
    API_CONFIG.PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') || API_CONFIG.PAGINATION.DEFAULT_LIMIT.toString()))
  )
  
  return {
    page,
    limit,
    offset: (page - 1) * limit
  }
}

// Admin authorization middleware
export async function requireAdmin(supabase: any, userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()
  
  if (error || !profile?.is_admin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }
  
  return null // User is admin
}

export function createSecureResponse(data: any, status: number = 200, requestId: string): NextResponse {
  const response = NextResponse.json({
    ...data,
    meta: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      ...(data.meta || {})
    }
  }, { status })

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Request-ID', requestId)
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  
  return response
}

export async function logSecurityEvent(
  eventType: string, 
  context: Record<string, any>
): Promise<void> {
  try {
    // Log to your security monitoring system
    console.warn(`SECURITY_EVENT: ${eventType}`, {
      ...context,
      timestamp: new Date().toISOString(),
      severity: 'HIGH'
    })
    
    // You can integrate with external services like:
    // - DataDog
    // - Sentry
    // - Custom security monitoring
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

// Audit logging helper
export async function logAuditEvent(
  supabase: any,
  {
    userId,
    action,
    resource,
    resourceId,
    oldValues,
    newValues,
    ipAddress,
    userAgent
  }: {
    userId: string
    action: string
    resource: string
    resourceId?: string
    oldValues?: any
    newValues?: any
    ipAddress?: string
    userAgent?: string
  }
) {
  if (!API_CONFIG.SECURITY.AUDIT_LOGGING.ENABLED) return
  
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        resource,
        resource_id: resourceId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log audit event:', error)
  }
}

// Error handling middleware
export function handleApiError(error: any, context?: string) {
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error)
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  if (error.code === '23505') { // Unique constraint violation
    return NextResponse.json(
      { error: 'Resource already exists' },
      { status: 409 }
    )
  }
  
  if (error.code === '23503') { // Foreign key constraint violation
    return NextResponse.json(
      { error: 'Referenced resource not found' },
      { status: 400 }
    )
  }
  
  if (error.code === '42P01') { // Table doesn't exist
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 }
    )
  }
  
  return NextResponse.json(
    { 
      error: 'Internal server error',
      ...(isDevelopment && { details: error.message })
    },
    { status: 500 }
  )
}

// Security headers middleware
export function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  return response
}

// CORS middleware for API routes
export function addCorsHeaders(response: NextResponse, origin?: string) {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://reyal.com',
    'https://app.reyal.com'
  ]
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}

// Input sanitization
export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    // Remove potentially dangerous characters
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .trim()
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput)
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }
  
  return data
}

// Response formatting
export function formatSuccessResponse(data: any, message?: string) {
  return NextResponse.json({
    success: true,
    ...(message && { message }),
    ...data
  })
}

export function formatErrorResponse(error: string, status: number = 400, details?: any) {
  return NextResponse.json(
    {
      error,
      ...(details && { details })
    },
    { status }
  )
}

// Currency formatting
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// Date formatting
export function formatDate(date: string | Date, format: 'short' | 'long' | 'iso' = 'iso'): string {
  const d = new Date(date)
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US')
    case 'long':
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    case 'iso':
    default:
      return d.toISOString()
  }
}

// File upload validation
export function validateFileUpload(file: File, allowedTypes?: string[]): { isValid: boolean; error?: string } {
  const types = allowedTypes || API_CONFIG.FILE_UPLOAD.ALLOWED_TYPES
  
  if (file.size > API_CONFIG.FILE_UPLOAD.MAX_SIZE) {
    return {
      isValid: false,
      error: `File size must be less than ${API_CONFIG.FILE_UPLOAD.MAX_SIZE / 1024 / 1024}MB`
    }
  }
  
  if (!types.includes(file.type)) {
    return {
      isValid: false,
      error: `File type must be one of: ${types.join(', ')}`
    }
  }
  
  return { isValid: true }
}

// Generate unique filename
export function generateUniqueFilename(originalName: string, prefix?: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()
  
  return `${prefix || ''}${timestamp}-${random}.${extension}`
}

// Database transaction helper
export async function withTransaction<T>(
  supabase: any,
  callback: (supabase: any) => Promise<T>
): Promise<T> {
  // Note: Supabase doesn't support transactions in the same way as traditional SQL
  // This is a placeholder for future transaction implementation
  try {
    return await callback(supabase)
  } catch (error) {
    // In a real transaction, we would rollback here
    throw error
  }
}
