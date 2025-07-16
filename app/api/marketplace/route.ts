import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

interface MarketplaceFilters {
  category?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  tags?: string[]
  sortBy?: 'popular' | 'price-low' | 'price-high' | 'rating' | 'newest'
  page?: number
  limit?: number
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    const { searchParams } = new URL(request.url)
    
    const filters: MarketplaceFilters = {
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      tags: searchParams.getAll('tags') || [],
      sortBy: (searchParams.get('sortBy') as MarketplaceFilters['sortBy']) || 'popular',
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20
    }

    // Build the query
    let query = supabase
      .from('marketplace_products')
      .select(`
        *,
        profiles!marketplace_products_user_id_fkey(
          full_name,
          avatar_url
        )
      `)
      .eq('is_active', true)
      .eq('is_approved', true)

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,short_description.ilike.%${filters.search}%`)
    }

    if (filters.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice)
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice)
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'price-low':
        query = query.order('price', { ascending: true })
        break
      case 'price-high':
        query = query.order('price', { ascending: false })
        break
      case 'rating':
        query = query.order('rating_average', { ascending: false })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'popular':
      default:
        query = query.order('download_count', { ascending: false })
        break
    }

    // Apply pagination
    const offset = (filters.page - 1) * filters.limit
    query = query.range(offset, offset + filters.limit - 1)

    const { data: products, error, count } = await query

    if (error) {
      console.error('Error fetching marketplace products:', error)
      return NextResponse.json(
        { error: 'Failed to fetch marketplace products' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('marketplace_products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_approved', true)

    // Transform the data to match the frontend expectations
    const transformedProducts = products?.map(product => ({
      id: product.id,
      name: product.title,
      price: product.price,
      originalPrice: product.original_price,
      image: product.preview_images?.[0] || '/placeholder.svg?height=400&width=400',
      rating: product.rating_average || 0,
      reviews: product.rating_count || 0,
      category: product.category,
      tags: product.tags || [],
      designer: product.profiles?.full_name || 'Anonymous',
      downloads: product.download_count || 0,
      material: product.material_codes?.[0] || 'PLA',
      printTime: product.print_time_hours ? `${product.print_time_hours}h` : 'N/A',
      isNew: product.created_at ? new Date(product.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false,
      isFeatured: product.is_featured || false,
      complexity: product.complexity || 3,
      description: product.description,
      shortDescription: product.short_description,
      dimensions: product.dimensions,
      previewImages: product.preview_images || [],
      fileSize: product.file_size_mb,
      supportsRequired: product.supports_required,
      infillPercentage: product.infill_percentage
    }))

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / filters.limit),
        hasMore: offset + filters.limit < (totalCount || 0)
      },
      filters: filters
    })

  } catch (error) {
    console.error('Marketplace API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}