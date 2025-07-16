"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ShoppingCart,
  Package,
  Search,
  Filter,
  Download,
  Eye,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Calendar,
  MapPin,
} from "lucide-react"
import { PageTransition } from "@/components/page-transition"
import { motion } from "framer-motion"

const mockOrders = [
  {
    id: "ORD-2024-001",
    date: "2024-01-15",
    status: "delivered",
    total: 1299,
    items: [
      { name: "Modern Phone Stand", quantity: 2, price: 299 },
      { name: "Desk Organizer Pro", quantity: 1, price: 599 },
    ],
    shippingAddress: "123 Tech Street, Mumbai, Maharashtra 400001",
    trackingNumber: "TRK123456789",
    estimatedDelivery: "2024-01-18",
    actualDelivery: "2024-01-17",
  },
  {
    id: "ORD-2024-002",
    date: "2024-01-20",
    status: "processing",
    total: 899,
    items: [{ name: "Miniature Dragon", quantity: 1, price: 899 }],
    shippingAddress: "123 Tech Street, Mumbai, Maharashtra 400001",
    trackingNumber: null,
    estimatedDelivery: "2024-01-25",
    actualDelivery: null,
  },
  {
    id: "ORD-2024-003",
    date: "2024-01-22",
    status: "shipped",
    total: 398,
    items: [{ name: "Custom Keychain", quantity: 2, price: 199 }],
    shippingAddress: "123 Tech Street, Mumbai, Maharashtra 400001",
    trackingNumber: "TRK987654321",
    estimatedDelivery: "2024-01-26",
    actualDelivery: null,
  },
  {
    id: "ORD-2024-004",
    date: "2024-01-25",
    status: "cancelled",
    total: 1199,
    items: [
      { name: "Gaming Headset Stand", quantity: 1, price: 799 },
      { name: "Plant Pot Designer", quantity: 1, price: 449 },
    ],
    shippingAddress: "123 Tech Street, Mumbai, Maharashtra 400001",
    trackingNumber: null,
    estimatedDelivery: null,
    actualDelivery: null,
  },
]

export default function OrdersPage() {
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState(mockOrders)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }

    // Load orders from localStorage
    const savedOrders = localStorage.getItem("orders")
    if (savedOrders) {
      setOrders(JSON.parse(savedOrders))
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "shipped":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "processing":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4" />
      case "shipped":
        return <Truck className="h-4 w-4" />
      case "processing":
        return <Clock className="h-4 w-4" />
      case "cancelled":
        return <XCircle className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (!user) {
    return (
      <div className="flex items-center justify-center py-32">
        <Card className="w-96 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">Please Sign In</h2>
            <p className="text-gray-400 mb-6">You need to be logged in to view your orders.</p>
            <Button asChild className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700">
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
            My Orders
          </h1>
          <p className="text-gray-400">Track and manage your 3D printing orders</p>
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders by ID or product name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700/50 border-gray-600 text-gray-300"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48 bg-gray-700/50 border-gray-600 text-gray-300">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Orders List */}
        <div className="space-y-6">
          {filteredOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                      <div>
                        <h3 className="text-lg font-bold text-white">{order.id}</h3>
                        <div className="flex items-center text-sm text-gray-400 mt-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(order.date).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(order.status)} flex items-center space-x-1 border`}>
                        {getStatusIcon(order.status)}
                        <span className="capitalize">{order.status}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl font-bold text-emerald-400">₹{order.total}</span>
                      <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)} className="border-gray-600 text-gray-300 hover:bg-gray-700/50">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2 text-white">Items ({order.items.length})</h4>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-300">
                              {item.name} × {item.quantity}
                            </span>
                            <span className="font-medium text-emerald-400">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-white">Delivery Info</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 mr-2 mt-0.5 text-gray-400" />
                          <span className="text-gray-300">{order.shippingAddress}</span>
                        </div>
                        {order.trackingNumber && (
                          <div className="flex items-center">
                            <Truck className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="text-gray-300">Tracking: {order.trackingNumber}</span>
                          </div>
                        )}
                        {order.estimatedDelivery && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="text-gray-300">
                              {order.status === "delivered" ? "Delivered" : "Expected"}:{" "}
                              {new Date(order.actualDelivery || order.estimatedDelivery).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700">
                    <div className="flex space-x-3">
                      {order.status === "delivered" && (
                        <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700/50">
                          <Download className="h-4 w-4 mr-2" />
                          Download Invoice
                        </Button>
                      )}
                      {order.trackingNumber && (
                        <Button variant="outline" size="sm" asChild className="border-gray-600 text-gray-300 hover:bg-gray-700/50">
                          <Link href={`/track/${order.id}`}>
                            <Truck className="h-4 w-4 mr-2" />
                            Track Package
                          </Link>
                        </Button>
                      )}
                    </div>
                    {order.status === "delivered" && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                      >
                        Reorder
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Orders Found</h3>
                <p className="text-gray-400 mb-6">
                  {searchTerm || statusFilter !== "all"
                    ? "No orders match your current filters."
                    : "You haven't placed any orders yet."}
                </p>
                <Button asChild className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700">
                  <Link href="/marketplace">Start Shopping</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
