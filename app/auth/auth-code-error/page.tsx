"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Home, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AuthCodeErrorPage() {
  useEffect(() => {
    // Log the error for debugging in development only
    if (process.env.NODE_ENV === 'development') {
      console.error("Authentication code error occurred")
    }
  }, [])

  const handleRetry = () => {
    window.location.href = "/login"
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
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl relative group">
                <AlertCircle className="h-10 w-10 text-white" />
                <div className="absolute inset-0 bg-red-500/20 rounded-2xl blur-xl" />
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">Authentication Error</CardTitle>
              <CardDescription className="text-gray-400 text-base">
                There was a problem with the authentication process
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">
                  The authentication code provided was invalid or expired. This can happen if:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>The link was already used</li>
                    <li>The link has expired</li>
                    <li>There was a network issue during sign-in</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Button
                  onClick={handleRetry}
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-xl hover:shadow-emerald-500/25 text-white font-semibold transition-all duration-300 group"
                >
                  <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                  Try Again
                </Button>

                <Button
                  variant="outline"
                  asChild
                  className="w-full h-12 bg-white/5 border-gray-600/50 hover:bg-white/10 hover:border-gray-500 text-gray-300 hover:text-white transition-all duration-300"
                >
                  <Link href="/">
                    <Home className="w-4 h-4 mr-2" />
                    Go to Homepage
                  </Link>
                </Button>
              </div>

              <div className="text-center pt-4">
                <p className="text-sm text-gray-500">
                  Still having trouble?{" "}
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
  )
}