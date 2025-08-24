import { NextRequest } from "next/server";
import { createServerClient } from "../supabase/server";

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (req: NextRequest) => string
  skipFailedRequests?: boolean
  skipSuccessfulRequests?: boolean
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

class SupabaseRateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async limit(request: NextRequest, userId?: string): Promise<RateLimitResult> {
    try {
      const supabase = await createServerClient()
      const ip = this.getClientIP(request)
      const endpoint = this.getEndpoint(request)
      const userAgent = request.headers.get('user-agent') || 'unknown'

      // Check rate limit
      const { data: checkResult, error: checkError } = await supabase
        .rpc('check_rate_limit', {
          p_user_id: userId || null,
          p_ip: ip,
          p_endpoint: endpoint,
          p_max_requests: this.config.maxRequests,
          p_time_window: `${this.config.windowMs / 1000} seconds`
        })

      if (checkError) {
        console.error('Rate limit check error:', checkError)
        // Fail open - allow request if check fails
        return this.successResult()
      }

      const result = checkResult as {
        allowed: boolean
        current_requests: number
        max_requests: number
        remaining?: number
        retry_after?: number
      }

      if (!result.allowed) {
        return {
          success: false,
          limit: result.max_requests,
          remaining: 0,
          reset: Date.now() + (result.retry_after || this.config.windowMs),
          retryAfter: Math.ceil(result.retry_after || this.config.windowMs / 1000)
        }
      }

      // Log the request (don't await to avoid blocking)
      supabase
        .rpc('log_rate_limit_request', {
          p_user_id: userId || null,
          p_ip: ip,
          p_endpoint: endpoint,
          p_user_agent: userAgent
        })

      return {
        success: true,
        limit: result.max_requests,
        remaining: result.remaining || 0,
        reset: Date.now() + this.config.windowMs
      }

    } catch (error) {
      console.error('Rate limiter error:', error)
      // Fail open - allow request if limiter fails
      return this.successResult()
    }
  }

  private getClientIP(request: NextRequest): string {
    // Get IP from various headers (Vercel provides these)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    return realIP || cfConnectingIP || '127.0.0.1'
  }

  private getEndpoint(request: NextRequest): string {
    const { pathname } = request.nextUrl
    
    // Normalize API endpoints for rate limiting
    if (pathname.startsWith('/api/')) {
      // Group similar endpoints together
      if (pathname.startsWith('/api/upload')) return '/api/upload'
      if (pathname.startsWith('/api/auth')) return '/api/auth'
      if (pathname.startsWith('/api/admin')) return '/api/admin'
      if (pathname.startsWith('/api/marketplace')) return '/api/marketplace'
      
      return pathname
    }
    
    return 'web'
  }

  private successResult(): RateLimitResult {
    return {
      success: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - 1,
      reset: Date.now() + this.config.windowMs
    }
  }
}

// Factory function to create rate limiters with different configs
export function createRateLimiter(config: RateLimitConfig): SupabaseRateLimiter {
  return new SupabaseRateLimiter(config)
}

// Predefined rate limiters for different use cases
export const rateLimiters = {
  // Very strict for auth endpoints
  auth: createRateLimiter({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  }),
  
  // Moderate for file uploads
  upload: createRateLimiter({
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  }),
  
  // Generous for API requests
  api: createRateLimiter({
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
  }),
  
  // Very generous for web requests
  web: createRateLimiter({
    maxRequests: 200,
    windowMs: 60 * 60 * 1000, // 1 hour
  }),
}

// Helper function for easy middleware usage
export async function rateLimit(
  request: NextRequest,
  config?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const defaultConfig: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
  }
  
  const limiter = createRateLimiter({ ...defaultConfig, ...config })
  const userId = request.headers.get('x-user-id') || undefined
  
  return limiter.limit(request, userId)
}