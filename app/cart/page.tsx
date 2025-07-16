"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ShoppingCart,
  User,
  Plus,
  Minus,
  Trash2,
  Tag,
  Truck,
  Shield,
  Layers,
  CheckCircle,
  Clock,
  Package,
  Star,
  Heart,
  Sparkles,
  ArrowRight,
  Gift,
  Zap,
} from "lucide-react"

export default function CartPage() {
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "Precision Phone Stand Pro",
      price: 299,
      originalPrice: 399,
      quantity: 2,
      image: "/placeholder.svg?height=150&width=150&query=precision phone stand 3d print",
      material: "PLA+",
      color: "Matte Black",
      quality: "Ultra High Resolution",
      printTime: "3.5h",
      rating: 4.8,
      reviews: 124,
      designer: "TechDesigns",
      isFeatured: true,
      isNew: false,
    },
    {
      id: 2,
      name: "Modular Desk Organizer System",
      price: 599,
      originalPrice: 699,
      quantity: 1,
      image: "/placeholder.svg?height=150&width=150&query=modular desk organizer 3d print",
      material: "PETG",
      color: "Natural White",
      quality: "Professional Grade",
      printTime: "6.2h",
      rating: 4.9,
      reviews: 89,
      designer: "WorkSpace",
      isFeatured: false,
      isNew: true,
    },
  ])

  const [promoCode, setPromoCode] = useState("")
  const [appliedPromo, setAppliedPromo] = useState("")
  const [promoDiscount, setPromoDiscount] = useState(0)

  const updateQuantity = useCallback((id: number, newQuantity: number) => {
    setCartItems(prev => {
      if (newQuantity === 0) {
        return prev.filter((item) => item.id !== id)
      }
      return prev.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item))
    })
  }, [])

  const removeItem = useCallback((id: number) => {
    setCartItems(prev => prev.filter((item) => item.id !== id))
  }, [])

  const applyPromoCode = () => {
    const validCodes = {
      REYAL10: 10,
      FIRST20: 20,
      SAVE15: 15,
    }

    if (validCodes[promoCode as keyof typeof validCodes]) {
      setAppliedPromo(promoCode)
      setPromoDiscount(validCodes[promoCode as keyof typeof validCodes])
      setPromoCode("")
    }
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const savings = cartItems.reduce((sum, item) => sum + (item.originalPrice - item.price) * item.quantity, 0)
  const promoDiscountAmount = (subtotal * promoDiscount) / 100
  const shipping = subtotal > 1000 ? 0 : 99
  const tax = Math.round((subtotal - promoDiscountAmount) * 0.18)
  const total = subtotal - promoDiscountAmount + shipping + tax

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-emerald-500/5 via-transparent to-green-500/5 rounded-full blur-3xl animate-spin" style={{ animationDuration: '30s' }}></div>
        </div>

        {/* Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%2310b981' fillOpacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />



        {/* Empty Cart */}
        <section className="py-20 relative z-10">
          <div className="container mx-auto px-6 text-center">
            <div className="max-w-lg mx-auto">
              <div className="relative mb-8">
                <div className="w-40 h-40 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                  <ShoppingCart className="h-20 w-20 text-emerald-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 bg-emerald-500/10 rounded-3xl blur-2xl opacity-50"></div>
              </div>
              
              <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
                Your Cart is 
                <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent"> Empty</span>
              </h1>
              
              <p className="text-gray-400 mb-10 text-xl leading-relaxed">
                Ready to start manufacturing? Browse our professional catalog or upload your custom designs for precision 3D printing.
              </p>
              
              <div className="space-y-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold px-8 py-4 text-lg shadow-xl hover:shadow-emerald-500/25 transition-all duration-300 group"
                  asChild
                >
                  <Link href="/marketplace">
                    <Sparkles className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                    Browse Catalog
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:border-emerald-500/50 bg-gray-800/30 backdrop-blur-sm px-8 py-4 text-lg transition-all duration-300 group"
                  asChild
                >
                  <Link href="/?upload=true">
                    <Package className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    Upload Design
                  </Link>
                </Button>
              </div>
              
              <div className="mt-12 flex items-center justify-center space-x-8 text-gray-500">
                {[
                  { icon: Shield, text: "Secure & Safe" },
                  { icon: Zap, text: "Fast Production" },
                  { icon: Star, text: "Quality Assured" }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <feature.icon className="h-4 w-4" />
                    <span className="text-sm">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
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



      {/* Cart Content */}
      <section className="py-12 relative z-10">
        <div className="container mx-auto px-6">
          <div className="mb-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-5xl font-bold text-white mb-3 leading-tight">
                  Manufacturing 
                  <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent"> Cart</span>
                </h1>
                <p className="text-gray-400 text-xl">
                  {cartItems.length} {cartItems.length === 1 ? "design" : "designs"} ready for precision production
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Clock className="h-5 w-5" />
                  <span>Est. {cartItems.reduce((total, item) => total + parseFloat(item.printTime), 0).toFixed(1)}h total</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {cartItems.map((item) => (
                <Card
                  key={item.id}
                  className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 overflow-hidden group hover:border-emerald-500/30"
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="relative md:w-48 h-48 md:h-auto">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent" />
                        
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                          {item.isFeatured && (
                            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                              ⭐ FEATURED
                            </Badge>
                          )}
                          {item.isNew && (
                            <Badge className="bg-emerald-500 text-white text-xs">
                              NEW
                            </Badge>
                          )}
                          {item.originalPrice > item.price && (
                            <Badge className="bg-red-500/90 text-white text-xs">
                              SAVE ₹{item.originalPrice - item.price}
                            </Badge>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => removeItem(item.id)}
                          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30 backdrop-blur-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex-1 p-6">
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-bold text-xl text-white mb-2 group-hover:text-emerald-300 transition-colors">{item.name}</h3>
                            <p className="text-sm text-gray-400 mb-3">
                              by <span className="text-emerald-400 font-medium">{item.designer}</span>
                            </p>
                            
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium text-white">{item.rating}</span>
                                <span className="text-sm text-gray-500">({item.reviews})</span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-400 hover:text-red-400 transition-colors p-1"
                              >
                                <Heart className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Badge variant="outline" className="text-xs border-gray-600/50 text-gray-400 bg-gray-700/30 w-full justify-center">
                                <Package className="h-3 w-3 mr-1" />
                                {item.material}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-gray-600/50 text-gray-400 bg-gray-700/30 w-full justify-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {item.printTime}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <Badge variant="outline" className="text-xs border-gray-600/50 text-gray-400 bg-gray-700/30 w-full justify-center">
                                Color: {item.color}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-gray-600/50 text-gray-400 bg-gray-700/30 w-full justify-center">
                                {item.quality}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
                            <div className="flex items-center space-x-3">
                              <span className="text-3xl font-bold text-emerald-400">₹{item.price}</span>
                              {item.originalPrice > item.price && (
                                <span className="text-lg text-gray-500 line-through">₹{item.originalPrice}</span>
                              )}
                            </div>

                            <div className="flex items-center space-x-4">
                              <div className="flex items-center border border-gray-600/50 rounded-xl bg-gray-700/30 backdrop-blur-sm">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="h-10 w-10 p-0 text-gray-300 hover:text-white hover:bg-gray-600/50 rounded-l-xl"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="px-4 py-2 text-lg font-medium text-white min-w-[3rem] text-center">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="h-10 w-10 p-0 text-gray-300 hover:text-white hover:bg-gray-600/50 rounded-r-xl"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Promo Code */}
              <Card className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 shadow-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center">
                      <Tag className="h-5 w-5 text-emerald-400" />
                    </div>
                    <h3 className="font-bold text-xl text-white">Promotional Codes</h3>
                  </div>
                  
                  {appliedPromo ? (
                    <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl border border-emerald-500/30 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge className="bg-emerald-500 text-white shadow-lg">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Applied
                          </Badge>
                          <span className="font-bold text-white text-lg">{appliedPromo}</span>
                          <span className="text-emerald-400 font-medium">-{promoDiscount}% discount</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAppliedPromo("")
                            setPromoDiscount(0)
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex space-x-3">
                        <Input
                          placeholder="Enter promotional code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          className="flex-1 h-12 bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-300 text-lg rounded-xl"
                        />
                        <Button
                          onClick={applyPromoCode}
                          className="h-12 px-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25"
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          Apply
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-gray-500">Try these codes:</span>
                        {['REYAL10', 'FIRST20', 'SAVE15'].map((code) => (
                          <Button
                            key={code}
                            variant="outline"
                            size="sm"
                            onClick={() => setPromoCode(code)}
                            className="text-xs border-gray-600/50 text-gray-400 hover:bg-gray-700/50 hover:border-emerald-500/50 hover:text-emerald-400 transition-all duration-300"
                          >
                            {code}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-lg sticky top-24">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center">
                    <Package className="h-5 w-5 mr-2 text-emerald-400" />
                    Order Summary
                  </CardTitle>
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

                    {savings > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>You Save</span>
                        <span>-₹{savings}</span>
                      </div>
                    )}

                    {promoDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Promo Discount ({promoDiscount}%)</span>
                        <span>-₹{Math.round(promoDiscountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-300">
                      <span>Shipping</span>
                      <span className={shipping === 0 ? "text-emerald-400" : ""}>
                        {shipping === 0 ? "FREE" : `₹${shipping}`}
                      </span>
                    </div>

                    <div className="flex justify-between text-gray-300">
                      <span>GST (18%)</span>
                      <span>₹{tax}</span>
                    </div>

                    <Separator className="bg-gray-700" />

                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-white">Total</span>
                      <span className="text-emerald-400">₹{total}</span>
                    </div>
                  </div>

                  {subtotal < 1000 && (
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-center space-x-2 text-blue-400">
                        <Truck className="h-4 w-4" />
                        <span className="text-sm font-medium">Add ₹{1000 - subtotal} more for FREE shipping!</span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg text-white font-semibold"
                    asChild
                  >
                    <Link href="/checkout">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Proceed to Manufacturing
                    </Link>
                  </Button>

                  <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Shield className="h-4 w-4" />
                      <span>Secure Payment</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Fast Production</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
