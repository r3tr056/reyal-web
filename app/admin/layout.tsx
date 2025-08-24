'use client'

import { AdminAuthProvider } from '@/components/admin/AdminAuthProvider'
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Settings, 
  FileText, 
  BarChart3, 
  LogOut, 
  Printer,
  Download,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

interface AdminLayoutProps {
  children: React.ReactNode
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAdminAuth()

  const handleLogout = async () => {
    try {
      await supabase().auth.signOut()
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/admin/login')
    }
  }

  const navigationItems = [
    {
      title: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard
    },
    {
      title: 'Orders',
      href: '/admin/orders',
      icon: Package
    },
    {
      title: 'Print Jobs',
      href: '/admin/print-jobs',
      icon: Printer
    },
    {
      title: 'Files',
      href: '/admin/files',
      icon: Download
    },
    {
      title: 'Quotes',
      href: '/admin/quotes',
      icon: FileText
    },
    {
      title: 'Users',
      href: '/admin/users',
      icon: Users
    },
    {
      title: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3
    },
    {
      title: 'Settings',
      href: '/admin/settings',
      icon: Settings
    }
  ]

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-950">
        <Sidebar className="border-r border-gray-800 bg-gray-900">
          <SidebarHeader className="border-b border-gray-800 p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-white">REYAL Admin</h2>
                <p className="text-xs text-gray-400">Secure Management Panel</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/admin' && pathname.startsWith(item.href))
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      className={cn(
                        'w-full text-gray-300 hover:text-white hover:bg-gray-800 transition-colors',
                        isActive && 'bg-emerald-600 text-white hover:bg-emerald-700'
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>

          <div className="mt-auto p-4 border-t border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 bg-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-white">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-sm">
                <p className="font-medium text-white">
                  {user?.user_metadata?.full_name || 'Admin'}
                </p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-gray-900 border-b border-gray-800 p-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-gray-300 hover:text-white" />
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-400">
                  Secure management for REYAL 3D printing platform
                </p>
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-6 bg-gray-950">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </AdminAuthProvider>
  )
}
