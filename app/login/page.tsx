"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, ShoppingCart, CheckCircle, Layers, Shield, Zap, Users, Github, Mail, ArrowRight, Sparkles, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("signin")
  
  const { signIn, signUp, signInWithOAuth, user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !loading) {
      router.push("/")
    }
  }, [user, loading, router])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.target as HTMLFormElement)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    let result
    if (activeTab === "signin") {
      result = await signIn(email, password)
    } else {
      const firstName = formData.get("firstName") as string
      const lastName = formData.get("lastName") as string
      const phone = formData.get("phone") as string
      const fullName = `${firstName} ${lastName}`.trim()
      
      result = await signUp(email, password, fullName, phone)
    }

    if (result.error) {
      setError(result.error)
    } else {
      setLoginSuccess(true)
      if (activeTab === "signup") {
        setError("")
        setTimeout(() => {
          setActiveTab("signin")
          setLoginSuccess(false)
        }, 3000)
      } else {
        setTimeout(() => {
          router.push("/")
        }, 1000)
      }
    }

    setIsLoading(false)
  }

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setError("")
    const result = await signInWithOAuth(provider)
    if (result.error) {
      setError(result.error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-gray-400 text-lg">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-emerald-500/10 via-transparent to-green-500/10 rounded-full blur-3xl animate-spin" style={{ animationDuration: '20s' }}></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%2310b981' fillOpacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />



      {/* Main Content */}
      <div className="relative z-10 min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Hero Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-3 bg-gray-800/50 backdrop-blur-sm px-6 py-3 rounded-full border border-gray-700/30 group hover:border-emerald-500/30 transition-all duration-300">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-sm font-medium text-gray-300 group-hover:text-emerald-300 transition-colors">
                    Professional Manufacturing Platform
                  </span>
                </div>

                <h1 className="text-6xl lg:text-7xl font-bold text-white leading-tight">
                  Welcome to the
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
                    Future
                  </span>
                </h1>

                <p className="text-xl text-gray-400 leading-relaxed max-w-2xl">
                  Join thousands of innovators who trust REYAL for precision 3D manufacturing. 
                  Access professional services, track projects in real-time, and connect with our engineering experts.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 py-8">
                {[
                  { value: "50K+", label: "Projects Completed" },
                  { value: "99.9%", label: "Precision Rate" },
                  { value: "24/7", label: "Expert Support" }
                ].map((stat, index) => (
                  <div key={index} className="text-center group">
                    <div className="text-3xl font-bold text-emerald-400 mb-2 group-hover:scale-110 transition-transform">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Benefits */}
              <div className="space-y-4">
                {[
                  {
                    icon: Shield,
                    title: "Enterprise Security",
                    description: "Bank-level encryption and secure processing",
                  },
                  {
                    icon: Zap,
                    title: "Instant Analysis",
                    description: "Real-time pricing and manufacturing insights",
                  },
                  {
                    icon: Users,
                    title: "Expert Support",
                    description: "Direct access to our engineering team",
                  },
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-4 group">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-green-600/20 rounded-xl flex items-center justify-center border border-emerald-500/20 group-hover:border-emerald-500/40 transition-all duration-300">
                      <benefit.icon className="h-6 w-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1 group-hover:text-emerald-300 transition-colors">{benefit.title}</h3>
                      <p className="text-gray-400 text-sm">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="max-w-md mx-auto w-full">
              <Card className="bg-gray-900/60 backdrop-blur-2xl border border-gray-700/30 shadow-2xl">
                <CardHeader className="text-center pb-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl relative group">
                    <Layers className="h-10 w-10 text-white group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardTitle className="text-3xl font-bold text-white mb-2">Welcome Back</CardTitle>
                  <CardDescription className="text-gray-400 text-base">
                    Sign in to continue your manufacturing journey
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Social Login Buttons */}
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      onClick={() => handleOAuthSignIn('google')}
                      className="w-full h-12 bg-white/5 border-gray-600/50 hover:bg-white/10 hover:border-gray-500 text-gray-300 hover:text-white transition-all duration-300 group"
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleOAuthSignIn('github')}
                      className="w-full h-12 bg-gray-800/50 border-gray-600/50 hover:bg-gray-700/50 hover:border-gray-500 text-gray-300 hover:text-white transition-all duration-300 group"
                      disabled={isLoading}
                    >
                      <Github className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                      Continue with GitHub
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full bg-gray-700/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-gray-900 px-4 text-gray-500 font-medium">Or continue with email</span>
                    </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-800/50 border border-gray-700/30">
                      <TabsTrigger
                        value="signin"
                        className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                      >
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger
                        value="signup"
                        className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                      >
                        Sign Up
                      </TabsTrigger>
                    </TabsList>

                    {error && (
                      <Alert className="mb-4 border-red-500/50 bg-red-500/10">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-400">
                          {error}
                        </AlertDescription>
                      </Alert>
                    )}

                    <TabsContent value="signin" className="space-y-4">
                      <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-gray-300 text-sm font-medium">
                            Email Address
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Enter your email"
                            required
                            className="h-12 bg-gray-800/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-gray-300 text-sm font-medium">
                            Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              required
                              className="h-12 bg-gray-800/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-300 pr-12"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1 h-10 w-10 hover:bg-gray-700/50 text-gray-400 hover:text-gray-300"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="remember" className="border-gray-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                            <Label htmlFor="remember" className="text-sm text-gray-400">
                              Remember me
                            </Label>
                          </div>
                          <Link href="#" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                            Forgot password?
                          </Link>
                        </div>
                        <Button
                          type="submit"
                          className="w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-xl hover:shadow-emerald-500/25 text-white font-semibold transition-all duration-300 group"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <div className="flex items-center">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Signing in...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              Sign In
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-4">
                      <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-gray-300 text-sm font-medium">
                              First Name
                            </Label>
                            <Input
                              id="firstName"
                              name="firstName"
                              placeholder="John"
                              required
                              className="h-12 bg-gray-800/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-300"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-gray-300 text-sm font-medium">
                              Last Name
                            </Label>
                            <Input
                              id="lastName"
                              name="lastName"
                              placeholder="Doe"
                              required
                              className="h-12 bg-gray-800/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-300"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signupEmail" className="text-gray-300 text-sm font-medium">
                            Email Address
                          </Label>
                          <Input
                            id="signupEmail"
                            name="email"
                            type="email"
                            placeholder="Enter your email"
                            required
                            className="h-12 bg-gray-800/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signupPassword" className="text-gray-300 text-sm font-medium">
                            Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="signupPassword"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a strong password"
                              required
                              className="h-12 bg-gray-800/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-300 pr-12"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1 h-10 w-10 hover:bg-gray-700/50 text-gray-400 hover:text-gray-300"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-gray-300 text-sm font-medium">
                            Phone Number
                          </Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="+91 98765 43210"
                            className="h-12 bg-gray-800/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-300"
                          />
                        </div>
                        <div className="flex items-start space-x-2">
                          <Checkbox id="terms" required className="border-gray-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 mt-1" />
                          <Label htmlFor="terms" className="text-sm text-gray-400 leading-relaxed">
                            I agree to the{" "}
                            <Link href="#" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                              Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link href="#" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                              Privacy Policy
                            </Link>
                          </Label>
                        </div>
                        <Button
                          type="submit"
                          className="w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-xl hover:shadow-emerald-500/25 text-white font-semibold transition-all duration-300 group"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <div className="flex items-center">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Creating account...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              Create Account
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>

                  {loginSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center backdrop-blur-sm">
                      <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                      <p className="text-emerald-400 font-medium">
                        {activeTab === "signin" 
                          ? "Success! Redirecting to your dashboard..." 
                          : "Account created! Check your email for verification."
                        }
                      </p>
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      Need help?{" "}
                      <Link href="/contact" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                        Contact Support
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
