"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Truck,
  Shield,
  RotateCcw,
  Layers,
  CheckCircle,
  Clock,
  Package,
  Zap,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { PageTransition } from "@/components/page-transition"

// Mock product data
const product = {
  id: 1,
  name: "Precision Phone Stand",
  price: 299,
  originalPrice: 399,
  images: [
    "/placeholder.svg?height=400&width=400",
    "/placeholder.svg?height=400&width=400",
    "/placeholder.svg?height=400&width=400",
    "/placeholder.svg?height=400&width=400",
  ],
  rating: 4.8,
  reviews: 124,
  category: "Professional Accessories",
  tags: ["Professional", "New", "Bestseller"],
  description:
    "A precision-engineered phone stand designed for optimal viewing angles and professional use. Manufactured using advanced 3D printing technology with industrial-grade materials for superior durability and finish quality.",
  features: [
    "Compatible with devices 4-7 inches",
    "Adjustable viewing angle (15-75°)",
    "Anti-slip silicone base",
    "Lightweight yet durable construction",
    "Available in multiple materials and colors",
    "Professional-grade surface finish",
  ],
  specifications: {
    Material: "PLA+ (Standard)",
    Dimensions: "120mm x 80mm x 100mm",
    Weight: "85 grams",
    "Print Time": "3.5 hours",
    "Layer Height": "0.15mm (High Resolution)",
    Tolerance: "±0.1mm",
    "Surface Finish": "Smooth, post-processed",
  },
  printDetails: {
    infill: "20%",
    supports: "Minimal",
    postProcessing: "Sanding & finishing",
    qualityCheck: "Dimensional inspection",
  },
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedMaterial, setSelectedMaterial] = useState("pla")
  const [selectedColor, setSelectedColor] = useState("black")
  const [customization, setCustomization] = useState("")

  const materials = [
    { value: "pla", label: "PLA+", price: 0, description: "Standard engineering plastic, excellent surface finish" },
    { value: "abs", label: "ABS", price: 50, description: "High-strength, heat resistant, automotive grade" },
    { value: "petg", label: "PETG", price: 80, description: "Chemical resistant, food safe, crystal clear" },
    { value: "tpu", label: "TPU", price: 120, description: "Flexible rubber-like material, shock absorbing" },
  ]

  const colors = [
    { value: "black", label: "Matte Black", price: 0 },
    { value: "white", label: "Pure White", price: 0 },
    { value: "gray", label: "Industrial Gray", price: 0 },
    { value: "blue", label: "Professional Blue", price: 0 },
    { value: "custom", label: "Custom Color", price: 50 },
  ]

  const calculatePrice = () => {
    const materialPrice = materials.find((m) => m.value === selectedMaterial)?.price || 0
    const colorPrice = colors.find((c) => c.value === selectedColor)?.price || 0
    const customizationPrice = customization.trim() ? 100 : 0
    return (product.price + materialPrice + colorPrice + customizationPrice) * quantity
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white mb-4" asChild>
            <Link href="/marketplace">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Catalog
            </Link>
          </Button>
        </motion.div>
        <div className="grid lg:grid-cols-2 gap-12 mb-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src={product.images[selectedImage] || "/placeholder.svg"}
                alt={product.name}
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square bg-gray-800/50 backdrop-blur-xl rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                    selectedImage === index
                      ? "border-emerald-500 shadow-lg shadow-emerald-500/25"
                      : "border-gray-700/50 hover:border-emerald-500/50"
                  }`}
                >
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`${product.name} ${index + 1}`}
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {product.tags.map((tag, index) => (
                  <Badge key={index} className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {tag}
                  </Badge>
                ))}
              </div>
              <h1 className="text-4xl font-bold mb-4 text-white">{product.name}</h1>
              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="ml-2 font-medium text-white">{product.rating}</span>
                  <span className="ml-2 text-gray-400">({product.reviews} reviews)</span>
                </div>
                <Badge variant="outline" className="border-gray-600 text-gray-400">
                  {product.category}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl font-bold text-emerald-400">₹{calculatePrice()}</span>
                {product.originalPrice && (
                  <span className="text-xl text-gray-500 line-through">₹{product.originalPrice}</span>
                )}
              </div>
            </div>

            {/* Manufacturing Specifications */}
            <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Settings className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Manufacturing Configuration</CardTitle>
                    <CardDescription className="text-gray-400">
                      Customize your production specifications
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium mb-3 block text-gray-300">Material Selection</Label>
                  <RadioGroup value={selectedMaterial} onValueChange={setSelectedMaterial}>
                    {materials.map((material) => (
                      <div
                        key={material.value}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-gray-700/50 hover:border-emerald-500/50 transition-colors"
                      >
                        <RadioGroupItem value={material.value} id={material.value} />
                        <Label htmlFor={material.value} className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium text-white">{material.label}</span>
                              <p className="text-sm text-gray-400">{material.description}</p>
                            </div>
                            {material.price > 0 && (
                              <span className="text-sm font-medium text-emerald-400">+₹{material.price}</span>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-base font-medium mb-3 block text-gray-300">Color & Finish</Label>
                  <Select value={selectedColor} onValueChange={setSelectedColor}>
                    <SelectTrigger className="bg-gray-700/50 border-gray-600 text-gray-300 hover:border-emerald-500/50 focus:border-emerald-500 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {colors.map((color) => (
                        <SelectItem
                          key={color.value}
                          value={color.value}
                          className="text-gray-300 hover:bg-gray-700 focus:bg-gray-700"
                        >
                          <div className="flex justify-between items-center w-full">
                            <span>{color.label}</span>
                            {color.price > 0 && <span className="ml-2 text-emerald-400">+₹{color.price}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity" className="text-base font-medium text-gray-300">
                    Production Quantity
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="1000"
                    value={quantity}
                    onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                    className="w-32 mt-2 bg-gray-700/50 border-gray-600 text-gray-300 hover:border-emerald-500/50 focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <Label htmlFor="customization" className="text-base font-medium text-gray-300">
                    Custom Modifications (Optional) +₹100
                  </Label>
                  <Textarea
                    id="customization"
                    placeholder="Describe any custom modifications: text engraving, dimensional changes, special requirements..."
                    value={customization}
                    onChange={(e) => setCustomization(e.target.value)}
                    className="mt-2 bg-gray-700/50 border-gray-600 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 transition-colors"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                size="lg"
                className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-xl text-white font-semibold"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart - ₹{calculatePrice()}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-emerald-500/50 bg-transparent"
              >
                <Heart className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-emerald-500/50 bg-transparent"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Manufacturing Info */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-700">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-medium text-white">Fast Production</p>
                <p className="text-xs text-gray-400">24-48 hour turnaround</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-medium text-white">Quality Guarantee</p>
                <p className="text-xs text-gray-400">100% satisfaction</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <RotateCcw className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-medium text-white">Easy Returns</p>
                <p className="text-xs text-gray-400">7-day return policy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border border-gray-700/50">
            <TabsTrigger
              value="description"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              Description
            </TabsTrigger>
            <TabsTrigger
              value="specifications"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              Specifications
            </TabsTrigger>
            <TabsTrigger
              value="manufacturing"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              Manufacturing
            </TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              Reviews ({product.reviews})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-xl">
              <CardContent className="pt-6">
                <p className="text-gray-300 mb-6 text-lg leading-relaxed">{product.description}</p>
                <h4 className="font-semibold mb-4 text-white text-lg">Key Features:</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {product.features.map((feature, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-700/30 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-xl">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4 text-white text-lg">Technical Specifications</h4>
                    <div className="space-y-3">
                      {Object.entries(product.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-3 border-b border-gray-700/50">
                          <span className="font-medium text-gray-300">{key}:</span>
                          <span className="text-emerald-400 font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-4 text-white text-lg">Print Details</h4>
                    <div className="space-y-3">
                      {Object.entries(product.printDetails).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-3 border-b border-gray-700/50">
                          <span className="font-medium text-gray-300">
                            {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:
                          </span>
                          <span className="text-emerald-400 font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manufacturing" className="mt-6">
            <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-xl">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-white mb-2">Production Time</h4>
                    <p className="text-gray-400">3.5 hours print time</p>
                    <p className="text-gray-400">24-48 hour delivery</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Zap className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-white mb-2">Quality Control</h4>
                    <p className="text-gray-400">Dimensional inspection</p>
                    <p className="text-gray-400">Surface finish check</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-white mb-2">Packaging</h4>
                    <p className="text-gray-400">Protective packaging</p>
                    <p className="text-gray-400">Eco-friendly materials</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-xl">
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {[1, 2, 3].map((review) => (
                    <div key={review} className="border-b border-gray-700/50 pb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <span className="ml-3 font-medium text-white">Rajesh Kumar</span>
                        </div>
                        <span className="text-sm text-gray-500">2 days ago</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed">
                        Exceptional quality manufacturing! The phone stand is precisely engineered and the surface
                        finish is professional grade. Fast delivery and excellent packaging. Highly recommend for anyone
                        needing reliable 3D printing services.
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  )
}
