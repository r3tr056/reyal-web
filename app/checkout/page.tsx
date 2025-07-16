"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, Truck, Shield, ArrowLeft, Lock, CheckCircle, Package, MapPin } from "lucide-react"
import { PageTransition } from "@/components/page-transition"
import { motion } from "framer-motion"

export default function CheckoutPage() {
  const [user, setUser] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [newOrderId, setNewOrderId] = useState("")

  const [shippingData, setShippingData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    saveAddress: false,
  })

  const [paymentData, setPaymentData] = useState({
    method: "card",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardName: "",
    upiId: "",
  })

  // Mock cart items
  const cartItems = [
    {
      id: 1,
      name: "Modern Phone Stand",
      price: 299,
      quantity: 2,
      image: "/placeholder.svg?height=100&width=100",
    },
    {
      id: 2,
      name: "Desk Organizer Pro",
      price: 599,
      quantity: 1,
      image: "/placeholder.svg?height=100&width=100",
    },
  ]

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = 99
  const tax = Math.round(subtotal * 0.18)
  const total = subtotal + shipping + tax

  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setShippingData((prev) => ({
        ...prev,
        firstName: userData.name?.split(" ")[0] || "",
        lastName: userData.name?.split(" ")[1] || "",
        email: userData.email || "",
        phone: userData.phone || "",
      }))
    }
  }, [])

  const handlePlaceOrder = async () => {
    setIsProcessing(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Generate order ID
    const orderId = `ORD-${Date.now()}`
    setNewOrderId(orderId)

    // Create order object
    const newOrder = {
      id: orderId,
      date: new Date().toISOString().split("T")[0],
      status: "processing",
      total: total,
      items: cartItems,
      shippingAddress: `${shippingData.address}, ${shippingData.city}, ${shippingData.state} ${shippingData.pincode}`,
      trackingNumber: null,
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      actualDelivery: null,
    }

    // Save order to localStorage (in real app, this would be API call)
    const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]")
    existingOrders.unshift(newOrder)
    localStorage.setItem("orders", JSON.stringify(existingOrders))

    setIsProcessing(false)
    setOrderPlaced(true)
  }

  if (orderPlaced) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <Button variant="ghost" size="sm" className="mb-4 text-gray-300 hover:text-white" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/30">
              <CheckCircle className="h-12 w-12 text-green-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Order Placed Successfully!</h1>
            <p className="text-xl text-gray-400 mb-8">
              Thank you for your order. We'll start printing your items right away.
            </p>

            <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl mb-8">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-6 text-left">
                  <div>
                    <h3 className="font-semibold mb-2 text-white">Order Details</h3>
                    <p className="text-gray-400">Order ID: {newOrderId}</p>
                    <p className="text-gray-400">Total: ₹{total}</p>
                    <p className="text-gray-400">Status: Processing</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-white">Delivery Info</h3>
                    <p className="text-gray-400">Estimated: 5-7 business days</p>
                    <p className="text-gray-400">Tracking will be available soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
              >
                <Link href="/orders">Track Your Order</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-gray-600 text-gray-300 hover:bg-gray-700/50">
                <Link href="/marketplace">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center space-x-4 mb-8 max-w-6xl mx-auto"
        >
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" asChild>
            <Link href="/cart">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cart
            </Link>
          </Button>
          <div className="flex items-center space-x-2 ml-auto">
            <Lock className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-400 font-medium">Secure Checkout</span>
          </div>
        </motion.div>

        {/* Progress Steps */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto mb-8"
        >
          <div className="flex items-center justify-center space-x-8">
            {[
              { step: 1, title: "Shipping", icon: Truck },
              { step: 2, title: "Payment", icon: CreditCard },
              { step: 3, title: "Review", icon: CheckCircle },
            ].map(({ step, title, icon: Icon }) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep >= step
                      ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`ml-2 font-medium ${currentStep >= step ? "text-emerald-400" : "text-gray-500"}`}>
                  {title}
                </span>
                {step < 3 && <div className="w-16 h-0.5 bg-gray-700 ml-4" />}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Main Content */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            {currentStep === 1 && (
              <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                    Shipping Information
                  </CardTitle>
                  <CardDescription className="text-gray-400">Enter your delivery details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
                      <Input
                        id="firstName"
                        value={shippingData.firstName}
                        onChange={(e) => setShippingData((prev) => ({ ...prev, firstName: e.target.value }))}
                        required
                        className="bg-gray-700/50 border-gray-600 text-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-300">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={shippingData.lastName}
                        onChange={(e) => setShippingData((prev) => ({ ...prev, lastName: e.target.value }))}
                        required
                        className="bg-gray-700/50 border-gray-600 text-gray-300"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={shippingData.email}
                        onChange={(e) => setShippingData((prev) => ({ ...prev, email: e.target.value }))}
                        required
                        className="bg-gray-700/50 border-gray-600 text-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-300">Phone *</Label>
                      <Input
                        id="phone"
                        value={shippingData.phone}
                        onChange={(e) => setShippingData((prev) => ({ ...prev, phone: e.target.value }))}
                        required
                        className="bg-gray-700/50 border-gray-600 text-gray-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-gray-300">Address *</Label>
                    <Input
                      id="address"
                      value={shippingData.address}
                      onChange={(e) => setShippingData((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Street address, apartment, suite, etc."
                      required
                      className="bg-gray-700/50 border-gray-600 text-gray-300"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-gray-300">City *</Label>
                      <Input
                        id="city"
                        value={shippingData.city}
                        onChange={(e) => setShippingData((prev) => ({ ...prev, city: e.target.value }))}
                        required
                        className="bg-gray-700/50 border-gray-600 text-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-gray-300">State *</Label>
                      <Select
                        value={shippingData.state}
                        onValueChange={(value) => setShippingData((prev) => ({ ...prev, state: value }))}
                      >
                        <SelectTrigger className="bg-gray-700/50 border-gray-600 text-gray-300">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="maharashtra">Maharashtra</SelectItem>
                          <SelectItem value="delhi">Delhi</SelectItem>
                          <SelectItem value="karnataka">Karnataka</SelectItem>
                          <SelectItem value="gujarat">Gujarat</SelectItem>
                          <SelectItem value="rajasthan">Rajasthan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode" className="text-gray-300">PIN Code *</Label>
                      <Input
                        id="pincode"
                        value={shippingData.pincode}
                        onChange={(e) => setShippingData((prev) => ({ ...prev, pincode: e.target.value }))}
                        required
                        className="bg-gray-700/50 border-gray-600 text-gray-300"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="saveAddress"
                      checked={shippingData.saveAddress}
                      onCheckedChange={(checked) =>
                        setShippingData((prev) => ({ ...prev, saveAddress: checked as boolean }))
                      }
                    />
                    <Label htmlFor="saveAddress" className="text-gray-300">Save this address for future orders</Label>
                  </div>

                  <Button
                    onClick={() => setCurrentStep(2)}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                  >
                    Continue to Payment
                  </Button>
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                    Payment Method
                  </CardTitle>
                  <CardDescription className="text-gray-400">Choose your preferred payment option</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={paymentData.method}
                    onValueChange={(value) => setPaymentData((prev) => ({ ...prev, method: value }))}
                  >
                    <TabsList className="grid w-full grid-cols-3 bg-gray-700/50">
                      <TabsTrigger value="card" className="data-[state=active]:bg-emerald-600">Credit/Debit Card</TabsTrigger>
                      <TabsTrigger value="upi" className="data-[state=active]:bg-emerald-600">UPI</TabsTrigger>
                      <TabsTrigger value="netbanking" className="data-[state=active]:bg-emerald-600">Net Banking</TabsTrigger>
                    </TabsList>

                    <TabsContent value="card" className="space-y-6 mt-6">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber" className="text-gray-300">Card Number *</Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={paymentData.cardNumber}
                          onChange={(e) => setPaymentData((prev) => ({ ...prev, cardNumber: e.target.value }))}
                          className="bg-gray-700/50 border-gray-600 text-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardName" className="text-gray-300">Cardholder Name *</Label>
                        <Input
                          id="cardName"
                          placeholder="Name on card"
                          value={paymentData.cardName}
                          onChange={(e) => setPaymentData((prev) => ({ ...prev, cardName: e.target.value }))}
                          className="bg-gray-700/50 border-gray-600 text-gray-300"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiryDate" className="text-gray-300">Expiry Date *</Label>
                          <Input
                            id="expiryDate"
                            placeholder="MM/YY"
                            value={paymentData.expiryDate}
                            onChange={(e) => setPaymentData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                            className="bg-gray-700/50 border-gray-600 text-gray-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv" className="text-gray-300">CVV *</Label>
                          <Input
                            id="cvv"
                            placeholder="123"
                            value={paymentData.cvv}
                            onChange={(e) => setPaymentData((prev) => ({ ...prev, cvv: e.target.value }))}
                            className="bg-gray-700/50 border-gray-600 text-gray-300"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="upi" className="space-y-6 mt-6">
                      <div className="space-y-2">
                        <Label htmlFor="upiId" className="text-gray-300">UPI ID *</Label>
                        <Input
                          id="upiId"
                          placeholder="yourname@upi"
                          value={paymentData.upiId}
                          onChange={(e) => setPaymentData((prev) => ({ ...prev, upiId: e.target.value }))}
                          className="bg-gray-700/50 border-gray-600 text-gray-300"
                        />
                      </div>
                      <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                        <p className="text-sm text-blue-400">
                          You will be redirected to your UPI app to complete the payment.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="netbanking" className="space-y-6 mt-6">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Select Your Bank</Label>
                        <Select>
                          <SelectTrigger className="bg-gray-700/50 border-gray-600 text-gray-300">
                            <SelectValue placeholder="Choose your bank" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="sbi">State Bank of India</SelectItem>
                            <SelectItem value="hdfc">HDFC Bank</SelectItem>
                            <SelectItem value="icici">ICICI Bank</SelectItem>
                            <SelectItem value="axis">Axis Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex space-x-4 mt-8">
                    <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/50">
                      Back to Shipping
                    </Button>
                    <Button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                    >
                      Review Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 3 && (
              <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                    Review Your Order
                  </CardTitle>
                  <CardDescription className="text-gray-400">Please review your order details before placing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Shipping Address */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center text-white">
                      <MapPin className="h-4 w-4 mr-2" />
                      Shipping Address
                    </h3>
                    <div className="p-4 bg-gray-700/30 rounded-lg">
                      <p className="text-gray-300">
                        {shippingData.firstName} {shippingData.lastName}
                      </p>
                      <p className="text-gray-300">{shippingData.address}</p>
                      <p className="text-gray-300">
                        {shippingData.city}, {shippingData.state} {shippingData.pincode}
                      </p>
                      <p className="text-gray-300">{shippingData.phone}</p>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center text-white">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Payment Method
                    </h3>
                    <div className="p-4 bg-gray-700/30 rounded-lg">
                      {paymentData.method === "card" && (
                        <p className="text-gray-300">Credit/Debit Card ending in {paymentData.cardNumber.slice(-4)}</p>
                      )}
                      {paymentData.method === "upi" && <p className="text-gray-300">UPI: {paymentData.upiId}</p>}
                      {paymentData.method === "netbanking" && <p className="text-gray-300">Net Banking</p>}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center text-white">
                      <Package className="h-4 w-4 mr-2" />
                      Order Items
                    </h3>
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-700/30 rounded-lg">
                          <Image
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            width={60}
                            height={60}
                            className="rounded-lg"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{item.name}</h4>
                            <p className="text-gray-400">Quantity: {item.quantity}</p>
                          </div>
                          <span className="font-semibold text-emerald-400">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/50">
                      Back to Payment
                    </Button>
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={isProcessing}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                    >
                      {isProcessing ? "Processing..." : `Place Order - ₹${total}`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Order Summary Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-1"
          >
            <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl sticky top-24">
              <CardHeader>
                <CardTitle className="text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      width={50}
                      height={50}
                      className="rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-white">{item.name}</h4>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-semibold text-emerald-400">₹{item.price * item.quantity}</span>
                  </div>
                ))}

                <Separator className="bg-gray-700" />

                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Shipping</span>
                    <span>₹{shipping}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Tax (18%)</span>
                    <span>₹{tax}</span>
                  </div>
                  <Separator className="bg-gray-700" />
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-emerald-400">₹{total}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Shield className="h-4 w-4" />
                  <span>Secure 256-bit SSL encryption</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}
