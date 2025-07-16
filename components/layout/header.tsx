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
  HelpCircle,
  Phone,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const { user, signOut, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cartItemCount, setCartItemCount] = useState(3)
  const [notifications, setNotifications] = useState(2)

  const isAuthPage = pathname === '/login'

  const navigationItems = [
    { href: '/', label: 'Home', icon: Home, active: pathname === '/' },
    { href: '/marketplace', label: 'Marketplace', icon: Search, active: pathname === '/marketplace' },
    { href: '/services', label: 'Services', icon: Package2, active: pathname.startsWith('/services') },
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
        'sticky top-0 z-50 w-full bg-header border-b border-header backdrop-blur-md',
        className
      )}>
        <div className="container-page h-16 flex items-center justify-between">
          <div className="w-8 h-8 bg-muted rounded animate-pulse" />
          <div className="flex space-x-4">
            <div className="w-20 h-8 bg-muted rounded animate-pulse" />
            <div className="w-20 h-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className={cn(
      'sticky top-0 z-50 w-full bg-header/95 backdrop-blur-md border-b border-header shadow-sm',
      className
    )}>
      <div className="container-page h-16 flex items-center justify-between">
        {/* Mobile menu trigger */}
        <div className="flex items-center space-x-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-header hover:bg-accent/10"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-section border-border">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border">
                  <Link href="/" className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-green rounded-lg flex items-center justify-center shadow-lg">
                      <Layers className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="text-lg font-bold text-foreground">REYAL</span>
                      <div className="text-xs text-primary font-medium tracking-wider">3D PRINTING</div>
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
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  
                  {user && dashboardItems.length > 0 && (
                    <>
                      <div className="my-4 border-t border-border" />
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </>
                  )}
                </nav>

                <div className="p-4 border-t border-border">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                          <AvatarFallback className="bg-primary text-white">
                            {user.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.user_metadata?.full_name || user.email?.split('@')[0]}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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
                    <Button asChild className="w-full btn-primary">
                      <Link href="/login">Sign In</Link>
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-green rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-primary/25 transition-all duration-300 group-hover:scale-105">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="hidden sm:block">
              <span className="text-2xl font-bold text-header">REYAL</span>
              <div className="text-xs text-primary font-medium tracking-wider">3D PRINTING</div>
            </div>
          </Link>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative group font-medium transition-all duration-300 text-sm',
                item.active
                  ? 'text-primary'
                  : 'text-header hover:text-primary'
              )}
            >
              <span>{item.label}</span>
              <div className={cn(
                'absolute -bottom-1 left-0 h-0.5 bg-primary rounded-full transition-all duration-300',
                item.active ? 'w-full' : 'w-0 group-hover:w-full'
              )} />
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="relative text-header hover:bg-accent/10"
            >
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-white animate-pulse">
                  {notifications}
                </Badge>
              )}
            </Button>
          )}

          {/* Cart */}
          <Button
            variant="ghost"
            size="sm"
            className="relative border border-border bg-background/50 hover:bg-accent/10 text-header"
            asChild
          >
            <Link href="/cart">
              <ShoppingCart className="h-4 w-4 mr-2 transition-transform hover:scale-110" />
              Cart
              {cartItemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-white shadow-lg animate-pulse">
                  {cartItemCount}
                </Badge>
              )}
            </Link>
          </Button>

          {/* User menu or sign in */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                    <AvatarFallback className="bg-primary text-white">
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-section border-border" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">
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
              className="btn-primary shadow-lg hover:shadow-primary/25 transition-all duration-300"
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
