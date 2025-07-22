import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { createServerClient } from '@/lib/supabase/server'
import { 
  rateLimit, 
  createSecureResponse,
  logSecurityEvent,
  createRateLimitResponse,
  sanitizeInput
} from '@/lib/middleware/api-middleware'

const CartItemSchema = z.object({
  quoteId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100).default(1)
}).strict()

async function verifyAuth(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  return user
}

export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('DEFAULT')(request)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, requestId)
    }

    const supabase = await createServerClient()
    const user = await verifyAuth(supabase)

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
      throw new Error(`Database error: ${error.message}`)
    }

    await logSecurityEvent('cart_accessed', {
      userId: user.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      itemsCount: cartItems?.length || 0
    })

    return createSecureResponse({
      success: true,
      data: { cartItems: cartItems || [] }
    }, 200, requestId)

  } catch (error) {
    await logSecurityEvent('cart_access_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return createSecureResponse({ error: 'Unauthorized' }, 401, requestId)
      }
      if (error.message.startsWith('Database error:')) {
        return createSecureResponse({ error: 'Database error occurred' }, 500, requestId)
      }
    }

    return createSecureResponse({ error: 'Internal server error' }, 500, requestId)
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('DEFAULT')(request)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, requestId)
    }

    const body = await request.json()
    const sanitizedBody = sanitizeInput(body)
    const validatedData = CartItemSchema.parse(sanitizedBody)
    const { quoteId, quantity } = validatedData

    const supabase = await createServerClient()
    const user = await verifyAuth(supabase)

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .single()

    if (quoteError || !quote) {
      return createSecureResponse({ error: 'Quote not found' }, 404, requestId)
    }

    const { data: existingItem, error: existingError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('quote_id', quoteId)
      .single()

    let result
    if (existingItem) {
      const { data: updatedItem, error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Database error: ${updateError.message}`)
      }
      result = updatedItem
    } else {
      const { data: newItem, error: insertError } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          quote_id: quoteId,
          quantity
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`)
      }
      result = newItem
    }

    await logSecurityEvent('cart_item_added', {
      userId: user.id,
      quoteId,
      quantity,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return createSecureResponse({
      success: true,
      data: { cartItem: result },
      message: 'Item added to cart successfully'
    }, 200, requestId)

  } catch (error) {
    await logSecurityEvent('cart_add_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return createSecureResponse({ error: 'Unauthorized' }, 401, requestId)
      }
      if (error.message.startsWith('Database error:')) {
        return createSecureResponse({ error: 'Database error occurred' }, 500, requestId)
      }
    }

    return createSecureResponse({ error: 'Internal server error' }, 500, requestId)
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('DEFAULT')(request)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, requestId)
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')

    if (!itemId) {
      return createSecureResponse({ error: 'Item ID is required' }, 400, requestId)
    }

    const supabase = await createServerClient()
    const user = await verifyAuth(supabase)

    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id)

    if (deleteError) {
      throw new Error(`Database error: ${deleteError.message}`)
    }

    await logSecurityEvent('cart_item_removed', {
      userId: user.id,
      itemId,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return createSecureResponse({
      success: true,
      message: 'Item removed from cart successfully'
    }, 200, requestId)

  } catch (error) {
    await logSecurityEvent('cart_remove_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return createSecureResponse({ error: 'Unauthorized' }, 401, requestId)
      }
      if (error.message.startsWith('Database error:')) {
        return createSecureResponse({ error: 'Database error occurred' }, 500, requestId)
      }
    }

    return createSecureResponse({ error: 'Internal server error' }, 500, requestId)
  }
}