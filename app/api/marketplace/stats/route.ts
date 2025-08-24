import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { 
  rateLimit,
  createSecureResponse,
  logSecurityEvent 
} from '@/lib/middleware/api-middleware'
import { Redis } from '@upstash/redis'
import { headers } from 'next/headers'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    const headersList = await headers()
    const clientIP = headersList.get('x-forwarded-for') || 'unknown'
    
    // Apply rate limiting - more permissive for stats
    const rateLimitResult = await rateLimit('STATS_READ')(request)
    if (!rateLimitResult.success) {
      return createSecureResponse({
        error: 'Too many requests for stats',
        retryAfter: rateLimitResult.retryAfter
      }, 429, requestId)
    }

    // Check cache first (15 minutes TTL for stats)
    const cacheKey = 'marketplace:stats:v1'
    
    try {
      const cachedStats = await redis.get(cacheKey)
      if (cachedStats) {
        return createSecureResponse({
          success: true,
          cached: true,
          ...JSON.parse(cachedStats as string),
          meta: {
            requestId,
            responseTime: Date.now() - startTime,
            cached: true
          }
        }, 200, requestId)
      }
    } catch (cacheError) {
      console.warn('Stats cache read error:', cacheError)
    }

    const supabase = await createServerClient()

    // Execute all queries in parallel for better performance
    const [
      { count: totalProducts },
      { data: designers },
      { data: downloadStats },
      { data: ratingStats }
    ] = await Promise.all([
      // Total products count
      supabase
        .from('marketplace_products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('is_approved', true),

      // Unique designers
      supabase
        .from('marketplace_products')
        .select('user_id')
        .eq('is_active', true)
        .eq('is_approved', true),

      // Download statistics
      supabase
        .from('marketplace_products')
        .select('download_count')
        .eq('is_active', true)
        .eq('is_approved', true),

      // Rating statistics
      supabase
        .from('marketplace_products')
        .select('rating_average, rating_count')
        .eq('is_active', true)
        .eq('is_approved', true)
        .gt('rating_count', 0)
    ])

    // Calculate unique designers
    const uniqueDesigners = new Set(designers?.map(d => d.user_id) || []).size

    // Calculate total downloads with safety checks
    const totalDownloads = downloadStats?.reduce((sum, product) => {
      const downloads = Number(product.download_count) || 0
      return sum + downloads
    }, 0) || 0

    // Calculate weighted average rating
    let averageRating = 0
    if (ratingStats && ratingStats.length > 0) {
      const totalWeightedRating = ratingStats.reduce((sum, product) => {
        const rating = Number(product.rating_average) || 0
        const count = Number(product.rating_count) || 0
        return sum + (rating * count)
      }, 0)
      
      const totalRatingCount = ratingStats.reduce((sum, product) => {
        return sum + (Number(product.rating_count) || 0)
      }, 0)
      
      averageRating = totalRatingCount > 0 ? totalWeightedRating / totalRatingCount : 0
    }

    const stats = {
      totalProducts: totalProducts || 0,
      uniqueDesigners,
      totalDownloads,
      averageRating: Math.round(averageRating * 10) / 10,
      lastUpdated: new Date().toISOString()
    }

    // Cache for 15 minutes
    try {
      await redis.setex(cacheKey, 900, JSON.stringify(stats))
    } catch (cacheError) {
      console.warn('Stats cache write error:', cacheError)
    }

    return createSecureResponse({
      success: true,
      ...stats,
      meta: {
        requestId,
        responseTime: Date.now() - startTime,
        cached: false
      }
    }, 200, requestId)

  } catch (error) {
    console.error(`Marketplace stats API error [${requestId}]:`, error)
    
    return createSecureResponse({
      error: 'Failed to fetch marketplace statistics',
      code: 'STATS_ERROR'
    }, 500, requestId)
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
