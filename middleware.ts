import { createMiddlewareClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { securityMiddleware } from '@/lib/middleware/security'

const PROTECTED_ROUTES = {
  '/profile': { requireAuth: true, adminOnly: false },
  '/orders': { requireAuth: true, adminOnly: false },
  '/cart': { requireAuth: true, adminOnly: false },
  '/checkout': { requireAuth: true, adminOnly: false },
  '/track': { requireAuth: true, adminOnly: false },
  '/admin': { requireAuth: true, adminOnly: true },
}

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/marketplace',
  '/contact',
  '/auth/callback',
  '/auth/auth-code-error',
  '/api/health',
  '/api/marketplace',
  '/api/materials',
]

const PROTECTED_API_ROUTES = [
  '/api/upload',
  '/api/analyze',
  '/api/calculate-cost',
  '/api/quotes',
  '/api/orders',
  '/api/files',
  '/api/cart',
]

const ADMIN_API_ROUTES = [
  '/api/admin',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Apply security middleware (includes rate limiting)
  const securityResponse = await securityMiddleware(request)
  if (securityResponse.status !== 200) {
    return securityResponse
  }

  // Continue with existing auth logic...
  const isProtectedRoute = Object.keys(PROTECTED_ROUTES).some(route => 
    pathname.startsWith(route)
  )
  const isProtectedApiRoute = PROTECTED_API_ROUTES.some(route => 
    pathname.startsWith(route)
  )
  const isAdminApiRoute = ADMIN_API_ROUTES.some(route => 
    pathname.startsWith(route)
  )
  
  if (PUBLIC_ROUTES.includes(pathname) && !isProtectedRoute && !isProtectedApiRoute && !isAdminApiRoute) {
    return NextResponse.next()
  }

  try {
    const { supabase, response } = createMiddlewareClient(request)
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      if (isProtectedRoute || isProtectedApiRoute || isAdminApiRoute) {
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { 'content-type': 'application/json' } }
          )
        }
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
      }
      return NextResponse.next()
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, is_verified')
      .eq('id', user.id)
      .single()

    const requiresAdmin = Object.entries(PROTECTED_ROUTES).some(([route, config]) => 
      pathname.startsWith(route) && config.adminOnly
    ) || isAdminApiRoute

    if (requiresAdmin) {
      if (profileError || !profile || !profile.is_admin) {
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: 'Admin access required' }),
            { status: 403, headers: { 'content-type': 'application/json' } }
          )
        }
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    if (pathname.startsWith('/api/')) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', user.id)
      requestHeaders.set('x-user-email', user.email || '')
      if (profile?.is_admin) {
        requestHeaders.set('x-user-admin', 'true')
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    
    if (!isProtectedRoute && !isProtectedApiRoute && !isAdminApiRoute) {
      return NextResponse.next()
    }
    
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication service unavailable' }),
        { status: 503, headers: { 'content-type': 'application/json' } }
      )
    }
    
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
