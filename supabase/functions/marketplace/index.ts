import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: user, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { method } = req
    const url = new URL(req.url)
    const searchParams = url.searchParams

    switch (method) {
      case 'GET':
        // Get marketplace products with advanced filtering
        const category = searchParams.get('category')
        const search = searchParams.get('search')
        const minPrice = searchParams.get('minPrice')
        const maxPrice = searchParams.get('maxPrice')
        const tags = searchParams.getAll('tags')
        const sortBy = searchParams.get('sortBy') || 'popular'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')

        let query = supabase
          .from('marketplace_products')
          .select(`
            *,
            profiles!marketplace_products_user_id_fkey(
              full_name,
              avatar_url
            ),
            product_reviews(
              rating,
              review_text,
              created_at
            )
          `)
          .eq('is_active', true)
          .eq('is_approved', true)

        // Apply filters
        if (category && category !== 'all') {
          query = query.eq('category', category)
        }

        if (search) {
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,short_description.ilike.%${search}%`)
        }

        if (minPrice) {
          query = query.gte('price', parseFloat(minPrice))
        }

        if (maxPrice) {
          query = query.lte('price', parseFloat(maxPrice))
        }

        if (tags && tags.length > 0) {
          query = query.overlaps('tags', tags)
        }

        // Apply sorting
        switch (sortBy) {
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
        const offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)

        const { data: products, error: productsError } = await query

        if (productsError) {
          throw productsError
        }

        // Get total count for pagination
        const { count } = await supabase
          .from('marketplace_products')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('is_approved', true)

        return new Response(
          JSON.stringify({
            products,
            pagination: {
              page,
              limit,
              total: count || 0,
              totalPages: Math.ceil((count || 0) / limit),
              hasMore: offset + limit < (count || 0)
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )

      case 'POST':
        // Create new marketplace product
        const productData = await req.json()
        
        const { data: newProduct, error: createError } = await supabase
          .from('marketplace_products')
          .insert({
            ...productData,
            user_id: user.user.id
          })
          .select()
          .single()

        if (createError) {
          throw createError
        }

        return new Response(
          JSON.stringify(newProduct),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201,
          }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Marketplace function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})