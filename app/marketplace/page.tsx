"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Link from "next/link"
import { Search, Star, ShoppingCart, Heart, User, Grid, List, SlidersHorizontal, Layers, TrendingUp, Clock, Download, Filter, X, Sparkles, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { useDebounce } from "@/hooks/use-debounce"

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import {
  fetchMarketplaceProducts,
  fetchFeaturedProducts,
  fetchMarketplaceFilters,
  fetchMarketplaceStats,
  toggleProductLike,
  setFilters,
  setViewMode,
  resetFilters,
  resetPagination,
  clearError,
  clearProducts
} from "@/lib/store/slices/marketplaceSlice"

interface QuickFilter {
  label: string
  value: string
  isActive: boolean
}

const ITEMS_PER_PAGE = 20
const SEARCH_DEBOUNCE_MS = 500

export default function MarketplacePage() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const {
    products,
    filteredProducts,
    featuredProducts,
    loading,
    loadingMore,
    error,
    filters: reduxFilters,
    filtersData,
    stats,
    pagination,
    viewMode,
    likedProducts
  } = useAppSelector((state) => state.marketplace)

  const [showFilters, setShowFilters] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([
    { label: "Featured Designs", value: "featured", isActive: false },
    { label: "New Releases", value: "new", isActive: false },
    { label: "Best Sellers", value: "bestseller", isActive: false },
    { label: "Free Models", value: "free", isActive: false }
  ])

  const debouncedSearchTerm = useDebounce(searchInput, SEARCH_DEBOUNCE_MS)
  const observer = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement>(null)


  const categories = useMemo(() => 
    ["all", ...filtersData.categories.map(cat => cat.name)], 
    [filtersData.categories]
  )

  const allTags = useMemo(() => filtersData.tags, [filtersData.tags])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (selectedTags.length > 0) count += selectedTags.length
    if (priceRange[0] > 0 || priceRange[1] < 2000) count += 1
    if (reduxFilters.category !== "all") count += 1
    if (quickFilters.some(f => f.isActive)) count += quickFilters.filter(f => f.isActive).length
    return count
  }, [selectedTags, priceRange, reduxFilters.category, quickFilters])

  useEffect(() => {
    dispatch(fetchMarketplaceFilters())
    dispatch(fetchMarketplaceStats())
    dispatch(fetchFeaturedProducts())
  }, [dispatch])

  useEffect(() => {
    const searchParams = {
      page: 1,
      limit: ITEMS_PER_PAGE,
      search: debouncedSearchTerm || undefined,
      category: reduxFilters.category !== "all" ? reduxFilters.category : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 2000 ? priceRange[1] : undefined,
      sortBy: reduxFilters.sortBy
    }


    const activeQuickFilters = quickFilters.filter(f => f.isActive).map(f => f.value)
    if (activeQuickFilters.length > 0) {
      // TODO: Handle quick filters logic here
    }

    dispatch(resetPagination())
    dispatch(fetchMarketplaceProducts(searchParams))
  }, [
    dispatch, 
    debouncedSearchTerm, 
    reduxFilters.category, 
    reduxFilters.sortBy, 
    selectedTags, 
    priceRange,
    quickFilters
  ])

  // Infinite scroll implementation
  const lastProductElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return
    if (observer.current) observer.current.disconnect()
    
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !loadingMore) {
          const nextPage = pagination.page + 1
          const searchParams = {
            page: nextPage,
            limit: ITEMS_PER_PAGE,
            search: debouncedSearchTerm || undefined,
            category: reduxFilters.category !== "all" ? reduxFilters.category : undefined,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
            maxPrice: priceRange[1] < 2000 ? priceRange[1] : undefined,
            sortBy: reduxFilters.sortBy
          }
          
          dispatch(fetchMarketplaceProducts(searchParams))
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px"
      }
    )
    
    if (node) observer.current.observe(node)
  }, [loading, loadingMore, pagination.hasMore, pagination.page, debouncedSearchTerm, reduxFilters, selectedTags, priceRange, dispatch])

  // Event handlers
  const handleCategoryChange = useCallback((category: string) => {
    dispatch(setFilters({ category }))
  }, [dispatch])

  const handleSortChange = useCallback((sortBy: string) => {
    dispatch(setFilters({ sortBy }))
  }, [dispatch])

  const handleViewModeChange = useCallback((mode: "grid" | "list") => {
    dispatch(setViewMode(mode))
  }, [dispatch])

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }, [])

  const handleQuickFilterToggle = useCallback((filterValue: string) => {
    setQuickFilters(prev => 
      prev.map(filter => 
        filter.value === filterValue 
          ? { ...filter, isActive: !filter.isActive }
          : filter
      )
    )
  }, [])

  const handleLikeToggle = useCallback((productId: string) => {
    dispatch(toggleProductLike(productId))
      .unwrap()
      .then(() => {
        toast({
          title: likedProducts.includes(productId) ? "Removed from favorites" : "Added to favorites",
          duration: 2000,
        })
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: error || "Failed to update favorites",
          variant: "destructive",
          duration: 3000,
        })
      })
  }, [dispatch, likedProducts, toast])

  const clearAllFilters = useCallback(() => {
    setSearchInput("")
    setPriceRange([0, 2000])
    setSelectedTags([])
    setQuickFilters(prev => prev.map(f => ({ ...f, isActive: false })))
    dispatch(resetFilters())
  }, [dispatch])

  const handleRetry = useCallback(() => {
    dispatch(clearError())
    dispatch(fetchMarketplaceProducts({
      page: 1,
      limit: ITEMS_PER_PAGE,
      search: debouncedSearchTerm || undefined,
      category: reduxFilters.category !== "all" ? reduxFilters.category : undefined,
      sortBy: reduxFilters.sortBy
    }))
  }, [dispatch, debouncedSearchTerm, reduxFilters])

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
            { value: `${stats.totalProducts.toLocaleString()}+`, label: "3D Models", icon: Layers },
            { value: `${stats.uniqueDesigners.toLocaleString()}+`, label: "Active Designers", icon: User },
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
        <div className="bg-gray-800/40 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-gray-700/30 mb-8">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 group-hover:text-emerald-400 transition-colors" />
              <Input
                placeholder="Search for 3D models, designers, or materials..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-12 h-14 bg-gray-700/30 border-gray-600/50 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-300 text-lg"
              />
              {searchInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <Select 
                value={reduxFilters.category} 
                onValueChange={handleCategoryChange}
              >
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

              <Select 
                value={reduxFilters.sortBy} 
                onValueChange={handleSortChange}
              >
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
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>

              <div className="flex border border-gray-600/50 rounded-xl bg-gray-700/30 overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="lg"
                  onClick={() => handleViewModeChange("grid")}
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
                  onClick={() => handleViewModeChange("list")}
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
            <div className="mt-8 pt-8 border-t border-gray-700/30 animate-in slide-in-from-top-4 duration-300">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <Label className="text-gray-300 text-lg font-medium flex items-center">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                    Price Range
                  </Label>
                  <div className="bg-gray-700/20 p-4 rounded-xl border border-gray-600/30">
                    <Slider
                      value={priceRange}
                      onValueChange={(value) => setPriceRange(value as [number, number])}
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
                            onCheckedChange={() => handleTagToggle(tag)}
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
                    {quickFilters.map((filter) => (
                      <div key={filter.value} className="flex items-center space-x-3 group">
                        <Checkbox
                          id={filter.value}
                          checked={filter.isActive}
                          onCheckedChange={() => handleQuickFilterToggle(filter.value)}
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
                  disabled={activeFiltersCount === 0}
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
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 mb-8 animate-in fade-in-50 duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                <X className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <h3 className="text-red-300 font-medium">Something went wrong</h3>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
            <Button 
              onClick={handleRetry}
              className="bg-red-600 hover:bg-red-700 text-white"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {/* Initial Loading State */}
        {loading && products.length === 0 && (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
              <span className="text-gray-400 text-lg">Loading marketplace...</span>
            </div>
          </div>
        )}

        {/* Results Header */}
        {!loading && products.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center space-x-4">
              <p className="text-gray-400 text-lg">
                <span className="text-white font-semibold">{pagination.total.toLocaleString()}</span> designs found
              </p>
              {activeFiltersCount > 0 && (
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
                          onClick={() => handleTagToggle(tag)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {reduxFilters.category !== "all" && (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                        {reduxFilters.category}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                          onClick={() => handleCategoryChange("all")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    {quickFilters.filter(f => f.isActive).map((filter) => (
                      <Badge key={filter.value} variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                        {filter.label}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                          onClick={() => handleQuickFilterToggle(filter.value)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-sm text-gray-500">
              Showing {products.length} of {pagination.total.toLocaleString()}
            </div>
          </div>
        )}

        {/* Products Grid/List */}
        {!loading && products.length > 0 && (
          <>
            <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" : "space-y-6"}>
              {products.map((product, index) => (
                <Card
                  key={`${product.id}-${index}`}
                  ref={index === products.length - 1 ? lastProductElementRef : null}
                  className={`group hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 cursor-pointer border border-gray-700/30 bg-gray-800/40 backdrop-blur-xl overflow-hidden hover:scale-105 hover:border-emerald-500/50 ${
                    viewMode === "list" ? "flex" : ""
                  }`}
                >
                  <CardContent className={`p-0 ${viewMode === "list" ? "flex w-full" : ""}`}>
                    <div className={`relative ${viewMode === "list" ? "w-64 flex-shrink-0" : ""}`}>
                      <div className={`relative overflow-hidden ${viewMode === "list" ? "w-full h-48" : "w-full h-64"}`}>
                        <img
                          src={product.image && product.image !== '/placeholder.svg' ? product.image : '/images/placeholder-3d-model.jpg'}
                          alt={product.title || product.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/images/placeholder-3d-model.jpg'
                          }}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      
                      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                        {product.tags?.slice(0, 2).map((tag: string, tagIndex: number) => (
                          <Badge key={tagIndex} className="bg-gray-900/80 text-gray-300 text-xs backdrop-blur-sm border border-gray-600/50">
                            {tag}
                          </Badge>
                        ))}
                        {product.is_new && (
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
                          e.stopPropagation()
                          handleLikeToggle(product.id)
                        }}
                        className={`absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm ${
                          likedProducts.includes(product.id) 
                            ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30" 
                            : "bg-gray-800/80 hover:bg-gray-700/80 border-gray-600/50 text-gray-300"
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${likedProducts.includes(product.id) ? "fill-current" : ""}`} />
                      </Button>

                      {product.is_featured && (
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
                          <h3 className="font-bold text-xl text-white mb-2 line-clamp-2 group-hover:text-emerald-300 transition-colors">
                            {product.title || product.title}
                          </h3>
                          <p className="text-sm text-gray-400 mb-3">
                            by <span className="text-emerald-400 font-medium">{product.designer}</span>
                          </p>
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
                            <span>{product.print_time}</span>
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
                            {product.original_price && (
                              <span className="text-sm text-gray-500 line-through">₹{product.original_price}</span>
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
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              // Add to cart logic here
                              toast({
                                title: "Added to cart",
                                description: `${product.title || product.title} has been added to your cart`,
                                duration: 3000,
                              })
                            }}
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

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="flex justify-center items-center py-12" ref={loadingRef}>
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                  <span className="text-gray-400 text-lg">Loading more designs...</span>
                </div>
              </div>
            )}

            {/* End of Results */}
            {!pagination.hasMore && products.length > 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center space-x-3 bg-gray-800/50 backdrop-blur-sm px-6 py-4 rounded-full border border-gray-700/30">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span className="text-gray-300 font-medium">You've seen all available designs!</span>
                </div>
              </div>
            )}
          </>
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
            <div className="flex justify-center space-x-4">
              <Button
                onClick={clearAllFilters}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white"
              >
                Clear All Filters
              </Button>
              <Button
                variant="outline"
                onClick={handleRetry}
                className="border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:border-emerald-500/50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
