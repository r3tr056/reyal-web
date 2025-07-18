import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { supabase } from '@/lib/supabase/client'

export interface MarketplaceProduct {
  id: string
  title: string
  description: string
  short_description: string
  price: number
  original_price?: number
  category: string
  tags: string[]
  material: string
  complexity: number
  print_time: string
  rating: number
  reviews: number
  downloads: number
  designer: string
  image: string
  images: string[]
  is_featured: boolean
  is_new: boolean
  created_at: string
  updated_at: string
  user_id: string
  is_active: boolean
  is_approved: boolean
}

export interface MarketplaceFilters {
  categories: Array<{ name: string; count: number }>
  materials: string[]
  tags: string[]
  priceRange: { min: number; max: number }
}

export interface MarketplaceStats {
  totalProducts: number
  uniqueDesigners: number
  totalDownloads: number
  averageRating: number
}

export interface MarketplaceState {
  products: MarketplaceProduct[]
  filteredProducts: MarketplaceProduct[]
  featuredProducts: MarketplaceProduct[]
  currentProduct: MarketplaceProduct | null
  loading: boolean
  loadingMore: boolean
  error: string | null
  filters: {
    search: string
    category: string
    tags: string[]
    priceRange: [number, number]
    sortBy: string
    materials: string[]
  }
  filtersData: MarketplaceFilters
  stats: MarketplaceStats
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
  viewMode: 'grid' | 'list'
  likedProducts: string[]
}

const initialState: MarketplaceState = {
  products: [],
  filteredProducts: [],
  featuredProducts: [],
  currentProduct: null,
  loading: false,
  loadingMore: false,
  error: null,
  filters: {
    search: '',
    category: 'all',
    tags: [],
    priceRange: [0, 2000],
    sortBy: 'popular',
    materials: [],
  },
  filtersData: {
    categories: [],
    materials: [],
    tags: [],
    priceRange: { min: 0, max: 2000 },
  },
  stats: {
    totalProducts: 0,
    uniqueDesigners: 0,
    totalDownloads: 0,
    averageRating: 0,
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  },
  viewMode: 'grid',
  likedProducts: [],
}

export const fetchMarketplaceProducts = createAsyncThunk(
  'marketplace/fetchProducts',
  async (
    {
      page = 1,
      limit = 20,
      category,
      search,
      sortBy = 'popular',
      tags,
      minPrice,
      maxPrice,
      materials,
    }: {
      page?: number
      limit?: number
      category?: string
      search?: string
      sortBy?: string
      tags?: string[]
      minPrice?: number
      maxPrice?: number
      materials?: string[]
    },
    { rejectWithValue }
  ) => {
    try {
      const offset = (page - 1) * limit
      let query = supabase()
        .from('marketplace_products')
        .select(`
          *,
          profiles!marketplace_products_user_id_fkey(
            full_name,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('is_active', true)
        .eq('is_approved', true)
        .range(offset, offset + limit - 1)

      // Apply filters
      if (category && category !== 'all') {
        query = query.eq('category', category)
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,short_description.ilike.%${search}%`)
      }

      if (minPrice !== undefined) {
        query = query.gte('price', minPrice)
      }

      if (maxPrice !== undefined) {
        query = query.lte('price', maxPrice)
      }

      if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags)
      }

      if (materials && materials.length > 0) {
        query = query.in('material', materials)
      }

      // Apply sorting
      switch (sortBy) {
        case 'price-low':
          query = query.order('price', { ascending: true })
          break
        case 'price-high':
          query = query.order('price', { ascending: false })
          break
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'rating':
          query = query.order('rating', { ascending: false })
          break
        case 'downloads':
          query = query.order('downloads', { ascending: false })
          break
        case 'popular':
        default:
          query = query.order('downloads', { ascending: false }).order('rating', { ascending: false })
          break
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching marketplace products:', error)
        return rejectWithValue(error.message)
      }

      // Transform data to include designer name
      const transformedData = (data || []).map((product: any) => ({
        ...product,
        designer: product.profiles?.full_name || 'Unknown Designer',
      }))

      return {
        products: transformedData,
        total: count || 0,
        page,
        limit,
        hasMore: offset + limit < (count || 0),
      }
    } catch (error: any) {
      console.error('Error fetching marketplace products:', error)
      return rejectWithValue('Failed to fetch products')
    }
  }
)

