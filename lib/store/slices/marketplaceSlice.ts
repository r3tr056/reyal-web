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

// Mock data for offline development
const MOCK_MARKETPLACE_PRODUCTS: MarketplaceProduct[] = [
  {
    id: '1',
    title: 'Architectural Model House',
    description: 'Detailed architectural model of a modern house with intricate details and realistic proportions. Perfect for presentations, scale models, or educational purposes.',
    short_description: 'Modern house architectural model',
    price: 299,
    original_price: 399,
    category: 'Architecture',
    tags: ['house', 'architecture', 'model', 'building'],
    material: 'PLA',
    complexity: 3,
    print_time: '4.5h',
    rating: 4.8,
    reviews: 24,
    downloads: 156,
    designer: 'ArchViz Pro',
    image: '/api/placeholder/400/300?text=Modern+House',
    images: ['/api/placeholder/400/300?text=Modern+House', '/api/placeholder/400/300?text=House+Side', '/api/placeholder/400/300?text=House+Back'],
    is_featured: true,
    is_new: false,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    user_id: 'user1',
    is_active: true,
    is_approved: true,
  },
  {
    id: '2',
    title: 'Miniature Car Collection Set',
    description: 'A collection of detailed miniature cars including sports cars, vintage models, and modern vehicles. Each model is optimized for 3D printing with fine details.',
    short_description: 'Detailed miniature car models',
    price: 199,
    category: 'Automotive',
    tags: ['cars', 'vehicles', 'miniature', 'collection'],
    material: 'PETG',
    complexity: 2,
    print_time: '2.8h',
    rating: 4.6,
    reviews: 18,
    downloads: 89,
    designer: 'VehicleDesigns',
    image: '/api/placeholder/400/300?text=Miniature+Cars',
    images: ['/api/placeholder/400/300?text=Miniature+Cars'],
    is_featured: true,
    is_new: true,
    created_at: '2024-01-10T14:30:00Z',
    updated_at: '2024-01-10T14:30:00Z',
    user_id: 'user2',
    is_active: true,
    is_approved: true,
  },
  {
    id: '3',
    title: 'Mechanical Gear System',
    description: 'Working mechanical gear system demonstration model. Great for educational purposes and engineering students. All gears are designed to mesh perfectly.',
    short_description: 'Working gear system model',
    price: 149,
    category: 'Engineering',
    tags: ['gears', 'mechanical', 'engineering', 'education'],
    material: 'ABS',
    complexity: 4,
    print_time: '3.2h',
    rating: 4.9,
    reviews: 31,
    downloads: 203,
    designer: 'MechEng Solutions',
    image: '/api/placeholder/400/300?text=Gear+System',
    images: ['/api/placeholder/400/300?text=Gear+System'],
    is_featured: false,
    is_new: false,
    created_at: '2024-01-05T09:15:00Z',
    updated_at: '2024-01-05T09:15:00Z',
    user_id: 'user3',
    is_active: true,
    is_approved: true,
  },
  {
    id: '4',
    title: 'Dragon Fantasy Figure',
    description: 'Highly detailed fantasy dragon figure with intricate scales, wings, and pose. Perfect for gaming, collecting, or display purposes.',
    short_description: 'Detailed fantasy dragon figure',
    price: 349,
    category: 'Gaming',
    tags: ['dragon', 'fantasy', 'figure', 'gaming'],
    material: 'Resin',
    complexity: 5,
    print_time: '6.1h',
    rating: 4.7,
    reviews: 42,
    downloads: 87,
    designer: 'FantasyCreator',
    image: '/api/placeholder/400/300?text=Dragon+Figure',
    images: ['/api/placeholder/400/300?text=Dragon+Figure'],
    is_featured: true,
    is_new: true,
    created_at: '2024-01-20T16:45:00Z',
    updated_at: '2024-01-20T16:45:00Z',
    user_id: 'user4',
    is_active: true,
    is_approved: true,
  },
  {
    id: '5',
    title: 'Smartphone Stand Adjustable',
    description: 'Adjustable smartphone stand with multiple angle positions. Compatible with most phone sizes and includes cable management features.',
    short_description: 'Adjustable phone stand',
    price: 79,
    category: 'Accessories',
    tags: ['phone', 'stand', 'adjustable', 'utility'],
    material: 'PLA',
    complexity: 1,
    print_time: '1.5h',
    rating: 4.4,
    reviews: 67,
    downloads: 312,
    designer: 'UtilityPrints',
    image: '/api/placeholder/400/300?text=Phone+Stand',
    images: ['/api/placeholder/400/300?text=Phone+Stand'],
    is_featured: false,
    is_new: false,
    created_at: '2024-01-12T11:20:00Z',
    updated_at: '2024-01-12T11:20:00Z',
    user_id: 'user5',
    is_active: true,
    is_approved: true,
  },
  {
    id: '6',
    title: 'Articulated Octopus',
    description: 'Fully articulated octopus model that prints in place without supports. Each tentacle can be posed and moved independently.',
    short_description: 'Articulated octopus model',
    price: 129,
    category: 'Art',
    tags: ['octopus', 'articulated', 'flexible', 'art'],
    material: 'TPU',
    complexity: 3,
    print_time: '4.0h',
    rating: 4.5,
    reviews: 29,
    downloads: 145,
    designer: 'FlexiModels',
    image: '/api/placeholder/400/300?text=Articulated+Octopus',
    images: ['/api/placeholder/400/300?text=Articulated+Octopus'],
    is_featured: false,
    is_new: true,
    created_at: '2024-01-18T13:10:00Z',
    updated_at: '2024-01-18T13:10:00Z',
    user_id: 'user6',
    is_active: true,
    is_approved: true,
  }
]

