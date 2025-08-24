'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks'
import { initializeAuth, setUser, clearError } from '@/lib/store/slices/authSlice'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useAppDispatch()
  const { initializing, sessionChecked } = useAppSelector((state) => state.auth)

  useEffect(() => {
    let mounted = true

    // Initialize auth state
    dispatch(initializeAuth())

    // Listen for auth changes
    const { data: { subscription } } = supabase().auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (!mounted) return

        console.log('Auth state change:', event, session?.user?.email)

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              // Get user profile
              try {
                const { data: profile, error } = await supabase()
                  .from('profiles')
                  .select('*')
                  .eq('id', session.user.id)
                  .single()

                if (error) {
                  console.error('Profile fetch error:', error)
                }

                dispatch(setUser({ 
                  user: session.user, 
                  profile: profile || null 
                }))
              } catch (error) {
                console.error('Error fetching profile:', error)
                dispatch(setUser({ user: session.user }))
              }
            }
            break
          
          case 'SIGNED_OUT':
            dispatch(setUser({ user: null, profile: null }))
            break
          
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              dispatch(setUser({ user: session.user }))
            }
            break
          
          case 'USER_UPDATED':
            if (session?.user) {
              dispatch(setUser({ user: session.user }))
            }
            break
          
          default:
            if (session?.user) {
              dispatch(setUser({ user: session.user }))
            } else {
              dispatch(setUser({ user: null, profile: null }))
            }
            break
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [dispatch])

  // Clear any errors after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(clearError())
    }, 5000)

    return () => clearTimeout(timer)
  }, [dispatch])

  // Show loading state during initialization
  if (initializing && !sessionChecked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-gray-400 text-lg">Initializing authentication...</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