export const fetchFeaturedProducts = createAsyncThunk(
  'marketplace/fetchFeatured',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase()
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
        .eq('is_featured', true)
        .order('downloads', { ascending: false })
        .limit(8)

      if (error) {
        console.error('Error fetching featured products:', error)
        return rejectWithValue(error.message)
      }

      return (data || []).map((product: any) => ({
        ...product,
        designer: product.profiles?.full_name || 'Unknown Designer',
      }))
    } catch (error: any) {
      console.error('Error fetching featured products:', error)
      return rejectWithValue('Failed to fetch featured products')
    }
  }
)

export const fetchMarketplaceFilters = createAsyncThunk(
  'marketplace/fetchFilters',
  async (_, { rejectWithValue }) => {
    try {
      // Get categories with counts
      const { data: categoriesData, error: categoriesError } = await supabase()
        .from('marketplace_products')
        .select('category')
        .eq('is_active', true)
        .eq('is_approved', true)

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError)
        return rejectWithValue(categoriesError.message)
      }

      // Process categories
      const categoryCount: { [key: string]: number } = {}
      categoriesData?.forEach((item: any) => {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1
      })

      const categories = Object.entries(categoryCount).map(([name, count]) => ({
        name,
        count,
      }))

      // Get all unique materials and tags
      const { data: filtersData, error: filtersError } = await supabase()
        .from('marketplace_products')
        .select('material, tags, price')
        .eq('is_active', true)
        .eq('is_approved', true)

      if (filtersError) {
        console.error('Error fetching filters data:', filtersError)
        return rejectWithValue(filtersError.message)
      }

      const materials = new Set<string>()
      const tags = new Set<string>()
      const prices: number[] = []

      filtersData?.forEach((item: any) => {
        if (item.material) materials.add(item.material)
        if (item.tags) item.tags.forEach((tag: string) => tags.add(tag))
        if (item.price) prices.push(item.price)
      })

      const priceRange = {
        min: Math.min(...prices) || 0,
        max: Math.max(...prices) || 2000,
      }

      return {
        categories,
        materials: Array.from(materials),
        tags: Array.from(tags),
        priceRange,
      }
    } catch (error: any) {
      console.error('Error fetching marketplace filters:', error)
      return rejectWithValue('Failed to fetch filters')
    }
  }
)

export const fetchMarketplaceStats = createAsyncThunk(
  'marketplace/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase()
        .from('marketplace_products')
        .select('downloads, rating, user_id')
        .eq('is_active', true)
        .eq('is_approved', true)

      if (error) {
        console.error('Error fetching marketplace stats:', error)
        return rejectWithValue(error.message)
      }

      const totalProducts = data?.length || 0
      const uniqueDesigners = new Set(data?.map((item: any) => item.user_id)).size
      const totalDownloads = data?.reduce((sum: number, item: any) => sum + (item.downloads || 0), 0) || 0
      const averageRating = data?.reduce((sum: number, item: any) => sum + (item.rating || 0), 0) / totalProducts || 0

      return {
        totalProducts,
        uniqueDesigners,
        totalDownloads,
        averageRating: Math.round(averageRating * 10) / 10,
      }
    } catch (error: any) {
      console.error('Error fetching marketplace stats:', error)
      return rejectWithValue('Failed to fetch stats')
    }
  }
)

