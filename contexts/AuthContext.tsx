'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, fullName?: string, phone?: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error?: string }>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase().auth.refreshSession()
      if (error) {
        console.error('Session refresh error:', error)
        setUser(null)
      } else {
        setUser(session?.user ?? null)
      }
    } catch (error) {
      console.error('Session refresh error:', error)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase().auth.getSession()
        
        if (error) {
          console.error('Get session error:', error)
          if (mounted) {
            setUser(null)
            setLoading(false)
            setInitializing(false)
          }
          return
        }

        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
          setInitializing(false)
        }
      } catch (error) {
        console.error('Session initialization error:', error)
        if (mounted) {
          setUser(null)
          setLoading(false)
          setInitializing(false)
        }
      }
    }

    getSession()

    const { data: { subscription } } = supabase().auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (!mounted) return

        console.log('Auth state change:', event, session?.user?.email)

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              setUser(session.user)
              await createOrUpdateProfile(session.user)
            }
            setLoading(false)
            break
          
          case 'SIGNED_OUT':
            setUser(null)
            setLoading(false)
            break
          
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              setUser(session.user)
            }
            setLoading(false)
            break
          
          case 'USER_UPDATED':
            if (session?.user) {
              setUser(session.user)
            }
            setLoading(false)
            break
          
          default:
            setUser(session?.user ?? null)
            setLoading(false)
            break
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const createOrUpdateProfile = async (user: User) => {
    try {
      const { error } = await supabase()
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          phone: user.user_metadata?.phone || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (error) {
        console.error('Error creating/updating profile:', error)
      }
    } catch (error) {
      console.error('Error in createOrUpdateProfile:', error)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase().auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      })
      
      if (error) {
        let errorMessage = error.message
        
        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before signing in.'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.'
        }
        
        return { error: errorMessage }
      }
      
      return {}
    } catch (error) {
      console.error('Sign in error:', error)
      return { error: 'An unexpected error occurred. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName?: string, phone?: string) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase().auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { 
            full_name: fullName?.trim() || null, 
            phone: phone?.trim() || null 
          }
        }
      })
      
      if (error) {
        let errorMessage = error.message
        
        // Provide user-friendly error messages
        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.'
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.'
        } else if (error.message.includes('Unable to validate email')) {
          errorMessage = 'Invalid email address. Please check and try again.'
        }
        
        return { error: errorMessage }
      }
      
      return {}
    } catch (error) {
      console.error('Sign up error:', error)
      return { error: 'An unexpected error occurred. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase().auth.signOut()
      if (error) {
        console.error('Error signing out:', error.message)
      }
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setLoading(false)
    }
  }

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    try {
      const { data, error } = await supabase().auth.signInWithOAuth({
        provider,
        options: { 
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
      
      if (error) {
        let errorMessage = error.message
        
        if (error.message.includes('Provider not supported')) {
          errorMessage = `${provider} sign-in is not currently available. Please try email sign-in.`
        }
        
        return { error: errorMessage }
      }
      
      // For OAuth, the redirect happens automatically
      return {}
    } catch (error) {
      console.error('OAuth sign in error:', error)
      return { error: 'An unexpected error occurred. Please try again.' }
    }
  }

  // Show loading state during initialization
  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-gray-400 text-lg">Initializing...</span>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      signInWithOAuth,
      refreshSession
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
