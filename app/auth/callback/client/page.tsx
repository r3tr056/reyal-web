"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function ClientCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Processing authentication...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const redirectTo = searchParams.get('next') ?? '/'
        
        // Get the current URL with hash fragments
        const currentUrl = window.location.href
        
        // Check if we have tokens in the hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const expiresIn = hashParams.get('expires_in')
        const tokenType = hashParams.get('token_type')
        
        if (accessToken) {
          console.log('Found implicit flow tokens, setting session')
          setMessage('Setting up your session...')
          
          // Create session with the tokens
          const { data, error } = await supabase().auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })
          
          if (error) {
            console.error('Error setting session:', error)
            setStatus('error')
            setMessage(`Authentication failed: ${error.message}`)
            setTimeout(() => {
              router.push('/auth/auth-code-error?error=session_error')
            }, 2000)
            return
          }
          
          if (data.session) {
            console.log('Session set successfully:', data.session.user.email)
            setStatus('success')
            setMessage('Authentication successful! Redirecting...')
            
            // Update profile
            try {
              const user = data.session.user
              await supabase()
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
              // Don't fail the auth flow for profile errors
            }
            
            // Clear the hash from the URL
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
            
            // Redirect to intended destination
            setTimeout(() => {
              router.push(redirectTo)
            }, 1000)
          } else {
            setStatus('error')
            setMessage('No session data received')
            setTimeout(() => {
              router.push('/auth/auth-code-error?error=no_session')
            }, 2000)
          }
        } else {
          // Let Supabase handle the callback automatically
          console.log('No tokens in hash, letting Supabase handle callback')
          setMessage('Completing authentication...')
          
          const { data, error } = await supabase().auth.getSession()
          
          if (error) {
            console.error('Session error:', error)
            setStatus('error')
            setMessage(`Authentication failed: ${error.message}`)
            setTimeout(() => {
              router.push('/auth/auth-code-error?error=session_error')
            }, 2000)
          } else if (data.session) {
            console.log('Session found:', data.session.user.email)
            setStatus('success')
            setMessage('Authentication successful! Redirecting...')
            
            setTimeout(() => {
              router.push(redirectTo)
            }, 1000)
          } else {
            console.log('No session found, checking for auth state change')
            // Wait a bit for auth state change to process
            setTimeout(() => {
              router.push('/auth/auth-code-error?error=missing_tokens')
            }, 3000)
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred during authentication')
        setTimeout(() => {
          router.push('/auth/auth-code-error?error=unexpected_error')
        }, 2000)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%2310b981' fillOpacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-gray-900/60 backdrop-blur-2xl border border-gray-700/30 shadow-2xl rounded-2xl p-8">
            <div className="mb-6">
              {status === 'processing' && (
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              {status === 'success' && (
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              
              {status === 'error' && (
                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-4">
              {status === 'processing' && 'Authenticating...'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Authentication Failed'}
            </h1>
            
            <p className="text-gray-400">
              {message}
            </p>
            
            {status === 'processing' && (
              <div className="mt-6">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-emerald-600 to-green-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}