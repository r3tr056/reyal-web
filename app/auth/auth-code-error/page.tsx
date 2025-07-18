'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function AuthCodeErrorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  const error = searchParams.get('error')
  const description = searchParams.get('description')

  const getErrorMessage = () => {
    switch (error) {
      case 'missing_code':
        return 'No authorization code was provided. This usually happens when the authentication link was already used or has expired.'
      case 'exchange_failed':
        return 'Failed to exchange authorization code for session. Please try signing in again.'
      case 'session_failed':
        return 'Failed to establish authentication session. Please try signing in again.'
      case 'access_denied':
        return 'Access was denied. You may have cancelled the authentication process.'
      case 'invalid_request':
        return 'Invalid authentication request. Please try signing in again.'
      default:
        return description || 'An unknown error occurred during authentication. Please try again.'
    }
  }

  const getErrorReasons = () => {
    switch (error) {
      case 'missing_code':
        return [
          'The authentication link was already used',
          'The authentication link has expired',
          'There was a network issue during sign-in'
        ]
      case 'exchange_failed':
        return [
          'The authorization code is invalid or expired',
          'Server communication error',
          'Authentication service is temporarily unavailable'
        ]
      case 'session_failed':
        return [
          'Invalid access token received',
          'Session expired during authentication',
          'Authentication service configuration issue'
        ]
      default:
        return [
          'The authentication link was already used',
          'The authentication link has expired',
          'There was a network issue during sign-in'
        ]
    }
  }

  const handleRetry = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ef4444' fillOpacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="bg-gray-900/60 backdrop-blur-2xl border border-gray-700/30 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Authentication Error</CardTitle>
              <CardDescription className="text-gray-400">
                There was a problem with the authentication process
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-400 font-medium mb-2">
                      {getErrorMessage()}
                    </p>
                    <p className="text-red-300 text-sm mb-3">
                      This can happen if:
                    </p>
                    <ul className="text-red-300 text-sm space-y-1">
                      {getErrorReasons().map((reason, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleRetry}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold h-12 transition-all duration-300 group"
                >
                  <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  Try Again
                </Button>
                
                <Link href="/" className="block">
                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 h-12 transition-all duration-300"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go to Homepage
                  </Button>
                </Link>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">
                  Still having trouble?{' '}
                  <Link href="/contact" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                    Contact Support
                  </Link>
                </p>
                {error && (
                  <p className="text-xs text-gray-600 font-mono">
                    Error Code: {error}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}