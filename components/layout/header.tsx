'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Layers,
  ShoppingCart,
  User,
  Menu,
  Package2,
  Home,
  Search,
  Bell,
  LogOut,
  Settings,
  Upload,
  Heart,
  History,
  CreditCard,
  HelpCircle,
  Phone,
  MapPin,
  Sparkles,
  Printer,
  PlusCircle,
  FileText,
  Truck
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface HeaderProps {
  className?: string
  variant?: 'default' | 'light' | 'minimal'
  showSearch?: boolean
  showNotifications?: boolean
}

export function Header({ 
  className, 
  variant = 'default',
  showSearch = true,
  showNotifications = true
}: HeaderProps) {
  const { user, signOut, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cartItemCount, setCartItemCount] = useState(3)
  const [notifications, setNotifications] = useState(2)

  const isAuthPage = pathname === '/login'
  const isCheckoutFlow = ['/cart', '/checkout', '/orders', '/profile', '/track'].some(path => pathname.startsWith(path))
  const isDashboardPage = ['/orders', '/profile'].some(path => pathname.startsWith(path))

  const headerVariants = {
    default: 'backdrop-blur-xl bg-gray-900/80 border-b border-gray-800/30 text-white',
    light: 'backdrop-blur-md bg-white/80 border-b border-gray-100 text-gray-900',
    minimal: 'backdrop-blur-sm bg-transparent border-b border-gray-200/50 text-gray-900'
  }

  const getVariantForPage = () => {
    if (variant !== 'default') return variant
    if (isCheckoutFlow || isDashboardPage) return 'light'
    return 'default'
  }

  const currentVariant = getVariantForPage()
  const isDark = currentVariant === 'default'

  const navigationItems = [
    { href: '/', label: 'Home', icon: Home, active: pathname === '/' },
    { href: '/marketplace', label: 'Marketplace', icon: Search, active: pathname === '/marketplace' },
    { href: '/services', label: 'Services', icon: Printer, active: pathname.startsWith('/services') },
    { href: '/contact', label: 'Contact', icon: Phone, active: pathname === '/contact' }
  ]

  const dashboardItems = user ? [
    { href: '/orders', label: 'Orders', icon: Package2, active: pathname === '/orders' },
    { href: '/profile', label: 'Profile', icon: User, active: pathname === '/profile' }
  ] : []

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <header className={cn(
        'sticky top-0 z-50 w-full h-16',
        headerVariants[currentVariant],
        className
      )}>
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="w-8 h-8 bg-gray-300 rounded animate-pulse" />
          <div className="flex space-x-4">
            <div className="w-20 h-8 bg-gray-300 rounded animate-pulse" />
            <div className="w-20 h-8 bg-gray-300 rounded animate-pulse" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className={cn(
      'sticky top-0 z-50 w-full',
      headerVariants[currentVariant],
      className
    )}>
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'md:hidden',
                  isDark ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                )}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className={cn(
              'w-80',
              isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
            )}>
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-200">
                  <Link href="/" className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Layers className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="text-lg font-bold">REYAL</span>
                      <div className="text-xs text-emerald-500 font-medium">3D PRINTING</div>
                    </div>
                  </Link>
                </div>
                
                <nav className="flex-1 p-4 space-y-2">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors',
                        item.active
                          ? 'bg-emerald-500/10 text-emerald-600 font-medium'
                          : isDark 
                            ? 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  
                  {user && dashboardItems.length > 0 && (
                    <>
                      <div className="my-4 border-t border-gray-200" />
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Dashboard
                      </div>
                      {dashboardItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors',
                            item.active
                              ? 'bg-emerald-500/10 text-emerald-600 font-medium'
                              : isDark 
                                ? 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </>
                  )}
                </nav>

                <div className="p-4 border-t border-gray-200">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                          <AvatarFallback className="bg-emerald-500 text-white">
                            {user.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.user_metadata?.full_name || user.email?.split('@')[0]}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSignOut}
                        className="w-full justify-start"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <Button asChild className="w-full">
                      <Link href="/login">Sign In</Link>
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-xl group-hover:shadow-emerald-500/25 transition-all duration-500 group-hover:scale-110">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="hidden sm:block">
              <span className={cn(
                'text-2xl font-bold',
                isDark ? 'text-white' : 'text-gray-900'
              )}>
                REYAL
              </span>
              <div className="text-xs text-emerald-400 font-medium tracking-wider">3D PRINTING</div>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative group font-medium transition-all duration-300',
                item.active
                  ? 'text-emerald-400'
                  : isDark
                    ? 'text-gray-300 hover:text-emerald-400'
                    : 'text-gray-600 hover:text-emerald-600'
              )}
            >
              <span>{item.label}</span>
              <div className={cn(
                'absolute -bottom-1 left-0 h-0.5 bg-emerald-500 rounded-full transition-all duration-300',
                item.active ? 'w-full' : 'w-0 group-hover:w-full'
              )} />
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
          {showNotifications && user && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'relative',
                isDark ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
              )}
            >
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-emerald-500 text-white animate-pulse">
                  {notifications}
                </Badge>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'relative',
              isDark 
                ? 'border-gray-700/50 bg-gray-800/30 hover:bg-gray-700/50 text-gray-300 hover:text-white hover:border-emerald-500/50'
                : 'border-gray-300/50 bg-gray-100/30 hover:bg-gray-200/50 text-gray-600 hover:text-gray-900 hover:border-emerald-500/50'
            )}
            asChild
          >
            <Link href="/cart">
              <ShoppingCart className="h-4 w-4 mr-2 transition-transform hover:scale-110" />
              Cart
              {cartItemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-emerald-500 text-white shadow-lg animate-pulse">
                  {cartItemCount}
                </Badge>
              )}
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                    <AvatarFallback className="bg-emerald-500 text-white">
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.user_metadata?.full_name || user.email?.split('@')[0]}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/orders" className="cursor-pointer">
                    <Package2 className="mr-2 h-4 w-4" />
                    <span>Orders</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push('/?upload=true')}
                  className="cursor-pointer"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  <span>Upload Design</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile?tab=settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/contact" className="cursor-pointer">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Support</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !isAuthPage ? (
            <Button
              size="sm"
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-xl hover:shadow-emerald-500/25 text-white transition-all duration-300"
              asChild
            >
              <Link href="/login">
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
