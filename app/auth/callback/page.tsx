'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAppDispatch } from '@/lib/store/hooks'
import { initializeAuth } from '@/lib/store/slices/authSlice'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get URL parameters
        const code = searchParams.get('code')
        const error_code = searchParams.get('error')
        const error_description = searchParams.get('error_description')

        // Handle OAuth errors
        if (error_code) {
          console.error('OAuth error:', error_code, error_description)
          router.push(`/auth/auth-code-error?error=${error_code}&description=${error_description}`)
          return
        }

        // Handle authorization code flow
        if (code) {
          const { data, error } = await supabase().auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Code exchange error:', error)
            router.push(`/auth/auth-code-error?error=exchange_failed&description=${encodeURIComponent(error.message)}`)
            return
          }

          if (data.session) {
            // Initialize auth state
            await dispatch(initializeAuth())
            
            // Redirect to intended page or home
            const redirectTo = searchParams.get('redirect') || '/'
            router.push(redirectTo)
            return
          }
        }

        // Handle implicit flow (tokens in hash)
        if (typeof window !== 'undefined' && window.location.hash) {
          const hash = window.location.hash.substring(1)
          const params = new URLSearchParams(hash)
          
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          const expiresIn = params.get('expires_in')
          
          if (accessToken) {
            const { data, error } = await supabase().auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })
            
            if (error) {
              console.error('Session set error:', error)
              router.push(`/auth/auth-code-error?error=session_failed&description=${encodeURIComponent(error.message)}`)
              return
            }

            if (data.session) {
              // Initialize auth state
              await dispatch(initializeAuth())
              
              // Redirect to intended page or home
              const redirectTo = searchParams.get('redirect') || '/'
              router.push(redirectTo)
              return
            }
          }
        }

        // No valid auth data found
        console.error('No valid authentication data found')
        router.push('/auth/auth-code-error?error=missing_code&description=No authorization code provided')
        
      } catch (error) {
        console.error('Auth callback error:', error)
        setError('Authentication failed. Please try again.')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router, searchParams, dispatch])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
          <h2 className="text-xl font-semibold text-white">Completing authentication...</h2>
          <p className="text-gray-400">Please wait while we sign you in.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-gray-900 rounded-lg border border-gray-800">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Authentication Error</h2>
            <p className="text-gray-400">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}