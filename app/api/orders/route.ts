import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CheckoutForm } from '@/lib/types'

// GET /api/orders - Get user's orders
export async function GET(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')

    let query = supabase
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch orders' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      pagination: {
        page,
        limit,
        hasMore: (orders?.length || 0) === limit
      }
    })

  } catch (error) {
    console.error('Orders GET error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/orders - Create new order from cart
export async function POST(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { shipping_address, payment_method, notes } = body as CheckoutForm

    if (!shipping_address || !payment_method) {
      return NextResponse.json({ 
        error: 'Shipping address and payment method are required' 
      }, { status: 400 })
    }

    // Get cart items
    const { data: cartItems, error: cartError } = await supabase
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
      return NextResponse.json({ 
        error: 'Cart is empty' 
      }, { status: 400 })
    }

    // Calculate total amount
    const totalAmount = cartItems.reduce((sum: number, item: any) => {
      return sum + (item.quotes.total_cost * item.quantity)
    }, 0)

    // Generate order number
    const orderNumber = generateOrderNumber()

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        status: 'pending',
        total_amount: totalAmount,
        payment_status: 'pending',
        payment_method: payment_method,
        shipping_address: shipping_address,
        notes: notes,
        estimated_delivery: calculateEstimatedDelivery(cartItems)
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json({ 
        error: 'Failed to create order' 
      }, { status: 500 })
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
      status: 'pending'
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      // Rollback order creation
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json({ 
        error: 'Failed to create order items' 
      }, { status: 500 })
    }

    // Clear cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)

    // Add order history entry
    await supabase
      .from('order_history')
      .insert({
        order_id: order.id,
        status: 'pending',
        message: 'Order created and awaiting payment',
        created_by: user.id
      })

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        orderItems: orderItems.length
      },
      message: 'Order created successfully'
    })

  } catch (error) {
    console.error('Orders POST error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

function generateOrderNumber(): string {
  const date = new Date()
  const dateString = date.toISOString().slice(0, 10).replace(/-/g, '')
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORD${dateString}-${randomString}`
}

function calculateEstimatedDelivery(cartItems: any[]): string {
  // Find the maximum estimated days from all items
  const maxDays = Math.max(...cartItems.map(item => item.quotes.estimated_days))
  
  const deliveryDate = new Date()
  deliveryDate.setDate(deliveryDate.getDate() + maxDays)
  
  return deliveryDate.toISOString()
}