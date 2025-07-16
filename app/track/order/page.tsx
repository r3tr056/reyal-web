"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  Download,
  Share2,
  Calendar,
  ShoppingCart,
} from "lucide-react"

export default function TrackOrderPage() {
  const [order, setOrder] = useState<any>(null)
  const [trackingSteps, setTrackingSteps] = useState([
    {
      id: 1,
      title: "Order Placed",
      description: "Your order has been received and is being processed",
      date: "2024-01-15 10:30 AM",
      status: "completed",
      icon: CheckCircle,
    },
    {
      id: 2,
      title: "3D Printing Started",
      description: "Your items are being printed with high-quality materials",
      date: "2024-01-15 2:45 PM",
      status: "completed",
      icon: Package,
    },
    {
      id: 3,
      title: "Quality Check",
      description: "Items are being inspected for quality assurance",
      date: "2024-01-16 11:20 AM",
      status: "current",
      icon: CheckCircle,
    },
    {
      id: 4,
      title: "Packaging",
      description: "Items are being carefully packaged for shipping",
      date: "",
      status: "pending",
      icon: Package,
    },
    {
      id: 5,
      title: "Shipped",
      description: "Package is on its way to your delivery address",
      date: "",
      status: "pending",
      icon: Truck,
    },
    {
      id: 6,
      title: "Delivered",
      description: "Package has been delivered to your address",
      date: "",
      status: "pending",
      icon: CheckCircle,
    },
  ])

  useEffect(() => {
    // Load order data from localStorage
    const orders = JSON.parse(localStorage.getItem("orders") || "[]")
    // Use the first order for demo purposes, or implement proper order selection
    const foundOrder = orders.length > 0 ? orders[0] : null
    if (foundOrder) {
      setOrder(foundOrder)
    }
  }, [])

  const getProgressPercentage = () => {
    const completedSteps = trackingSteps.filter((step) => step.status === "completed").length
    const currentStep = trackingSteps.find((step) => step.status === "current")
    const totalSteps = trackingSteps.length

    let progress = (completedSteps / totalSteps) * 100
    if (currentStep) {
      progress += (1 / totalSteps) * 50 // Add 50% for current step
    }

    return Math.min(progress, 100)
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
            <p className="text-gray-600 mb-6">The order you're looking for doesn't exist or has been removed.</p>
            <Button asChild>
              <Link href="/orders">View All Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <Button variant="ghost" size="sm" className="mb-4" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
          </Button>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Track Order
              </h1>
              <p className="text-gray-600">Order ID: {order.id}</p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <Badge className="bg-yellow-100 text-yellow-800 flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span className="capitalize">{order.status}</span>
              </Badge>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Order Progress</h3>
                <span className="text-sm text-gray-600">{Math.round(getProgressPercentage())}% Complete</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {trackingSteps.map((step) => {
                  const Icon = step.icon
                  return (
                    <div key={step.id} className="text-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 ${
                          step.status === "completed"
                            ? "bg-green-500 text-white"
                            : step.status === "current"
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-xs font-medium">{step.title}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Tracking Timeline */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Tracking Timeline
                </CardTitle>
                <CardDescription>Real-time updates on your order status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {trackingSteps.map((step, index) => (
                    <div key={step.id} className="flex items-start space-x-4">
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            step.status === "completed"
                              ? "bg-green-500 text-white"
                              : step.status === "current"
                                ? "bg-blue-500 text-white animate-pulse"
                                : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          <step.icon className="h-5 w-5" />
                        </div>
                        {index < trackingSteps.length - 1 && (
                          <div
                            className={`absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-8 ${
                              step.status === "completed" ? "bg-green-500" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3
                          className={`font-semibold ${step.status === "current" ? "text-blue-600" : "text-gray-900"}`}
                        >
                          {step.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-1">{step.description}</p>
                        {step.date && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            {step.date}
                          </div>
                        )}
                        {step.status === "current" && (
                          <Badge className="mt-2 bg-blue-100 text-blue-800">In Progress</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mt-8">
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item: any, index: number) => (
                    <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <Image
                        src="/placeholder.svg?height=60&width=60"
                        alt={item.name}
                        width={60}
                        height={60}
                        className="rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-gray-600">Quantity: {item.quantity}</p>
                        <p className="text-sm text-gray-500">Material: PLA, Color: Black</p>
                      </div>
                      <span className="font-semibold">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Details Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Order Total</span>
                  <span className="font-semibold">₹{order.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Date</span>
                  <span>{new Date(order.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expected Delivery</span>
                  <span>{new Date(order.estimatedDelivery).toLocaleDateString()}</span>
                </div>
                {order.trackingNumber && (
                  <div className="flex justify-between">
                    <span>Tracking Number</span>
                    <span className="font-mono text-sm">{order.trackingNumber}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{order.shippingAddress}</p>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                  <Link href="tel:+919876543210">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Support
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                  <Link href="mailto:support@reyal.in">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Support
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
