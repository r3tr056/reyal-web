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
      <div className="min-h-screen bg-gray-950 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        {/* Order Success */}
        <div className="container mx-auto px-4 py-16 pt-24 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-4 text-gray-400 hover:text-white hover:bg-gray-800/50" 
              asChild
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <div className="w-24 h-24 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle className="h-12 w-12 text-emerald-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Order Placed Successfully!</h1>
            <p className="text-xl text-gray-400 mb-8">
              Thank you for your order. We'll start printing your items right away.
            </p>

            <Card className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 shadow-2xl mb-8">
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
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Link href="/orders">Track Your Order</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/marketplace">Continue Shopping</Link>
              </Button>
            </div>
          </div>
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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-gradient-conic from-emerald-500/5 via-transparent to-green-500/5 rounded-full blur-3xl animate-spin" style={{ animationDuration: '30s' }}></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%2310b981' fillOpacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container mx-auto px-4 py-8 pt-24 relative z-10">
        <div className="flex items-center space-x-4 mb-8 max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white hover:bg-gray-800/50"
            asChild
          >
            <Link href="/cart">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cart
            </Link>
          </Button>
          <div className="flex items-center space-x-2 ml-auto">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Secure Checkout</span>
          </div>
        </div>
        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-8">
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
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {currentStep === 1 && (
              <Card className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                    Shipping Information
                  </CardTitle>
                  <CardDescription className="text-gray-400">Enter your delivery details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
                      <Input className="bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500"
                        id="firstName"
                        value={shippingData.firstName}
                        onChange={(e) => setShippingData((prev) => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-300">Last Name *</Label>
                      <Input className="bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500"
                        id="lastName"
                        value={shippingData.lastName}
                        onChange={(e) => setShippingData((prev) => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email *</Label>
                      <Input className="bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500"
                        id="email"
                        type="email"
                        value={shippingData.email}
                        onChange={(e) => setShippingData((prev) => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-300">Phone *</Label>
                      <Input className="bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500"
                        id="phone"
                        value={shippingData.phone}
                        onChange={(e) => setShippingData((prev) => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-gray-300">Address *</Label>
                    <Input className="bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500"
                      id="address"
                      value={shippingData.address}
                      onChange={(e) => setShippingData((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Street address, apartment, suite, etc."
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-gray-300">City *</Label>
                      <Input className="bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500"
                        id="city"
                        value={shippingData.city}
                        onChange={(e) => setShippingData((prev) => ({ ...prev, city: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-gray-300">State *</Label>
                      <Select
                        value={shippingData.state}
                        onValueChange={(value) => setShippingData((prev) => ({ ...prev, state: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
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
                      <Input className="bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500"
                        id="pincode"
                        value={shippingData.pincode}
                        onChange={(e) => setShippingData((prev) => ({ ...prev, pincode: e.target.value }))}
                        required
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
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Continue to Payment
                  </Button>
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Payment Method
                  </CardTitle>
                  <CardDescription>Choose your preferred payment option</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={paymentData.method}
                    onValueChange={(value) => setPaymentData((prev) => ({ ...prev, method: value }))}
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="card">Credit/Debit Card</TabsTrigger>
                      <TabsTrigger value="upi">UPI</TabsTrigger>
                      <TabsTrigger value="netbanking">Net Banking</TabsTrigger>
                    </TabsList>

                    <TabsContent value="card" className="space-y-6 mt-6">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber" className="text-gray-300">Card Number *</Label>
                        <Input className="bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500"
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={paymentData.cardNumber}
                          onChange={(e) => setPaymentData((prev) => ({ ...prev, cardNumber: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardName" className="text-gray-300">Cardholder Name *</Label>
                        <Input className="bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500"
                          id="cardName"
                          placeholder="Name on card"
                          value={paymentData.cardName}
                          onChange={(e) => setPaymentData((prev) => ({ ...prev, cardName: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiryDate" className="text-gray-300">Expiry Date *</Label>
                          <Input className="bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500"
                            id="expiryDate"
                            placeholder="MM/YY"
                            value={paymentData.expiryDate}
                            onChange={(e) => setPaymentData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv" className="text-gray-300">CVV *</Label>
                          <Input className="bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500"
                            id="cvv"
                            placeholder="123"
                            value={paymentData.cvv}
                            onChange={(e) => setPaymentData((prev) => ({ ...prev, cvv: e.target.value }))}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="upi" className="space-y-6 mt-6">
                      <div className="space-y-2">
                        <Label htmlFor="upiId" className="text-gray-300">UPI ID *</Label>
                        <Input className="bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500"
                          id="upiId"
                          placeholder="yourname@upi"
                          value={paymentData.upiId}
                          onChange={(e) => setPaymentData((prev) => ({ ...prev, upiId: e.target.value }))}
                        />
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          You will be redirected to your UPI app to complete the payment.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="netbanking" className="space-y-6 mt-6">
                      <div className="space-y-2">
                        <Label>Select Your Bank</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose your bank" />
                          </SelectTrigger>
                          <SelectContent>
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
                    <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                      Back to Shipping
                    </Button>
                    <Button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      Review Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 3 && (
              <Card className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Review Your Order
                  </CardTitle>
                  <CardDescription>Please review your order details before placing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Shipping Address */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Shipping Address
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p>
                        {shippingData.firstName} {shippingData.lastName}
                      </p>
                      <p>{shippingData.address}</p>
                      <p>
                        {shippingData.city}, {shippingData.state} {shippingData.pincode}
                      </p>
                      <p>{shippingData.phone}</p>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Payment Method
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      {paymentData.method === "card" && (
                        <p>Credit/Debit Card ending in {paymentData.cardNumber.slice(-4)}</p>
                      )}
                      {paymentData.method === "upi" && <p>UPI: {paymentData.upiId}</p>}
                      {paymentData.method === "netbanking" && <p>Net Banking</p>}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Order Items
                    </h3>
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                          <Image
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            width={60}
                            height={60}
                            className="rounded-lg"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-gray-600">Quantity: {item.quantity}</p>
                          </div>
                          <span className="font-semibold">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                      Back to Payment
                    </Button>
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={isProcessing}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {isProcessing ? "Processing..." : `Place Order - ₹${total}`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 shadow-2xl sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
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
                      <h4 className="font-medium text-sm">{item.name}</h4>
                      <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-semibold">₹{item.price * item.quantity}</span>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>₹{shipping}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (18%)</span>
                    <span>₹{tax}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-purple-600">₹{total}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Shield className="h-4 w-4" />
                  <span>Secure 256-bit SSL encryption</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
