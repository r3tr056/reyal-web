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
    
    // Apply rate limiting
    const rateLimitResult = await rateLimit('FILTERS_READ')(request)
    if (!rateLimitResult.success) {
      return createSecureResponse({
        error: 'Too many requests for filters',
        retryAfter: rateLimitResult.retryAfter
      }, 429, requestId)
    }

    // Check cache first (30 minutes TTL for filters)
    const cacheKey = 'marketplace:filters:v1'
    
    try {
      const cachedFilters = await redis.get(cacheKey)
      if (cachedFilters) {
        return createSecureResponse({
          success: true,
          cached: true,
          ...JSON.parse(cachedFilters as string),
          meta: {
            requestId,
            responseTime: Date.now() - startTime,
            cached: true
          }
        }, 200, requestId)
      }
    } catch (cacheError) {
      console.warn('Filters cache read error:', cacheError)
    }

    const supabase = await createServerClient()

    // Execute all queries in parallel
    const [
      { data: categories, error: categoriesError },
      { data: products, error: productsError },
      { data: materials, error: materialsError }
    ] = await Promise.all([
      // Get categories
      supabase
        .from('product_categories')
        .select('id, name, slug, description, icon, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),

      // Get products for tag extraction
      supabase
        .from('marketplace_products')
        .select('tags, material')
        .eq('is_active', true)
        .eq('is_approved', true),

      // Get materials
      supabase
        .from('materials')
        .select('name, code, display_name')
        .eq('available', true)
        .order('name', { ascending: true })
    ])

    // Handle errors
    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return createSecureResponse({
        error: 'Failed to fetch categories'
      }, 500, requestId)
    }

    if (productsError) {
      console.error('Error fetching product tags:', productsError)
      return createSecureResponse({
        error: 'Failed to fetch product filters'
      }, 500, requestId)
    }

    if (materialsError) {
      console.error('Error fetching materials:', materialsError)
      return createSecureResponse({
        error: 'Failed to fetch materials'
      }, 500, requestId)
    }

    // Extract and process tags with frequency counting
    const tagFrequency = new Map<string, number>()
    const materialSet = new Set<string>()

    products?.forEach((product: any) => {
      // Process tags
      if (Array.isArray(product.tags)) {
        product.tags.forEach((tag: string) => {
          if (typeof tag === 'string' && tag.trim().length > 0) {
            const normalizedTag = tag.trim().toLowerCase()
            tagFrequency.set(normalizedTag, (tagFrequency.get(normalizedTag) || 0) + 1)
          }
        })
      }

      // Collect materials from products
      if (product.material && typeof product.material === 'string') {
        materialSet.add(product.material)
      }
    })

    // Convert tags to sorted array (by frequency, then alphabetically)
    const sortedTags = Array.from(tagFrequency.entries())
      .filter(([tag, frequency]) => frequency >= 2) // Only include tags used by at least 2 products
      .sort((a, b) => {
        // Sort by frequency (descending), then alphabetically
        if (b[1] !== a[1]) return b[1] - a[1]
        return a[0].localeCompare(b[0])
      })
      .map(([tag]) => tag)
      .slice(0, 50) // Limit to top 50 tags

    // Process categories with security validation
    const processedCategories = (categories || []).map(cat => ({
      id: cat.id,
      name: cat.name || 'Unknown',
      slug: cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
      description: cat.description || '',
      icon: cat.icon || 'folder',
      sort_order: cat.sort_order || 999
    }))

    // Process materials with fallbacks
    const processedMaterials = (materials || []).map(mat => ({
      name: mat.display_name || mat.name,
      code: mat.code || mat.name.toLowerCase().replace(/\s+/g, '_')
    }))

    // Add materials found in products but not in materials table
    materialSet.forEach(material => {
      if (!processedMaterials.find(m => m.name === material)) {
        processedMaterials.push({
          name: material,
          code: material.toLowerCase().replace(/\s+/g, '_')
        })
      }
    })

    // Sort materials alphabetically
    processedMaterials.sort((a, b) => a.name.localeCompare(b.name))

    const filtersData = {
      categories: processedCategories,
      tags: sortedTags,
      materials: processedMaterials,
      priceRange: {
        min: 0,
        max: 2000,
        step: 50
      },
      complexity: {
        min: 1,
        max: 5,
        labels: ['Beginner', 'Easy', 'Medium', 'Advanced', 'Expert']
      },
      lastUpdated: new Date().toISOString()
    }

    // Cache for 30 minutes
    try {
      await redis.setex(cacheKey, 1800, JSON.stringify(filtersData))
    } catch (cacheError) {
      console.warn('Filters cache write error:', cacheError)
    }

    return createSecureResponse({
      success: true,
      ...filtersData,
      meta: {
      requestId,
      responseTime: Date.now() - startTime,
      cached: false
      }
    }, 200, requestId)

  } catch (error) {
    console.error(`Marketplace filters API error [${requestId}]:`, error)
    
    return createSecureResponse({
      error: 'Failed to fetch marketplace filters',
      code: 'FILTERS_ERROR'
    }, 500, requestId)
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
