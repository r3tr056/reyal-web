'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Eye, EyeOff, Lock, AlertTriangle } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attemptCount, setAttemptCount] = useState(0)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if user is already authenticated and is admin
    const checkExistingAuth = async () => {
      try {
        const { data: { session } } = await supabase().auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase()
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single()

          if (profile?.is_admin) {
            router.push('/admin')
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
      }
    }

    checkExistingAuth()

    // Check for error from redirect
    const redirectError = searchParams.get('error')
    if (redirectError === 'unauthorized') {
      setError('Access denied. Admin privileges required.')
    }
  }, [router, searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic rate limiting
    if (attemptCount >= 5) {
      setError('Too many failed attempts. Please wait before trying again.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Sign in with email and password
      const { data, error: authError } = await supabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        setAttemptCount(prev => prev + 1)
        
        if (authError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials.')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Please verify your email address before signing in.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (!data.user) {
        setError('Authentication failed. Please try again.')
        return
      }

      // Check if user has admin privileges
      const { data: profile, error: profileError } = await supabase()
        .from('profiles')
        .select('is_admin, is_verified')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        setError('Unable to verify admin privileges. Please contact support.')
        await supabase().auth.signOut()
        return
      }

      if (!profile || !profile.is_admin) {
        setError('Access denied. Admin privileges required.')
        await supabase().auth.signOut()
        setAttemptCount(prev => prev + 1)
        return
      }

      // Successful admin login
      router.push('/admin')

    } catch (error) {
      console.error('Login error:', error)
      setError('An unexpected error occurred. Please try again.')
      setAttemptCount(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Security-themed Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        {/* Security Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ef4444' fillOpacity='0.4'%3E%3Cpath d='M20 20.5V18h-.5v2.5h-2v.5h2v2.5h.5v-2.5h2v-.5h-2z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl relative group">
              <Shield className="h-10 w-10 text-white" />
              <div className="absolute inset-0 bg-red-500/20 rounded-2xl blur-xl" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-white">
              Secure Admin Access
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Authorized personnel only - High security zone
            </p>
          </div>

          {/* Security Warning */}
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-red-400 font-medium">Restricted Access</p>
                <p className="text-red-300 mt-1">
                  This is a secure admin portal. All access attempts are logged and monitored.
                  Unauthorized access is strictly prohibited.
                </p>
              </div>
            </div>
          </div>

          <Card className="bg-gray-900/60 backdrop-blur-2xl border border-gray-700/30 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-center text-white flex items-center justify-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Administrator Login</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4 border-red-500/50 bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-gray-300">
                    Administrator Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@reyal.com"
                    className="mt-1 h-12 bg-gray-800/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-gray-300">
                    Secure Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your secure password"
                      className="h-12 bg-gray-800/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-red-500/50 focus:border-red-500 focus:ring-red-500/20 pr-12"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-10 w-10 hover:bg-gray-700/50 text-gray-400 hover:text-gray-300"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-xl hover:shadow-red-500/25 text-white font-semibold transition-all duration-300"
                  disabled={loading || attemptCount >= 5}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Authenticating...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Secure Login
                    </div>
                  )}
                </Button>
              </form>

              {attemptCount > 0 && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-orange-400">
                    Failed attempts: {attemptCount}/5
                  </p>
                </div>
              )}

              <div className="mt-6 text-center space-y-2">
                <p className="text-xs text-gray-500">
                  This system is protected by advanced security measures
                </p>
                <p className="text-xs text-gray-600">
                  All login attempts are logged and monitored for security
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
