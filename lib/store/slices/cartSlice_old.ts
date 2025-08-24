import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { supabase } from '@/lib/supabase/client'

export interface CartItem {
  id: string
  user_id: string
  quote_id: string
  quantity: number
  created_at: string
  quote?: {
    id: string
    file_id: string
    total_cost: number
    settings: {
      material: string
      quality: string
      infill_percentage: number
      layer_height: number
      color?: string
    }
    files?: {
      original_filename: string
      file_type: string
    }
  }
  // Local cart item properties for better UX
  name?: string
  price?: number
  image?: string
  material?: string
  color?: string
  quality?: string
  printTime?: string
  rating?: number
  reviews?: number
  designer?: string
  isFeatured?: boolean
  isNew?: boolean
}

export interface CartState {
  items: CartItem[]
  loading: boolean
  error: string | null
  total: number
  itemCount: number
  promoCode: string
  promoDiscount: number
  appliedPromo: string
}

const initialState: CartState = {
  items: [],
  loading: false,
  error: null,
  total: 0,
  itemCount: 0,
  promoCode: '',
  promoDiscount: 0,
  appliedPromo: '',
}



export const fetchCartItems = createAsyncThunk(
  'cart/fetchItems',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase().auth.getUser()
      
      if (!user) {
        return []
      }

      const { data, error } = await supabase()
        .from('cart_items')
        .select(`
          *,
          quotes (
            *,
            files (
              original_filename,
              file_type
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching cart items:', error)
        return rejectWithValue(error.message)
      }

      return data || []
    } catch (error: any) {
      console.error('Error fetching cart items:', error)
      return rejectWithValue('Failed to fetch cart items')
    }
  }
)

export const addToCart = createAsyncThunk(
  'cart/addItem',
  async ({ quoteId, quantity = 1 }: { quoteId: string; quantity?: number }, { rejectWithValue, getState }) => {
    try {
      // Use mock data for offline development
      const useMockData = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (useMockData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 400))
        
        // Create a mock cart item
        const mockItem: CartItem = {
          id: `cart_${Date.now()}`,
          user_id: 'mock_user',
          quote_id: quoteId,
          quantity,
          created_at: new Date().toISOString(),
          name: `Product for Quote ${quoteId}`,
          price: 199,
          image: '/api/placeholder/150/150?text=New+Item',
          material: 'PLA',
          color: 'White',
          quality: 'Standard (0.2mm)',
          printTime: '3.0h',
          rating: 4.5,
          reviews: 10,
          designer: 'Mock Designer',
          isFeatured: false,
          isNew: true,
          quote: {
            id: quoteId,
            file_id: `file_${quoteId}`,
            total_cost: 199,
            settings: {
              material: 'PLA',
              quality: 'standard',
              infill_percentage: 20,
              layer_height: 0.2,
              color: 'White'
            },
            files: {
              original_filename: 'mock_model.stl',
              file_type: 'stl'
            }
          }
        }
        
        return mockItem
      }
      
      // Original Supabase implementation
      const { data: { user } } = await supabase().auth.getUser()
      
      if (!user) {
        return rejectWithValue('Please sign in to add items to cart')
      }

      // Check if item already exists in cart
      const { data: existingItem } = await supabase()
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('quote_id', quoteId)
        .single()

      if (existingItem) {
        // Update quantity
        const { data, error } = await supabase()
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id)
          .select(`
            *,
            quotes (
              *,
              files (
                original_filename,
                file_type
              )
            )
          `)
          .single()

        if (error) {
          console.error('Error updating cart item:', error)
          return rejectWithValue(error.message)
        }

        return data
      } else {
        // Add new item
        const { data, error } = await supabase()
          .from('cart_items')
          .insert({
            user_id: user.id,
            quote_id: quoteId,
            quantity,
          })
          .select(`
            *,
            quotes (
              *,
              files (
                original_filename,
                file_type
              )
            )
          `)
          .single()

        if (error) {
          console.error('Error adding to cart:', error)
          return rejectWithValue(error.message)
        }

        return data
      }
    } catch (error: any) {
      console.error('Error adding to cart:', error)
      return rejectWithValue('Failed to add item to cart')
    }
  }
)

export const updateCartItemQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async ({ itemId, quantity }: { itemId: string; quantity: number }, { rejectWithValue }) => {
    try {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        const { error } = await supabase()
          .from('cart_items')
          .delete()
          .eq('id', itemId)

        if (error) {
          console.error('Error removing cart item:', error)
          return rejectWithValue(error.message)
        }

        return { itemId, removed: true }
      }

      const { data, error } = await supabase()
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)
        .select(`
          *,
          quotes (
            *,
            files (
              original_filename,
              file_type
            )
          )
        `)
        .single()

      if (error) {
        console.error('Error updating cart item quantity:', error)
        return rejectWithValue(error.message)
      }

      return data
    } catch (error: any) {
      console.error('Error updating cart item quantity:', error)
      return rejectWithValue('Failed to update item quantity')
    }
  }
)

export const removeFromCart = createAsyncThunk(
  'cart/removeItem',
  async (itemId: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase()
        .from('cart_items')
        .delete()
        .eq('id', itemId)

      if (error) {
        console.error('Error removing cart item:', error)
        return rejectWithValue(error.message)
      }

      return itemId
    } catch (error: any) {
      console.error('Error removing cart item:', error)
      return rejectWithValue('Failed to remove item from cart')
    }
  }
)

export const clearCart = createAsyncThunk(
  'cart/clearAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase().auth.getUser()
      
      if (!user) {
        return rejectWithValue('User not authenticated')
      }

      const { error } = await supabase()
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('Error clearing cart:', error)
        return rejectWithValue(error.message)
      }

      return true
    } catch (error: any) {
      console.error('Error clearing cart:', error)
      return rejectWithValue('Failed to clear cart')
    }
  }
)

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setPromoCode: (state, action: PayloadAction<string>) => {
      state.promoCode = action.payload
    },
    applyPromoCode: (state, action: PayloadAction<{ code: string; discount: number }>) => {
      state.appliedPromo = action.payload.code
      state.promoDiscount = action.payload.discount
      state.promoCode = ''
    },
    removePromoCode: (state) => {
      state.appliedPromo = ''
      state.promoDiscount = 0
    },
    calculateTotals: (state) => {
      const subtotal = state.items.reduce((total, item) => {
        const price = item.quote?.total_cost || item.price || 0
        return total + (price * item.quantity)
      }, 0)
      
      const discountAmount = subtotal * (state.promoDiscount / 100)
      state.total = subtotal - discountAmount
      state.itemCount = state.items.reduce((count, item) => count + item.quantity, 0)
    },
    // Local cart management for offline use
    addLocalItem: (state, action: PayloadAction<CartItem>) => {
      const existingIndex = state.items.findIndex(item => 
        item.quote_id === action.payload.quote_id || item.id === action.payload.id
      )
      
      if (existingIndex >= 0) {
        state.items[existingIndex].quantity += action.payload.quantity
      } else {
        state.items.push(action.payload)
      }
    },
    updateLocalQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const { id, quantity } = action.payload
      const index = state.items.findIndex(item => item.id === id)
      
      if (index >= 0) {
        if (quantity <= 0) {
          state.items.splice(index, 1)
        } else {
          state.items[index].quantity = quantity
        }
      }
    },
    removeLocalItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload)
    },
    clearLocalCart: (state) => {
      state.items = []
      state.promoCode = ''
      state.promoDiscount = 0
      state.appliedPromo = ''
    },
  },
  extraReducers: (builder) => {
    // Fetch Cart Items
    builder
      .addCase(fetchCartItems.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCartItems.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
        state.error = null
      })
      .addCase(fetchCartItems.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Add to Cart
    builder
      .addCase(addToCart.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading = false
        const existingIndex = state.items.findIndex(item => item.id === action.payload.id)
        if (existingIndex >= 0) {
          state.items[existingIndex] = action.payload
        } else {
          state.items.push(action.payload)
        }
        state.error = null
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Update Quantity
    builder
      .addCase(updateCartItemQuantity.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateCartItemQuantity.fulfilled, (state, action) => {
        state.loading = false
        if ('removed' in action.payload) {
          state.items = state.items.filter(item => item.id !== action.payload.itemId)
        } else {
          const index = state.items.findIndex(item => item.id === action.payload.id)
          if (index >= 0) {
            state.items[index] = action.payload
          }
        }
        state.error = null
      })
      .addCase(updateCartItemQuantity.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Remove from Cart
    builder
      .addCase(removeFromCart.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.loading = false
        state.items = state.items.filter(item => item.id !== action.payload)
        state.error = null
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Clear Cart
    builder
      .addCase(clearCart.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.loading = false
        state.items = []
        state.promoCode = ''
        state.promoDiscount = 0
        state.appliedPromo = ''
        state.error = null
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const {
  clearError,
  setPromoCode,
  applyPromoCode,
  removePromoCode,
  calculateTotals,
  addLocalItem,
  updateLocalQuantity,
  removeLocalItem,
  clearLocalCart,
} = cartSlice.actions

export default cartSlice.reducer
