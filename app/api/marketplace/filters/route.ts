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

    // Get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    // Get all available tags from marketplace products
    const { data: products, error: productsError } = await supabase
      .from('marketplace_products')
      .select('tags')
      .eq('is_active', true)
      .eq('is_approved', true)

    if (productsError) {
      console.error('Error fetching product tags:', productsError)
      return NextResponse.json(
        { error: 'Failed to fetch product tags' },
        { status: 500 }
      )
    }

    // Extract unique tags
    const allTags = new Set<string>()
    products?.forEach(product => {
      product.tags?.forEach(tag => allTags.add(tag))
    })

    const uniqueTags = Array.from(allTags).sort()

    // Get materials
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('name, code')
      .eq('available', true)
      .order('name')

    if (materialsError) {
      console.error('Error fetching materials:', materialsError)
      return NextResponse.json(
        { error: 'Failed to fetch materials' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      categories: categories?.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon
      })) || [],
      tags: uniqueTags,
      materials: materials?.map(mat => ({
        name: mat.name,
        code: mat.code
      })) || []
    })

  } catch (error) {
    console.error('Marketplace filters API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}