export const fetchProductById = createAsyncThunk(
  'marketplace/fetchProductById',
  async (productId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase()
        .from('marketplace_products')
        .select(`
          *,
          profiles!marketplace_products_user_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('id', productId)
        .eq('is_active', true)
        .eq('is_approved', true)
        .single()

      if (error) {
        console.error('Error fetching product:', error)
        return rejectWithValue(error.message)
      }

      return {
        ...data,
        designer: data.profiles?.full_name || 'Unknown Designer',
      }
    } catch (error: any) {
      console.error('Error fetching product:', error)
      return rejectWithValue('Failed to fetch product details')
    }
  }
)

export const toggleProductLike = createAsyncThunk(
  'marketplace/toggleLike',
  async (productId: string, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState() as any
      
      if (!auth.user) {
        return rejectWithValue('Please sign in to like products')
      }

      // Check if already liked
      const { data: existingLike } = await supabase()
        .from('product_likes')
        .select('id')
        .eq('user_id', auth.user.id)
        .eq('product_id', productId)
        .single()

      if (existingLike) {
        // Remove like
        const { error } = await supabase()
          .from('product_likes')
          .delete()
          .eq('id', existingLike.id)

        if (error) {
          console.error('Error removing like:', error)
          return rejectWithValue(error.message)
        }

        return { productId, liked: false }
      } else {
        // Add like
        const { error } = await supabase()
          .from('product_likes')
          .insert({
            user_id: auth.user.id,
            product_id: productId,
          })

        if (error) {
          console.error('Error adding like:', error)
          return rejectWithValue(error.message)
        }

        return { productId, liked: true }
      }
    } catch (error: any) {
      console.error('Error toggling product like:', error)
      return rejectWithValue('Failed to update like status')
    }
  }
)

const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setFilters: (state, action: PayloadAction<Partial<typeof initialState.filters>>) => {
      state.filters = { ...state.filters, ...action.payload }
      state.pagination.page = 1 // Reset page when filters change
    },
    setViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
      state.viewMode = action.payload
    },
    resetFilters: (state) => {
      state.filters = initialState.filters
      state.pagination.page = 1
    },
    resetPagination: (state) => {
      state.pagination = { ...initialState.pagination }
    },
    addToLikedProducts: (state, action: PayloadAction<string>) => {
      if (!state.likedProducts.includes(action.payload)) {
        state.likedProducts.push(action.payload)
      }
    },
    removeFromLikedProducts: (state, action: PayloadAction<string>) => {
      state.likedProducts = state.likedProducts.filter(id => id !== action.payload)
    },
    clearProducts: (state) => {
      state.products = []
      state.filteredProducts = []
      state.currentProduct = null
      state.pagination = { ...initialState.pagination }
    },
  },
  extraReducers: (builder) => {
    // Fetch Products
    builder
      .addCase(fetchMarketplaceProducts.pending, (state, action) => {
        if (action.meta.arg.page === 1) {
          state.loading = true
        } else {
          state.loadingMore = true
        }
        state.error = null
      })
      .addCase(fetchMarketplaceProducts.fulfilled, (state, action) => {
        state.loading = false
        state.loadingMore = false
        
        if (action.payload.page === 1) {
          state.products = action.payload.products
          state.filteredProducts = action.payload.products
        } else {
          state.products.push(...action.payload.products)
          state.filteredProducts.push(...action.payload.products)
        }
        
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        }
        state.error = null
      })
      .addCase(fetchMarketplaceProducts.rejected, (state, action) => {
        state.loading = false
        state.loadingMore = false
        state.error = action.payload as string
      })

    // Fetch Featured Products
    builder
      .addCase(fetchFeaturedProducts.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.loading = false
        state.featuredProducts = action.payload
        state.error = null
      })
      .addCase(fetchFeaturedProducts.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Fetch Filters
    builder
      .addCase(fetchMarketplaceFilters.fulfilled, (state, action) => {
        state.filtersData = action.payload
      })

    // Fetch Stats
    builder
      .addCase(fetchMarketplaceStats.fulfilled, (state, action) => {
        state.stats = action.payload
      })

    // Fetch Product by ID
    builder
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false
        state.currentProduct = action.payload
        state.error = null
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Toggle Like
    builder
      .addCase(toggleProductLike.fulfilled, (state, action) => {
        const { productId, liked } = action.payload
        if (liked) {
          if (!state.likedProducts.includes(productId)) {
            state.likedProducts.push(productId)
          }
        } else {
          state.likedProducts = state.likedProducts.filter(id => id !== productId)
        }
      })
  },
})

export const {
  clearError,
  setFilters,
  setViewMode,
  resetFilters,
  resetPagination,
  addToLikedProducts,
  removeFromLikedProducts,
  clearProducts,
} = marketplaceSlice.actions

export default marketplaceSlice.reducer
