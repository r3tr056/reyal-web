import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/cart - Get user's cart items
export async function GET(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: cartItems, error } = await supabase
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
      console.error('Error fetching cart:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch cart items' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      cartItems: cartItems || []
    })

  } catch (error) {
    console.error('Cart GET error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { quoteId, quantity = 1 } = body

    if (!quoteId) {
      return NextResponse.json({ 
        error: 'Quote ID is required' 
      }, { status: 400 })
    }

    // Verify quote exists and belongs to user
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ 
        error: 'Quote not found' 
      }, { status: 404 })
    }

    // Check if item already in cart
    const { data: existingItem, error: existingError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('quote_id', quoteId)
      .single()

    if (existingItem) {
      // Update quantity
      const { data: updatedItem, error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating cart item:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update cart item' 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        cartItem: updatedItem
      })
    }

    // Add new item to cart
    const { data: cartItem, error: insertError } = await supabase
      .from('cart_items')
      .insert({
        user_id: user.id,
        quote_id: quoteId,
        quantity: quantity
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding to cart:', insertError)
      return NextResponse.json({ 
        error: 'Failed to add item to cart' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      cartItem
    })

  } catch (error) {
    console.error('Cart POST error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// DELETE /api/cart - Clear cart or remove specific item
export async function DELETE(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (itemId) {
      // Delete specific item
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error removing cart item:', error)
        return NextResponse.json({ 
          error: 'Failed to remove cart item' 
        }, { status: 500 })
      }
    } else {
      // Clear entire cart
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('Error clearing cart:', error)
        return NextResponse.json({ 
          error: 'Failed to clear cart' 
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: itemId ? 'Item removed from cart' : 'Cart cleared'
    })

  } catch (error) {
    console.error('Cart DELETE error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}