import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected routes and their required permissions
const PROTECTED_ROUTES = {
  // User routes - require authentication
  '/profile': { requireAuth: true, adminOnly: false },
  '/orders': { requireAuth: true, adminOnly: false },
  '/cart': { requireAuth: true, adminOnly: false },
  '/checkout': { requireAuth: true, adminOnly: false },
  '/track': { requireAuth: true, adminOnly: false },
  
  // Admin routes - require admin privileges
  '/admin': { requireAuth: true, adminOnly: true },
}

// Public routes that don't require authentication
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

// API routes that require authentication
const PROTECTED_API_ROUTES = [
  '/api/upload',
  '/api/analyze',
  '/api/calculate-cost',
  '/api/quotes',
  '/api/orders',
  '/api/files',
  '/api/cart',
]

// Admin API routes
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

  // Check if route requires authentication
  const isProtectedRoute = Object.keys(PROTECTED_ROUTES).some(route => 
    pathname.startsWith(route)
  )
  const isProtectedApiRoute = PROTECTED_API_ROUTES.some(route => 
    pathname.startsWith(route)
  )
  const isAdminApiRoute = ADMIN_API_ROUTES.some(route => 
    pathname.startsWith(route)
  )
  
  // Skip middleware for public routes
  if (PUBLIC_ROUTES.includes(pathname) && !isProtectedRoute && !isProtectedApiRoute && !isAdminApiRoute) {
    return NextResponse.next()
  }

  try {
    // Create Supabase client
    const { supabase, response } = createClient(request)
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Handle authentication errors
    if (userError || !user) {
      if (isProtectedRoute || isProtectedApiRoute || isAdminApiRoute) {
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { 'content-type': 'application/json' } }
          )
        }
        // Redirect to login for protected pages
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
      }
      return NextResponse.next()
    }

    // Get user profile to check admin status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, is_verified')
      .eq('id', user.id)
      .single()

    // Handle admin-only routes
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
        // Redirect to home for non-admin users trying to access admin routes
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Add user information to headers for API routes
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
    
    // Allow request to continue on middleware errors for non-critical routes
    if (!isProtectedRoute && !isProtectedApiRoute && !isAdminApiRoute) {
      return NextResponse.next()
    }
    
    // For protected routes, redirect to login
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, icons, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}