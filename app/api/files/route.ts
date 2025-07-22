import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerClient } from '@/lib/supabase/server'
import { 
  rateLimit, 
  createSecureResponse,
  logSecurityEvent,
  createRateLimitResponse
} from '@/lib/middleware/api-middleware'

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

    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (filesError) {
      throw new Error(`Database error: ${filesError.message}`)
    }

    await logSecurityEvent('files_accessed', {
      userId: user.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      filesCount: files?.length || 0
    })

    return createSecureResponse({
      success: true,
      data: { files: files || [] }
    }, 200, requestId)

  } catch (error) {
    await logSecurityEvent('files_access_error', {
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
