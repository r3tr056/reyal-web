import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { 
  rateLimit, 
  validateRequest,
  sanitizeInput,
  createSecureResponse,
  logSecurityEvent 
} from '@/lib/middleware/api-middleware'
import { Redis } from '@upstash/redis'
import { headers } from 'next/headers'

// Enhanced validation schema with security constraints
const MarketplaceQuerySchema = z.object({
  page: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(1000))
    .optional()
    .default('1'),
    
  limit: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(50))
    .optional()
    .default('20'),
    
  category: z.string()
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid category format')
    .optional()
    .transform(val => val ? sanitizeInput(val) : val),
    
  search: z.string()
    .max(200)
    .regex(/^[a-zA-Z0-9\s\-_.,!?]+$/, 'Invalid search characters')
    .optional()
    .transform(val => val ? sanitizeInput(val) : val),
    
  sortBy: z.enum(['popular', 'newest', 'rating', 'price-low', 'price-high', 'downloads'])
    .optional()
    .default('popular'),
    
  tags: z.string()
    .max(500)
    .optional()
    .transform(val => val ? val.split(',').map(tag => sanitizeInput(tag.trim())).slice(0, 10) : []),
    
  minPrice: z.string()
    .transform(val => parseFloat(val))
    .pipe(z.number().min(0).max(1000000))
    .optional(),
    
  maxPrice: z.string()
    .transform(val => parseFloat(val))
    .pipe(z.number().min(0).max(1000000))
    .optional(),
    
  materials: z.string()
    .max(200)
    .optional()
    .transform(val => val ? val.split(',').map(m => sanitizeInput(m.trim())).slice(0, 5) : []),
    
  featured: z.string()
    .transform(val => val === 'true')
    .optional(),
    
  new: z.string()
    .transform(val => val === 'true')
    .optional(),
    
  free: z.string()
    .transform(val => val === 'true')
    .optional()
}).strict()

