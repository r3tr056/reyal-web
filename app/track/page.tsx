"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Layers, Package, Zap, ArrowLeft, Search, Truck, Clock, CheckCircle, MapPin, Calendar } from "lucide-react"
import { PageTransition } from "@/components/page-transition"
import { motion } from "framer-motion"

const mockTrackingData = {
  "ORD-2024-001": {
    status: "delivered",
    trackingNumber: "TRK123456789",
    estimatedDelivery: "2024-01-18",
    actualDelivery: "2024-01-17",
    timeline: [
      { status: "Order Placed", date: "2024-01-15 10:30 AM", completed: true },
      { status: "Design Approved", date: "2024-01-15 02:00 PM", completed: true },
      { status: "Printing Started", date: "2024-01-16 09:00 AM", completed: true },
      { status: "Quality Check", date: "2024-01-16 05:00 PM", completed: true },
      { status: "Shipped", date: "2024-01-16 07:00 PM", completed: true },
      { status: "Out for Delivery", date: "2024-01-17 10:00 AM", completed: true },
      { status: "Delivered", date: "2024-01-17 02:30 PM", completed: true },
    ]
  }
}

export default function TrackPage() {
  const [orderId, setOrderId] = useState("")
  const [trackingData, setTrackingData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleTrack = () => {
    if (!orderId.trim()) {
      setError("Please enter an order ID")
      return
    }

    setIsLoading(true)
    setError("")
    
    // Simulate API call
    setTimeout(() => {
      const data = mockTrackingData[orderId as keyof typeof mockTrackingData]
      if (data) {
        setTrackingData(data)
      } else {
        setError("Order not found. Please check your order ID.")
      }
      setIsLoading(false)
    }, 1000)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "shipped":
      case "out for delivery":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "processing":
      case "printing started":
      case "quality check":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Button variant="ghost" size="sm" className="mb-4 text-gray-300 hover:text-white" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
            Track Your Order
          </h1>
          <p className="text-gray-400">Enter your order ID to track your 3D printing order status</p>
        </motion.div>

        {/* Search Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Track Order
              </CardTitle>
              <CardDescription className="text-gray-400">
                Enter your order ID (e.g., ORD-2024-001) to get real-time tracking information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Input
                  placeholder="Enter Order ID..."
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-gray-300"
                  onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                />
                <Button 
                  onClick={handleTrack}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                >
                  {isLoading ? "Tracking..." : "Track"}
                </Button>
              </div>
              {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center space-y-8 py-16"
          >
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full border-4 border-emerald-500/20"></div>
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/20">
                <div className="relative">
                  <Package className="h-10 w-10 text-emerald-400 animate-pulse" />
                  <div className="absolute -top-2 -right-2">
                    <Zap className="h-5 w-5 text-emerald-400 animate-bounce" />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold text-white">Tracking Your Order</h2>
              <p className="text-gray-400 max-w-md">
                Please wait while we fetch the latest updates on your 3D printing order...
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-800/50">
                <Layers className="h-6 w-6 text-emerald-400 animate-pulse" />
                <span className="text-xs text-gray-400">Slicing</span>
              </div>
              <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-800/50">
                <div className="relative">
                  <Package className="h-6 w-6 text-emerald-400" />
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-400"></div>
                </div>
                <span className="text-xs text-gray-400">Printing</span>
              </div>
              <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-800/50">
                <Zap className="h-6 w-6 text-emerald-400 animate-bounce" />
                <span className="text-xs text-gray-400">Processing</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tracking Results */}
        {trackingData && !isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Order Status Card */}
            <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Order Status</CardTitle>
                    <CardDescription className="text-gray-400">Tracking ID: {trackingData.trackingNumber}</CardDescription>
                  </div>
                  <Badge className={`${getStatusColor(trackingData.status)} border flex items-center space-x-1`}>
                    <CheckCircle className="h-4 w-4" />
                    <span className="capitalize">{trackingData.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Estimated Delivery</p>
                        <p className="text-gray-400">{new Date(trackingData.estimatedDelivery).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {trackingData.actualDelivery && (
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <div>
                          <p className="text-sm font-medium text-white">Delivered On</p>
                          <p className="text-gray-400">{new Date(trackingData.actualDelivery).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Truck className="h-4 w-4 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Tracking Number</p>
                        <p className="text-gray-400 font-mono">{trackingData.trackingNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-4 w-4 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Delivery Address</p>
                        <p className="text-gray-400">Mumbai, Maharashtra</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">Order Timeline</CardTitle>
                <CardDescription className="text-gray-400">Track your order progress from printing to delivery</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {trackingData.timeline.map((event: any, index: number) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className={`flex items-center space-x-4 p-4 rounded-lg ${
                        event.completed ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-gray-700/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        event.completed ? 'bg-emerald-500' : 'bg-gray-600'
                      }`}>
                        {event.completed ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-medium ${event.completed ? 'text-white' : 'text-gray-400'}`}>
                          {event.status}
                        </h3>
                        <p className={`text-sm ${event.completed ? 'text-emerald-400' : 'text-gray-500'}`}>
                          {event.date}
                        </p>
                      </div>
                      {event.completed && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          Completed
                        </Badge>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
                asChild
              >
                <Link href="/orders">View All Orders</Link>
              </Button>
              <Button
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                asChild
              >
                <Link href="/contact">Contact Support</Link>
              </Button>
            </div>
          </motion.div>
        )}

        {/* Demo Info */}
        {!trackingData && !isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center py-16"
          >
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Ready to Track</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Enter your order ID above to get real-time tracking updates. For demo purposes, try "ORD-2024-001".
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700/50" asChild>
                <Link href="/orders">View My Orders</Link>
              </Button>
              <Button className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700" asChild>
                <Link href="/marketplace">Start Shopping</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
