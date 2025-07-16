import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

export async function GET() {
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

    // Get total products count
    const { count: totalProducts } = await supabase
      .from('marketplace_products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_approved', true)

    // Get total unique designers
    const { data: designers } = await supabase
      .from('marketplace_products')
      .select('user_id')
      .eq('is_active', true)
      .eq('is_approved', true)

    const uniqueDesigners = new Set(designers?.map(d => d.user_id) || []).size

    // Get total downloads
    const { data: downloadStats } = await supabase
      .from('marketplace_products')
      .select('download_count')
      .eq('is_active', true)
      .eq('is_approved', true)

    const totalDownloads = downloadStats?.reduce((sum, product) => sum + (product.download_count || 0), 0) || 0

    // Get average rating
    const { data: ratingStats } = await supabase
      .from('marketplace_products')
      .select('rating_average, rating_count')
      .eq('is_active', true)
      .eq('is_approved', true)
      .gt('rating_count', 0)

    let averageRating = 0
    if (ratingStats && ratingStats.length > 0) {
      const totalWeightedRating = ratingStats.reduce((sum, product) => {
        return sum + (product.rating_average || 0) * (product.rating_count || 0)
      }, 0)
      const totalRatingCount = ratingStats.reduce((sum, product) => sum + (product.rating_count || 0), 0)
      averageRating = totalRatingCount > 0 ? totalWeightedRating / totalRatingCount : 0
    }

    return NextResponse.json({
      totalProducts: totalProducts || 0,
      uniqueDesigners,
      totalDownloads,
      averageRating: Math.round(averageRating * 10) / 10
    })

  } catch (error) {
    console.error('Marketplace stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}