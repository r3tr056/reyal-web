import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { 
  rateLimit, 
  createSecureResponse,
  logSecurityEvent,
  createRateLimitResponse
} from '@/lib/middleware/api-middleware'

export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('DEFAULT')(request)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, requestId)
    }

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    }

    return createSecureResponse({
      success: true,
      data: health
    }, 200, requestId)

  } catch (error) {
    await logSecurityEvent('health_check_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return createSecureResponse({ 
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, 503, requestId)
  }
}