"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Search, Star, ShoppingCart, Heart, User, Grid, List, SlidersHorizontal, Layers, TrendingUp, Clock, Download, Filter, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface MarketplaceProduct {
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  rating: number
  reviews: number
  category: string
  tags: string[]
  designer: string
  downloads: number
  material: string
  printTime: string
  isNew: boolean
  isFeatured: boolean
  complexity: number
  description?: string
  shortDescription?: string
  dimensions?: any
  previewImages?: string[]
  fileSize?: number
  supportsRequired?: boolean
  infillPercentage?: number
}

interface MarketplaceStats {
  totalProducts: number
  uniqueDesigners: number
  totalDownloads: number
  averageRating: number
}

interface MarketplaceFilters {
  categories: Array<{ id: string; name: string; slug: string; description?: string; icon?: string }>
  tags: string[]
  materials: Array<{ name: string; code: string }>
}

export default function MarketplacePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("popular")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [priceRange, setPriceRange] = useState([0, 2000])
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<MarketplaceStats>({
    totalProducts: 0,
    uniqueDesigners: 0,
    totalDownloads: 0,
    averageRating: 0
  })
  const [filters, setFilters] = useState<MarketplaceFilters>({
    categories: [],
    tags: [],
    materials: []
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const observer = useRef<IntersectionObserver | null>(null)

  // Fetch marketplace stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/marketplace/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

  // Fetch filter options
  const fetchFilters = useCallback(async () => {
    try {
      const response = await fetch('/api/marketplace/filters')
      if (response.ok) {
        const data = await response.json()
        setFilters(data)
      }
    } catch (error) {
      console.error('Error fetching filters:', error)
    }
  }, [])

  // Fetch products with filters
  const fetchProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy
      })

      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (searchTerm) params.append('search', searchTerm)
      if (priceRange[0] > 0) params.append('minPrice', priceRange[0].toString())
      if (priceRange[1] < 2000) params.append('maxPrice', priceRange[1].toString())
      selectedTags.forEach(tag => params.append('tags', tag))

      const response = await fetch(`/api/marketplace?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch products')
      }

      const data = await response.json()
      
      if (append) {
        setProducts(prev => [...prev, ...data.products])
      } else {
        setProducts(data.products)
      }
      
      setHasMore(data.pagination.hasMore)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching products:', error)
      setError('Failed to load products. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedCategory, searchTerm, priceRange, selectedTags, sortBy])

  // Initialize data
  useEffect(() => {
    fetchStats()
    fetchFilters()
  }, [fetchStats, fetchFilters])

  // Fetch products when filters change
  useEffect(() => {
    setCurrentPage(1)
    fetchProducts(1, false)
  }, [selectedCategory, searchTerm, priceRange, selectedTags, sortBy])

  // Infinite scroll setup
  const lastProductElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchProducts(currentPage + 1, true)
      }
    })
    if (node) observer.current.observe(node)
  }, [loadingMore, hasMore, currentPage, fetchProducts])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const toggleLike = (productId: string) => {
    setLikedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setSelectedCategory("all")
    setSelectedTags([])
    setPriceRange([0, 2000])
  }

  const categories = ["all", ...filters.categories.map(cat => cat.name)]
  const allTags = filters.tags

  // Filter products on client side for immediate feedback, 
  // but main filtering is done on server side
  const filteredProducts = products

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

      <div className="container mx-auto px-6 py-8 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-3 bg-gray-800/50 backdrop-blur-sm px-6 py-3 rounded-full border border-gray-700/30 mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-gray-300">
              Premium 3D Design Marketplace
            </span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight">
            Discover Amazing
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
              3D Designs
            </span>
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed max-w-3xl mx-auto">
            Browse thousands of professional 3D models optimized for precision printing. 
            From functional prototypes to artistic masterpieces.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { value: `${stats.totalProducts}+`, label: "3D Models", icon: Layers },
            { value: `${stats.uniqueDesigners}+`, label: "Active Designers", icon: User },
            { value: `${Math.floor(stats.totalDownloads / 1000)}K+`, label: "Downloads", icon: Download },
            { value: `${stats.averageRating.toFixed(1)}★`, label: "Avg Rating", icon: Star }
          ].map((stat, index) => (
            <div key={index} className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-4 text-center group hover:border-emerald-500/30 transition-all duration-300">
              <stat.icon className="h-6 w-6 mx-auto mb-2 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search and Filters */}

        {/* Search and Filters */}
        <div className="bg-gray-800/40 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-gray-700/30 mb-8">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 group-hover:text-emerald-400 transition-colors" />
              <Input
                placeholder="Search for 3D models, designers, or materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-300 text-lg"
              />
            </div>

            <div className="flex items-center space-x-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-52 h-14 bg-gray-700/30 border-gray-600/50 text-gray-300 hover:border-emerald-500/50 transition-all duration-300">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800/95 backdrop-blur-xl border-gray-700/50">
                  {categories.map((category) => (
                    <SelectItem
                      key={category}
                      value={category}
                      className="text-gray-300 hover:bg-gray-700/50 hover:text-white focus:bg-gray-700/50 focus:text-white transition-colors"
                    >
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-52 h-14 bg-gray-700/30 border-gray-600/50 text-gray-300 hover:border-emerald-500/50 transition-all duration-300">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800/95 backdrop-blur-xl border-gray-700/50">
                  <SelectItem value="popular" className="text-gray-300 hover:bg-gray-700/50 hover:text-white focus:bg-gray-700/50 focus:text-white transition-colors">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Most Popular
                    </div>
                  </SelectItem>
                  <SelectItem value="price-low" className="text-gray-300 hover:bg-gray-700/50 hover:text-white focus:bg-gray-700/50 focus:text-white transition-colors">
                    Price: Low to High
                  </SelectItem>
                  <SelectItem value="price-high" className="text-gray-300 hover:bg-gray-700/50 hover:text-white focus:bg-gray-700/50 focus:text-white transition-colors">
                    Price: High to Low
                  </SelectItem>
                  <SelectItem value="rating" className="text-gray-300 hover:bg-gray-700/50 hover:text-white focus:bg-gray-700/50 focus:text-white transition-colors">
                    Highest Rated
                  </SelectItem>
                  <SelectItem value="newest" className="text-gray-300 hover:bg-gray-700/50 hover:text-white focus:bg-gray-700/50 focus:text-white transition-colors">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Newest First
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowFilters(!showFilters)}
                className="h-14 px-6 border-gray-600/50 bg-gray-700/30 text-gray-300 hover:bg-gray-600/50 hover:border-emerald-500/50 transition-all duration-300 group"
              >
                <Filter className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                Filters
                {(selectedTags.length > 0 || priceRange[0] > 0 || priceRange[1] < 2000) && (
                  <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {selectedTags.length + (priceRange[0] > 0 || priceRange[1] < 2000 ? 1 : 0)}
                  </Badge>
                )}
              </Button>

              <div className="flex border border-gray-600/50 rounded-xl bg-gray-700/30 overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="lg"
                  onClick={() => setViewMode("grid")}
                  className={`h-14 px-4 ${
                    viewMode === "grid"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                      : "text-gray-300 hover:bg-gray-600/50 hover:text-white"
                  } transition-all duration-300`}
                >
                  <Grid className="h-5 w-5" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="lg"
                  onClick={() => setViewMode("list")}
                  className={`h-14 px-4 ${
                    viewMode === "list"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                      : "text-gray-300 hover:bg-gray-600/50 hover:text-white"
                  } transition-all duration-300`}
                >
                  <List className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-8 pt-8 border-t border-gray-700/30">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <Label className="text-gray-300 text-lg font-medium flex items-center">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                    Price Range
                  </Label>
                  <div className="bg-gray-700/20 p-4 rounded-xl border border-gray-600/30">
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={2000}
                      min={0}
                      step={50}
                      className="mb-4"
                    />
                    <div className="flex justify-between text-sm text-gray-400">
                      <span className="font-medium">₹{priceRange[0]}</span>
                      <span className="font-medium">₹{priceRange[1]}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-gray-300 text-lg font-medium flex items-center">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                    Tags & Features
                  </Label>
                  <div className="bg-gray-700/20 p-4 rounded-xl border border-gray-600/30 max-h-48 overflow-y-auto">
                    <div className="space-y-3">
                      {allTags.map((tag) => (
                        <div key={tag} className="flex items-center space-x-3 group">
                          <Checkbox
                            id={tag}
                            checked={selectedTags.includes(tag)}
                            onCheckedChange={() => toggleTag(tag)}
                            className="border-gray-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                          <Label htmlFor={tag} className="text-sm text-gray-400 cursor-pointer group-hover:text-gray-300 transition-colors">
                            {tag}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-gray-300 text-lg font-medium flex items-center">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                    Quick Filters
                  </Label>
                  <div className="space-y-3">
                    {[
                      { label: "Featured Designs", value: "featured" },
                      { label: "New Releases", value: "new" },
                      { label: "Best Sellers", value: "bestseller" },
                      { label: "Free Models", value: "free" }
                    ].map((filter) => (
                      <div key={filter.value} className="flex items-center space-x-3 group">
                        <Checkbox
                          id={filter.value}
                          className="border-gray-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <Label htmlFor={filter.value} className="text-sm text-gray-400 cursor-pointer group-hover:text-gray-300 transition-colors">
                          {filter.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-8">
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:border-emerald-500/50 transition-all duration-300"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
                <Button
                  onClick={() => setShowFilters(false)}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white transition-all duration-300"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-8">
            <p className="text-red-400 text-center">{error}</p>
            <Button 
              onClick={() => fetchProducts(1, false)}
              className="mt-4 mx-auto block bg-red-600 hover:bg-red-700"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && products.length === 0 && (
          <div className="flex justify-center items-center py-20">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
              <span className="text-gray-400 text-lg">Loading marketplace...</span>
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <p className="text-gray-400 text-lg">
              <span className="text-white font-semibold">{filteredProducts.length}</span> designs found
            </p>
            {(selectedTags.length > 0 || selectedCategory !== "all" || searchTerm) && (
              <div className="flex items-center space-x-2">
                <Separator orientation="vertical" className="h-6" />
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                        onClick={() => toggleTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  {selectedCategory !== "all" && (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                      {selectedCategory}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                        onClick={() => setSelectedCategory("all")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products Grid */}
        {!loading && products.length > 0 && (
          <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" : "space-y-6"}>
            {filteredProducts.map((product, index) => (
              <Card
                key={product.id}
                ref={index === filteredProducts.length - 1 ? lastProductElementRef : null}
                className={`group hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 cursor-pointer border border-gray-700/30 bg-gray-800/40 backdrop-blur-xl overflow-hidden hover:scale-105 hover:border-emerald-500/50 ${
                  viewMode === "list" ? "flex" : ""
                }`}
              >
                <CardContent className={`p-0 ${viewMode === "list" ? "flex w-full" : ""}`}>
                  <div className={`relative ${viewMode === "list" ? "w-64 flex-shrink-0" : ""}`}>
                      <div className={`relative overflow-hidden ${viewMode === "list" ? "w-full h-48" : "w-full h-64"}`}>
                        <img
                          src={product.image && product.image !== '/placeholder.svg' ? product.image : '/images/placeholder-3d-model.jpg'}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/images/placeholder-3d-model.jpg'
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      {product.tags.slice(0, 2).map((tag: string, tagIndex: number) => (
                        <Badge key={tagIndex} className="bg-gray-900/80 text-gray-300 text-xs backdrop-blur-sm border border-gray-600/50">
                          {tag}
                        </Badge>
                      ))}
                      {product.isNew && (
                        <Badge className="bg-emerald-500/90 text-white text-xs font-medium shadow-lg">
                          NEW
                        </Badge>
                      )}
                    </div>
                    
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs backdrop-blur-sm">
                        {product.material}
                      </Badge>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.preventDefault()
                        toggleLike(product.id)
                      }}
                      className={`absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm ${
                        likedProducts.has(product.id) 
                          ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30" 
                          : "bg-gray-800/80 hover:bg-gray-700/80 border-gray-600/50 text-gray-300"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${likedProducts.has(product.id) ? "fill-current" : ""}`} />
                    </Button>

                    {product.isFeatured && (
                      <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-medium shadow-lg">
                          ⭐ FEATURED
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className={`p-6 ${viewMode === "list" ? "flex-1 flex flex-col justify-between" : ""}`}>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-xl text-white mb-2 line-clamp-2 group-hover:text-emerald-300 transition-colors">{product.name}</h3>
                        <p className="text-sm text-gray-400 mb-3">by <span className="text-emerald-400 font-medium">{product.designer}</span></p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium text-white ml-1">{product.rating}</span>
                            <span className="text-sm text-gray-500 ml-1">({product.reviews})</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>{product.downloads}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="flex items-center text-gray-400">
                          <Clock className="h-3 w-3 mr-2" />
                          <span>{product.printTime}</span>
                        </div>
                        <div className="flex items-center text-gray-400">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
                          <span>Level {product.complexity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl font-bold text-emerald-400">₹{product.price}</span>
                          {product.originalPrice && (
                            <span className="text-sm text-gray-500 line-through">₹{product.originalPrice}</span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs border-gray-600/50 text-gray-400 bg-gray-700/30">
                          {product.category}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg transition-all duration-300 group"
                          asChild
                        >
                          <Link href={`/product/${product.id}`}>
                            View Details
                            <div className="ml-2 group-hover:translate-x-1 transition-transform">→</div>
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-600/50 text-gray-300 hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-400 bg-transparent transition-all duration-300"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex justify-center items-center py-12">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
              <span className="text-gray-400 text-lg">Loading more designs...</span>
            </div>
          </div>
        )}

        {/* End of Results */}
        {!hasMore && products.length > 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center space-x-3 bg-gray-800/50 backdrop-blur-sm px-6 py-4 rounded-full border border-gray-700/30">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="text-gray-300 font-medium">You've seen all available designs!</span>
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-12 w-12 text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">No designs found</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Try adjusting your search criteria or browse our categories to discover amazing 3D models.
            </p>
            <Button
              onClick={clearAllFilters}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
