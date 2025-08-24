import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { supabase } from '@/lib/supabase/client'

export interface OrderItem {
  id: string
  order_id: string
  quote_id: string
  file_id: string
  quantity: number
  unit_price: number
  total_price: number
  settings: {
    material: string
    quality: string
    infill_percentage: number
    layer_height: number
    color?: string
  }
  status: 'pending' | 'in_queue' | 'printing' | 'post_processing' | 'completed' | 'failed'
  print_started_at: string | null
  print_completed_at: string | null
  created_at: string
  // Additional properties for display
  name?: string
  image?: string
  designer?: string
}

export interface Order {
  id: string
  user_id: string
  order_number: string
  status: 'pending' | 'confirmed' | 'in_production' | 'shipped' | 'delivered' | 'cancelled'
  total_amount: number
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method: string
  shipping_address: {
    firstName: string
    lastName: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    pincode: string
  }
  notes?: string
  tracking_number?: string
  estimated_delivery: string
  actual_delivery?: string
  created_at: string
  updated_at: string
  items: OrderItem[]
}

export interface OrdersState {
  orders: Order[]
  currentOrder: Order | null
  loading: boolean
  error: string | null
  filters: {
    status: string
    search: string
    dateRange: {
      start: string | null
      end: string | null
    }
  }
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

const initialState: OrdersState = {
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
  filters: {
    status: 'all',
    search: '',
    dateRange: {
      start: null,
      end: null,
    },
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    hasMore: true,
  },
}

export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (
    {
      page = 1,
      limit = 10,
      status,
      search,
    }: {
      page?: number
      limit?: number
      status?: string
      search?: string
    },
    { rejectWithValue }
  ) => {
    try {
      const { data: { user } } = await supabase().auth.getUser()
      
      if (!user) {
        return rejectWithValue('User not authenticated')
      }

      const offset = (page - 1) * limit
      let query = supabase()
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            quotes (
              *,
              files (
                original_filename,
                file_type
              )
            )
          )
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      if (search) {
        query = query.or(`order_number.ilike.%${search}%,notes.ilike.%${search}%`)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching orders:', error)
        return rejectWithValue(error.message)
      }

      return {
        orders: data || [],
        total: count || 0,
        page,
        limit,
        hasMore: offset + limit < (count || 0),
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error)
      return rejectWithValue('Failed to fetch orders')
    }
  }
)

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase().auth.getUser()
      
      if (!user) {
        return rejectWithValue('User not authenticated')
      }

      const { data, error } = await supabase()
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            quotes (
              *,
              files (
                original_filename,
                file_type
              )
            )
          )
        `)
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching order:', error)
        return rejectWithValue(error.message)
      }

      return data
    } catch (error: any) {
      console.error('Error fetching order:', error)
      return rejectWithValue('Failed to fetch order details')
    }
  }
)

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (
    {
      shipping_address,
      payment_method,
      notes,
    }: {
      shipping_address: any
      payment_method: string
      notes?: string
    },
    { rejectWithValue }
  ) => {
    try {
      const { data: { user } } = await supabase().auth.getUser()
      
      if (!user) {
        return rejectWithValue('User not authenticated')
      }

      // Get cart items
      const { data: cartItems, error: cartError } = await supabase()
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

      if (cartError || !cartItems || cartItems.length === 0) {
        return rejectWithValue('Cart is empty')
      }

      // Calculate total
      const totalAmount = cartItems.reduce((sum: number, item: any) => {
        return sum + (item.quotes.total_cost * item.quantity)
      }, 0)

      // Generate order number
      const orderNumber = `ORD-${Date.now()}`

      // Create order
      const { data: order, error: orderError } = await supabase()
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: 'pending',
          total_amount: totalAmount,
          payment_status: 'pending',
          payment_method,
          shipping_address,
          notes,
          estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .select()
        .single()

      if (orderError) {
        console.error('Error creating order:', orderError)
        return rejectWithValue('Failed to create order')
      }

      // Create order items
      const orderItems = cartItems.map((item: any) => ({
        order_id: order.id,
        quote_id: item.quote_id,
        file_id: item.quotes.file_id,
        quantity: item.quantity,
        unit_price: item.quotes.total_cost,
        total_price: item.quotes.total_cost * item.quantity,
        settings: item.quotes.settings,
        status: 'pending',
      }))

      const { error: itemsError } = await supabase()
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error creating order items:', itemsError)
        // Rollback order creation
        await supabase().from('orders').delete().eq('id', order.id)
        return rejectWithValue('Failed to create order items')
      }

      // Clear cart
      await supabase()
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)

      // Fetch complete order with items
      const { data: completeOrder } = await supabase()
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            quotes (
              *,
              files (
                original_filename,
                file_type
              )
            )
          )
        `)
        .eq('id', order.id)
        .single()

      return completeOrder
    } catch (error: any) {
      console.error('Error creating order:', error)
      return rejectWithValue('Failed to create order')
    }
  }
)

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async (
    { orderId, status }: { orderId: string; status: string },
    { rejectWithValue }
  ) => {
    try {
      const { data, error } = await supabase()
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) {
        console.error('Error updating order status:', error)
        return rejectWithValue(error.message)
      }

      return data
    } catch (error: any) {
      console.error('Error updating order status:', error)
      return rejectWithValue('Failed to update order status')
    }
  }
)

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setFilters: (state, action: PayloadAction<Partial<typeof initialState.filters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload
    },
    resetPagination: (state) => {
      state.pagination = initialState.pagination
    },
    clearOrders: (state) => {
      state.orders = []
      state.currentOrder = null
      state.pagination = initialState.pagination
    },
  },
  extraReducers: (builder) => {
    // Fetch Orders
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload.page === 1) {
          state.orders = action.payload.orders
        } else {
          state.orders.push(...action.payload.orders)
        }
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        }
        state.error = null
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Fetch Order by ID
    builder
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false
        state.currentOrder = action.payload
        state.error = null
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Create Order
    builder
      .addCase(createOrder.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false
        state.orders.unshift(action.payload)
        state.currentOrder = action.payload
        state.error = null
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Update Order Status
    builder
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading = false
        const index = state.orders.findIndex(order => order.id === action.payload.id)
        if (index >= 0) {
          state.orders[index] = { ...state.orders[index], ...action.payload }
        }
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = { ...state.currentOrder, ...action.payload }
        }
        state.error = null
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const {
  clearError,
  setFilters,
  setCurrentOrder,
  resetPagination,
  clearOrders,
} = orderSlice.actions

export default orderSlice.reducer