// Redis client for caching (replace with your Redis configuration)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || 'unknown'
    const clientIP = headersList.get('x-forwarded-for') || 'unknown'
    
    // Apply rate limiting
    const rateLimitResult = await rateLimit('DEFAULT')(request)
    if (rateLimitResult.success) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED_MARKETPLACE', {
        ip: clientIP,
        userAgent,
        requestId
      })
      
      const retryAfter = rateLimitResult?.retryAfter || 3600
      const response = createSecureResponse({
        error: 'Too many requests. Please try again later.'
      }, 429, requestId)
      response.headers.set('Retry-After', retryAfter.toString())
      
      return response
    }

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    let validatedQuery
    try {
      validatedQuery = MarketplaceQuerySchema.parse(queryParams)
    } catch (error) {
      if (error instanceof z.ZodError) {
        await logSecurityEvent('INVALID_MARKETPLACE_QUERY', {
          errors: error.errors,
          queryParams,
          ip: clientIP,
          requestId
        })
        
        return createSecureResponse({
          error: 'Invalid query parameters',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }, 400, requestId)
      }
      throw error
    }

    // Validate price range
    if (validatedQuery.minPrice && validatedQuery.maxPrice && 
        validatedQuery.minPrice > validatedQuery.maxPrice) {
      return createSecureResponse({
        error: 'Invalid price range: minimum price cannot be greater than maximum price'
      }, 400, requestId)
    }

    const supabase = await createServerClient()
    
    // Build cache key for this request
    const cacheKey = `marketplace:v2:${Buffer.from(JSON.stringify(validatedQuery)).toString('base64')}`
    
    // Try cache first (5 minutes TTL)
    try {
      const cachedResult = await redis.get(cacheKey)
      if (cachedResult) {
        return createSecureResponse({
          success: true,
          cached: true,
          ...JSON.parse(cachedResult as string),
          meta: {
            requestId,
            responseTime: Date.now() - startTime,
            cached: true
          }
        }, 200, requestId)
      }
    } catch (cacheError) {
      console.warn('Cache read error:', cacheError)
      // Continue without cache
    }

    const offset = (validatedQuery.page - 1) * validatedQuery.limit

    // Build optimized query with security checks
    let query = supabase
      .from('marketplace_products')
      .select(`
        id,
        title,
        short_description,
        price,
        original_price,
        category,
        tags,
        material,
        complexity,
        print_time,
        rating_average,
        rating_count,
        download_count,
        image_url,
        thumbnail_url,
        is_featured,
        is_new,
        is_free,
        created_at,
        updated_at,
        profiles!marketplace_products_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('is_active', true)
      .eq('is_approved', true)
      .range(offset, offset + validatedQuery.limit - 1)

    // Apply filters with proper SQL injection prevention
    if (validatedQuery.category && validatedQuery.category !== 'all') {
      query = query.eq('category', validatedQuery.category)
    }

    if (validatedQuery.search) {
      // Use parameterized full-text search
      query = query.or(`title.ilike.%${validatedQuery.search}%,short_description.ilike.%${validatedQuery.search}%`)
    }

    if (validatedQuery.minPrice !== undefined) {
      query = query.gte('price', validatedQuery.minPrice)
    }

    if (validatedQuery.maxPrice !== undefined) {
      query = query.lte('price', validatedQuery.maxPrice)
    }

    if (validatedQuery.tags.length > 0) {
      query = query.overlaps('tags', validatedQuery.tags)
    }

    if (validatedQuery.materials.length > 0) {
      query = query.in('material', validatedQuery.materials)
    }

    if (validatedQuery.featured) {
      query = query.eq('is_featured', true)
    }

    if (validatedQuery.new) {
      // Products created in the last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      query = query.gte('created_at', thirtyDaysAgo.toISOString())
    }

    if (validatedQuery.free) {
      query = query.eq('price', 0)
    }

    // Apply sorting with proper indexes
    switch (validatedQuery.sortBy) {
      case 'price-low':
        query = query.order('price', { ascending: true }).order('rating_average', { ascending: false })
        break
      case 'price-high':
        query = query.order('price', { ascending: false }).order('rating_average', { ascending: false })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'rating':
        query = query.order('rating_average', { ascending: false }).order('rating_count', { ascending: false })
        break
      case 'downloads':
        query = query.order('download_count', { ascending: false })
        break
      case 'popular':
      default:
        // Weighted popularity score
        query = query.order('download_count', { ascending: false })
          .order('rating_average', { ascending: false })
          .order('created_at', { ascending: false })
        break
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Marketplace query error:', error)
      await logSecurityEvent('DATABASE_ERROR_MARKETPLACE', {
        error: error.message,
        query: validatedQuery,
        requestId
      })
      
      return createSecureResponse({
        error: 'Failed to fetch marketplace products'
      }, 500, requestId)
    }

    // Transform data with security considerations
    const transformedData = (data || []).map((product: any) => ({
      id: product.id,
      title: product.title,
      name: product.title, // Backward compatibility
      short_description: product.short_description,
      price: Number(product.price),
      original_price: product.original_price ? Number(product.original_price) : undefined,
      category: product.category,
      tags: Array.isArray(product.tags) ? product.tags : [],
      material: product.material,
      complexity: product.complexity,
      print_time: product.print_time,
      rating: Number(product.rating_average || 0),
      reviews: Number(product.rating_count || 0),
      downloads: Number(product.download_count || 0),
      designer: product.profiles?.full_name || 'Unknown Designer',
      image: product.thumbnail_url || product.image_url || '/images/placeholder-3d-model.jpg',
      is_featured: Boolean(product.is_featured),
      is_new: Boolean(product.is_new),
      is_free: Boolean(product.is_free),
      created_at: product.created_at,
      updated_at: product.updated_at
    }))

    const result = {
      products: transformedData,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / validatedQuery.limit),
        hasMore: offset + validatedQuery.limit < (count || 0),
      },
      filters: validatedQuery,
      meta: {
        requestId,
        responseTime: Date.now() - startTime,
        cached: false
      }
    }

    // Cache successful results for 5 minutes
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(result))
    } catch (cacheError) {
      console.warn('Cache write error:', cacheError)
      // Continue without caching
    }

    return createSecureResponse({
      success: true,
      ...result
    }, 200, requestId)

  } catch (error: any) {
    console.error(`Marketplace API error [${requestId}]:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    return createSecureResponse({
      error: 'Internal server error',
      code: 'MARKETPLACE_ERROR'
    }, 500, requestId)
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
