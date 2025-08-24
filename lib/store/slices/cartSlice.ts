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
  async ({ quoteId, quantity = 1 }: { quoteId: string; quantity?: number }, { rejectWithValue }) => {
    try {
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
            quantity
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
          console.error('Error adding cart item:', error)
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
        return rejectWithValue('Quantity must be greater than 0')
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
      return rejectWithValue('Failed to update quantity')
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
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase().auth.getUser()
      
      if (!user) {
        return rejectWithValue('Please sign in')
      }

      const { error } = await supabase()
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('Error clearing cart:', error)
        return rejectWithValue(error.message)
      }

      return []
    } catch (error: any) {
      console.error('Error clearing cart:', error)
      return rejectWithValue('Failed to clear cart')
    }
  }
)

export const validatePromoCode = createAsyncThunk(
  'cart/validatePromo',
  async (promoCode: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase()
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return rejectWithValue('Invalid promo code')
      }

      // Check if promo code is still valid
      const now = new Date()
      const expiryDate = new Date(data.expires_at)
      
      if (expiryDate < now) {
        return rejectWithValue('Promo code has expired')
      }

      // Check usage limit
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        return rejectWithValue('Promo code usage limit reached')
      }

      return {
        code: data.code,
        discount: data.discount_percentage,
        type: data.discount_type
      }
    } catch (error: any) {
      console.error('Error validating promo code:', error)
      return rejectWithValue('Failed to validate promo code')
    }
  }
)

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setPromoCode: (state, action: PayloadAction<string>) => {
      state.promoCode = action.payload
    },
    removePromoCode: (state) => {
      state.promoCode = ''
      state.promoDiscount = 0
      state.appliedPromo = ''
    },
    calculateTotal: (state) => {
      const subtotal = state.items.reduce((sum, item) => {
        const itemPrice = item.quote?.total_cost || item.price || 0
        return sum + (itemPrice * item.quantity)
      }, 0)
      
      const discount = (subtotal * state.promoDiscount) / 100
      state.total = Math.max(0, subtotal - discount)
      state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0)
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch cart items
      .addCase(fetchCartItems.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCartItems.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
        cartSlice.caseReducers.calculateTotal(state)
      })
      .addCase(fetchCartItems.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Add to cart
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
        cartSlice.caseReducers.calculateTotal(state)
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Update quantity
      .addCase(updateCartItemQuantity.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateCartItemQuantity.fulfilled, (state, action) => {
        state.loading = false
        const existingIndex = state.items.findIndex(item => item.id === action.payload.id)
        if (existingIndex >= 0) {
          state.items[existingIndex] = action.payload
        }
        cartSlice.caseReducers.calculateTotal(state)
      })
      .addCase(updateCartItemQuantity.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Remove from cart
      .addCase(removeFromCart.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.loading = false
        state.items = state.items.filter(item => item.id !== action.payload)
        cartSlice.caseReducers.calculateTotal(state)
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Clear cart
      .addCase(clearCart.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.loading = false
        state.items = []
        state.total = 0
        state.itemCount = 0
        state.promoCode = ''
        state.promoDiscount = 0
        state.appliedPromo = ''
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Validate promo code
      .addCase(validatePromoCode.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(validatePromoCode.fulfilled, (state, action) => {
        state.loading = false
        state.promoDiscount = action.payload.discount
        state.appliedPromo = action.payload.code
        cartSlice.caseReducers.calculateTotal(state)
      })
      .addCase(validatePromoCode.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
        state.promoCode = ''
        state.promoDiscount = 0
        state.appliedPromo = ''
      })
  }
})

export const {
  setPromoCode,
  removePromoCode,
  calculateTotal,
  clearError
} = cartSlice.actions

export default cartSlice.reducer

// Selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items
export const selectCartTotal = (state: { cart: CartState }) => state.cart.total
export const selectCartItemCount = (state: { cart: CartState }) => state.cart.itemCount
export const selectCartLoading = (state: { cart: CartState }) => state.cart.loading
export const selectCartError = (state: { cart: CartState }) => state.cart.error
export const selectPromoCode = (state: { cart: CartState }) => state.cart.promoCode
export const selectPromoDiscount = (state: { cart: CartState }) => state.cart.promoDiscount
export const selectAppliedPromo = (state: { cart: CartState }) => state.cart.appliedPromo