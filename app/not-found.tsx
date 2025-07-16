"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Home, Search, ArrowLeft, Package, AlertTriangle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-12">
            <div className="relative mb-8">
              <div className="relative flex h-32 w-32 mx-auto items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/30">
                <AlertTriangle className="h-16 w-16 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-6xl font-bold text-white">404</h1>
                <h2 className="text-2xl font-semibold text-emerald-400">Page Not Found</h2>
                <p className="text-gray-400 text-lg max-w-md mx-auto">
                  The 3D model you're looking for seems to have been moved to a different dimension.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-700/30">
                  <Package className="h-8 w-8 text-emerald-400" />
                  <span className="text-sm text-gray-300">Lost Print</span>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-700/30">
                  <Search className="h-8 w-8 text-emerald-400" />
                  <span className="text-sm text-gray-300">Still Searching</span>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-700/30">
                  <AlertTriangle className="h-8 w-8 text-emerald-400" />
                  <span className="text-sm text-gray-300">Error 404</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  <Link href="/marketplace">
                    <Search className="mr-2 h-4 w-4" />
                    Browse Marketplace
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-700/50">
                  <Link href="javascript:history.back()">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                  </Link>
                </Button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <p className="text-sm text-gray-500">
                  Need help? <Link href="/contact" className="text-emerald-400 hover:text-emerald-300 underline">Contact our support team</Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
