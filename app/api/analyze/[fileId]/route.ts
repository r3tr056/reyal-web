import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { 
  rateLimit, 
  validateUUID,
  createSecureResponse,
  logSecurityEvent
} from '@/lib/middleware/api-middleware'
import { API_CONFIG } from '@/lib/config/api'
import { randomUUID } from 'crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const requestId = randomUUID()
  
  try {
    const rateLimitResult = await rateLimit('DEFAULT')(request)
    if (!rateLimitResult.success) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        endpoint: '/api/analyze/[fileId]',
        method: 'GET',
        requestId
      })
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '0'
          }
        }
      )
    }

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS', {
        endpoint: '/api/analyze/[fileId]',
        requestId
      })
      return createSecureResponse(
        { error: 'Authentication required' },
        401,
        requestId
      )
    }

    if (!validateUUID(params.fileId)) {
      return createSecureResponse(
        { error: 'Invalid file ID format' },
        400,
        requestId
      )
    }

    const supabase = await createServerClient()
    
    const { data: file, error } = await supabase
      .from('files')
      .select('id, original_filename, is_analyzed, analysis, created_at')
      .eq('id', params.fileId)
      .eq('user_id', userId)
      .single()

    if (error || !file) {
      await logSecurityEvent('RESOURCE_NOT_FOUND', {
        endpoint: '/api/analyze/[fileId]',
        fileId: params.fileId,
        userId,
        requestId
      })
      return createSecureResponse(
        { error: 'File not found or access denied' },
        404,
        requestId
      )
    }

    return createSecureResponse(
      {
        success: true,
        data: {
          fileId: file.id,
          filename: file.original_filename,
          isAnalyzed: file.is_analyzed,
          analysis: file.analysis,
          uploadedAt: file.created_at,
          status: file.is_analyzed 
            ? (file.analysis?.error ? 'failed' : 'completed')
            : 'processing'
        }
      },
      200,
      requestId
    )

  } catch (error) {
    await logSecurityEvent('INTERNAL_ERROR', {
      endpoint: '/api/analyze/[fileId]',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    })
    
    return createSecureResponse(
      { error: 'Internal server error' },
      500,
      requestId
    )
  }
}
