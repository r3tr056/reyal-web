import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from './rate-limiter'

export async function securityMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Only set HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // CSP header
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: *.supabase.co; font-src 'self'; connect-src 'self' *.supabase.co wss://*.supabase.co;"
  )

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers })
  }

  // Apply rate limiting based on endpoint
  let rateLimitResult
  const userId = request.headers.get('x-user-id') || undefined

  if (pathname.startsWith('/api/auth')) {
    rateLimitResult = await rateLimiters.auth.limit(request, userId)
  } else if (pathname.startsWith('/api/upload')) {
    rateLimitResult = await rateLimiters.upload.limit(request, userId)
  } else if (pathname.startsWith('/api/')) {
    rateLimitResult = await rateLimiters.api.limit(request, userId)
  } else {
    rateLimitResult = await rateLimiters.web.limit(request, userId)
  }

  if (!rateLimitResult.success) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too many requests',
        retryAfter: rateLimitResult.retryAfter 
      }),
      { 
        status: 429, 
        headers: { 
          'content-type': 'application/json',
          'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        } 
      }
    )
  }

  // Add rate limit headers to successful responses
  response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
  response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())

  return response
}


export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    const cleaned = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:(?!image\/(?:png|jpe?g|gif|svg\+xml))[^;]*;/gi, '')
      .trim()
    
    return cleaned
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = typeof key === 'string' ? sanitizeInput(key) : key
      sanitized[sanitizedKey] = sanitizeInput(value)
    }
    return sanitized
  }
  
  return input
}

export function validateFileMetadata(metadata: string): { isValid: boolean; data?: any; error?: string } {
  try {
    const parsed = JSON.parse(metadata)
    
    // Validate structure
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { isValid: false, error: 'Metadata must be an object' }
    }
    
    // Sanitize all values
    const sanitized = sanitizeInput(parsed)
    
    return { isValid: true, data: sanitized }
  } catch (error) {
    return { isValid: false, error: 'Invalid JSON in metadata' }
  }
}