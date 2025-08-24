'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface AdminUser extends User {
  is_admin?: boolean
  is_verified?: boolean
}

interface AdminAuthProviderProps {
  children: React.ReactNode
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase().auth.getSession()
        
        if (sessionError || !session?.user) {
          if (mounted) {
            setUser(null)
            setIsAdmin(false)
            setLoading(false)
            router.push('/admin/login')
          }
          return
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase()
          .from('profiles')
          .select('is_admin, is_verified')
          .eq('id', session.user.id)
          .single()

        if (profileError || !profile?.is_admin) {
          if (mounted) {
            setUser(null)
            setIsAdmin(false)
            setLoading(false)
            router.push('/admin/login')
          }
          return
        }

        if (mounted) {
          const adminUser: AdminUser = {
            ...session.user,
            is_admin: profile.is_admin,
            is_verified: profile.is_verified
          }
          setUser(adminUser)
          setIsAdmin(true)
          setLoading(false)
        }
      } catch (error) {
        console.error('Admin auth check error:', error)
        if (mounted) {
          setUser(null)
          setIsAdmin(false)
          setLoading(false)
          router.push('/admin/login')
        }
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase().auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (!mounted) return

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          setIsAdmin(false)
          setLoading(false)
          router.push('/admin/login')
          return
        }

        if (event === 'SIGNED_IN' && session) {
          await checkAuth()
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-gray-400 text-lg">Verifying admin access...</span>
        </div>
      </div>
    )
  }

  // Show access denied if not admin
  if (!isAdmin || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-6">You don't have permission to access the admin panel.</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function useAdminAuth() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase().auth.getSession()
      
      if (session?.user) {
        const { data: profile } = await supabase()
          .from('profiles')
          .select('is_admin, is_verified')
          .eq('id', session.user.id)
          .single()

        const adminUser: AdminUser = {
          ...session.user,
          is_admin: profile?.is_admin || false,
          is_verified: profile?.is_verified || false
        }
        setUser(adminUser)
      }
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase().auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (session?.user) {
          const { data: profile } = await supabase()
            .from('profiles')
            .select('is_admin, is_verified')
            .eq('id', session.user.id)
            .single()

          const adminUser: AdminUser = {
            ...session.user,
            is_admin: profile?.is_admin || false,
            is_verified: profile?.is_verified || false
          }
          setUser(adminUser)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}