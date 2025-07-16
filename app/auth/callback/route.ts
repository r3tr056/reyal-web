import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin, hash } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth Error:', error, errorDescription)
    const errorUrl = new URL('/auth/auth-code-error', origin)
    errorUrl.searchParams.set('error', error)
    if (errorDescription) {
      errorUrl.searchParams.set('description', errorDescription)
    }
    return NextResponse.redirect(errorUrl)
  }

  // Check if this is an implicit flow (tokens in hash) or PKCE flow (code in query)
  // If no code parameter, redirect to client-side page to handle hash fragments
  if (!code) {
    console.log('No authorization code provided, checking for implicit flow tokens')
    // For implicit flow, we need client-side JavaScript to handle the hash fragments
    // Redirect to a client-side page that can process the tokens
    return NextResponse.redirect(`${origin}/auth/callback/client?next=${encodeURIComponent(next)}`)
  }

  try {
    // Create server-side Supabase client
    const { supabase, response } = createClient(request)
    
    // Exchange code for session
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Session exchange error:', sessionError)
      const errorUrl = new URL('/auth/auth-code-error', origin)
      errorUrl.searchParams.set('error', 'session_exchange_failed')
      errorUrl.searchParams.set('description', sessionError.message)
      return NextResponse.redirect(errorUrl)
    }

    if (!sessionData.session) {
      console.error('No session data received')
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_session`)
    }

    // Create or update user profile
    try {
      const user = sessionData.session.user
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          updated_at: new Date().toISOString()
        })
    } catch (profileError) {
      console.error('Profile update error:', profileError)
      // Don't fail the auth flow for profile errors, just log them
    }

    // Validate the next URL to prevent open redirect attacks
    let redirectUrl = next
    try {
      const nextUrl = new URL(next, origin)
      if (nextUrl.origin !== origin) {
        redirectUrl = '/'
      }
    } catch {
      redirectUrl = '/'
    }

    // Redirect to the intended destination
    const finalRedirect = NextResponse.redirect(`${origin}${redirectUrl}`)
    
    // Copy any cookies set by the Supabase client
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('set-cookie')) {
        finalRedirect.headers.set(key, value)
      }
    })

    return finalRedirect

  } catch (error) {
    console.error('Unexpected auth callback error:', error)
    const errorUrl = new URL('/auth/auth-code-error', origin)
    errorUrl.searchParams.set('error', 'unexpected_error')
    errorUrl.searchParams.set('description', 'An unexpected error occurred during authentication')
    return NextResponse.redirect(errorUrl)
  }
}