const MOCK_FILTERS: MarketplaceFilters = {
  categories: [
    { name: 'Architecture', count: 12 },
    { name: 'Automotive', count: 8 },
    { name: 'Engineering', count: 15 },
    { name: 'Gaming', count: 22 },
    { name: 'Accessories', count: 18 },
    { name: 'Art', count: 14 }
  ],
  materials: ['PLA', 'ABS', 'PETG', 'TPU', 'Resin'],
  tags: ['house', 'architecture', 'cars', 'vehicles', 'gears', 'mechanical', 'dragon', 'fantasy', 'phone', 'utility'],
  priceRange: { min: 50, max: 500 }
}

const MOCK_STATS: MarketplaceStats = {
  totalProducts: 89,
  uniqueDesigners: 24,
  totalDownloads: 1240,
  averageRating: 4.6
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
      // Use mock data for offline development
      const useMockData = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (useMockData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))
        
        let filteredProducts = [...MOCK_MARKETPLACE_PRODUCTS]
        
        // Apply filters
        if (category && category !== 'all') {
          filteredProducts = filteredProducts.filter(p => p.category.toLowerCase() === category.toLowerCase())
        }
        
        if (search) {
          const searchLower = search.toLowerCase()
          filteredProducts = filteredProducts.filter(p => 
            p.title.toLowerCase().includes(searchLower) ||
            p.description.toLowerCase().includes(searchLower) ||
            p.tags.some(tag => tag.toLowerCase().includes(searchLower))
          )
        }
        
        if (minPrice !== undefined) {
          filteredProducts = filteredProducts.filter(p => p.price >= minPrice)
        }
        
        if (maxPrice !== undefined) {
          filteredProducts = filteredProducts.filter(p => p.price <= maxPrice)
        }
        
        if (materials && materials.length > 0) {
          filteredProducts = filteredProducts.filter(p => materials.includes(p.material))
        }
        
        if (tags && tags.length > 0) {
          filteredProducts = filteredProducts.filter(p => 
            tags.some(tag => p.tags.includes(tag))
          )
        }
        
        // Apply sorting
        switch (sortBy) {
          case 'price-low':
            filteredProducts.sort((a, b) => a.price - b.price)
            break
          case 'price-high':
            filteredProducts.sort((a, b) => b.price - a.price)
            break
          case 'newest':
            filteredProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            break
          case 'rating':
            filteredProducts.sort((a, b) => b.rating - a.rating)
            break
          case 'downloads':
            filteredProducts.sort((a, b) => b.downloads - a.downloads)
            break
          case 'popular':
          default:
            filteredProducts.sort((a, b) => (b.downloads * b.rating) - (a.downloads * a.rating))
            break
        }
        
        // Apply pagination
        const offset = (page - 1) * limit
        const paginatedProducts = filteredProducts.slice(offset, offset + limit)
        
        return {
          products: paginatedProducts,
          total: filteredProducts.length,
          page,
          limit,
          hasMore: offset + limit < filteredProducts.length,
          isAppending: page > 1
        }
      }
      
      // Original Supabase implementation for production
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
      
      const isAppending = page > 1
      return {
        products: transformedData,
        total: count || 0,
        page,
        limit,
        hasMore: offset + limit < (count || 0),
        isAppending
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
      // Use mock data for offline development
      const useMockData = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (useMockData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const featuredProducts = MOCK_MARKETPLACE_PRODUCTS.filter(p => p.is_featured)
        return featuredProducts
      }
      
      // Original Supabase implementation
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
      // Use mock data for offline development
      const useMockData = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (useMockData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200))
        return MOCK_FILTERS
      }
      
      // Original Supabase implementation
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
      // Use mock data for offline development
      const useMockData = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (useMockData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200))
        return MOCK_STATS
      }
      
      // Original Supabase implementation
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
      // Use mock data for offline development
      const useMockData = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (useMockData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const product = MOCK_MARKETPLACE_PRODUCTS.find(p => p.id === productId)
        if (!product) {
          return rejectWithValue('Product not found')
        }
        return product
      }
      
      // Original Supabase implementation
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
