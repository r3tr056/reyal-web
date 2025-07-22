"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
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
  AlertCircle,
  Loader2,
} from "lucide-react"

interface OrderData {
  id: string
  order_number: string
  status: string
  payment_status: string
  total_amount: number
  created_at: string
  updated_at: string
  estimated_delivery_date?: string
  tracking_number?: string
  shipping_address: {
    name: string
    phone: string
    address_line_1: string
    address_line_2?: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  order_items: Array<{
    id: string
    file_name: string
    quantity: number
    unit_price: number
    total_price: number
    material?: string
    color?: string
    print_quality?: string
  }>
  financial_summary: {
    subtotal: string
    discount: string
    tax: string
    shipping: string
    total: string
  }
  notes?: string
  business_notes?: string
}

interface TrackingStep {
  id: number
  title: string
  description: string
  date?: string
  status: "completed" | "current" | "pending"
  icon: any
}

export default function TrackOrderPage({ 
  params 
}: { 
  params: { orderId: string } 
}) {
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trackingSteps, setTrackingSteps] = useState<TrackingStep[]>([])

  // Define tracking steps based on order status
  const generateTrackingSteps = (orderStatus: string, createdAt: string, updatedAt: string) => {
    const baseSteps: TrackingStep[] = [
      {
        id: 1,
        title: "Order Placed",
        description: "Your order has been received and is being processed",
        date: new Date(createdAt).toLocaleString(),
        status: "completed",
        icon: CheckCircle,
      },
      {
        id: 2,
        title: "Order Confirmed",
        description: "Order details verified and payment confirmed",
        date: orderStatus !== "pending" ? new Date(createdAt).toLocaleString() : undefined,
        status: orderStatus === "pending" ? "current" : "completed",
        icon: CheckCircle,
      },
      {
        id: 3,
        title: "3D Printing Started",
        description: "Your items are being printed with high-quality materials",
        date: ["processing", "shipped", "delivered"].includes(orderStatus) ? new Date(updatedAt).toLocaleString() : undefined,
        status: orderStatus === "confirmed" ? "current" : ["processing", "shipped", "delivered"].includes(orderStatus) ? "completed" : "pending",
        icon: Package,
      },
      {
        id: 4,
        title: "Quality Check",
        description: "Items are being inspected for quality assurance",
        date: ["shipped", "delivered"].includes(orderStatus) ? new Date(updatedAt).toLocaleString() : undefined,
        status: orderStatus === "processing" ? "current" : ["shipped", "delivered"].includes(orderStatus) ? "completed" : "pending",
        icon: CheckCircle,
      },
      {
        id: 5,
        title: "Shipped",
        description: "Package is on its way to your delivery address",
        date: orderStatus === "delivered" ? new Date(updatedAt).toLocaleString() : undefined,
        status: orderStatus === "shipped" ? "current" : orderStatus === "delivered" ? "completed" : "pending",
        icon: Truck,
      },
      {
        id: 6,
        title: "Delivered",
        description: "Package has been delivered to your address",
        date: orderStatus === "delivered" ? new Date(updatedAt).toLocaleString() : undefined,
        status: orderStatus === "delivered" ? "completed" : "pending",
        icon: CheckCircle,
      },
    ]

    // Handle cancelled orders
    if (orderStatus === "cancelled") {
      return baseSteps.map((step, index) => {
        if (index === 0) return step // Keep order placed
        return {
          ...step,
          status: "pending" as const,
          date: undefined
        }
      })
    }

    return baseSteps
  }

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/orders/${params.orderId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Please log in to view your order')
          }
          if (response.status === 404) {
            throw new Error('Order not found')
          }
          if (response.status === 403) {
            throw new Error('You are not authorized to view this order')
          }
          throw new Error('Failed to fetch order details')
        }

        const data = await response.json()
        setOrder(data.order)
        setTrackingSteps(generateTrackingSteps(data.order.status, data.order.created_at, data.order.updated_at))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
        setError(errorMessage)
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [params.orderId])

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'processing':
        return 'bg-purple-100 text-purple-800'
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'refunded':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold mb-4">Loading Order Details</h2>
            <p className="text-gray-600">Please wait while we fetch your order information...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">
              {error?.includes('not found') ? 'Order Not Found' : 'Error Loading Order'}
            </h2>
            <p className="text-gray-600 mb-6">
              {error || 'The order you\'re looking for doesn\'t exist or has been removed.'}
            </p>
            <div className="space-y-2">
              <Button asChild>
                <Link href="/orders">View All Orders</Link>
              </Button>
              {error?.includes('log in') && (
                <Button variant="outline" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              )}
            </div>
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
              <p className="text-gray-600">Order #{order.order_number}</p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <Badge className={`flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                <Clock className="h-3 w-3" />
                <span className="capitalize">{order.status.replace('_', ' ')}</span>
              </Badge>
              <Badge className={`flex items-center space-x-1 ${getPaymentStatusColor(order.payment_status)}`}>
                <span className="capitalize">{order.payment_status}</span>
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
                  {order.order_items.map((item, index) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-15 h-15 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.file_name}</h4>
                        <p className="text-gray-600">Quantity: {item.quantity}</p>
                        {(item.material || item.color || item.print_quality) && (
                          <p className="text-sm text-gray-500">
                            {[item.material, item.color, item.print_quality].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="font-semibold">₹{(item.total_price || item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Notes */}
            {(order.notes || order.business_notes) && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mt-8">
                <CardHeader>
                  <CardTitle>Order Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.notes && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-500 mb-1">Customer Notes</h4>
                      <p className="text-gray-700">{order.notes}</p>
                    </div>
                  )}
                  {order.business_notes && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-500 mb-1">Business Notes</h4>
                      <p className="text-gray-700">{order.business_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
                  <span>Subtotal</span>
                  <span>₹{parseFloat(order.financial_summary.subtotal).toFixed(2)}</span>
                </div>
                {parseFloat(order.financial_summary.discount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{parseFloat(order.financial_summary.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>₹{parseFloat(order.financial_summary.tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>₹{parseFloat(order.financial_summary.shipping).toFixed(2)}</span>
                </div>
                <hr />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{parseFloat(order.financial_summary.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Date</span>
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                {order.estimated_delivery_date && (
                  <div className="flex justify-between">
                    <span>Expected Delivery</span>
                    <span>{new Date(order.estimated_delivery_date).toLocaleDateString()}</span>
                  </div>
                )}
                {order.tracking_number && (
                  <div className="flex justify-between">
                    <span>Tracking Number</span>
                    <span className="font-mono text-sm">{order.tracking_number}</span>
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
                <div className="text-gray-700">
                  <p className="font-medium">{order.shipping_address.name}</p>
                  <p>{order.shipping_address.phone}</p>
                  <p>{order.shipping_address.address_line_1}</p>
                  {order.shipping_address.address_line_2 && (
                    <p>{order.shipping_address.address_line_2}</p>
                  )}
                  <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
                  <p>{order.shipping_address.postal_code}</p>
                </div>
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
