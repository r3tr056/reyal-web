"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useDropzone } from "react-dropzone"
import Link from "next/link"
import {
  Upload,
  ShoppingBag,
  Zap,
  FileText,
  Calculator,
  Clock,
  Play,
  Award,
  Layers,
  Settings,
  CheckCircle,
  TrendingUp,
  Loader2,
  AlertCircle,
  MapPin,
  WifiOff,
  Wifi,
  ShoppingCart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { useUpload } from "@/lib/providers/UploadProvider"
import { fetchAllAppConfig, selectActiveLocations, selectActivePrinters, selectAppConfigError, selectAppConfigInitialized, selectAppConfigLoading, selectAvailableColors, selectAvailableMaterials } from "@/lib/store/slices/appConfigSlice"
import { analyzeFile, selectUploadProgress, setCurrentFiles, setDragActive, uploadFile, setShowUploadModal } from "@/lib/store/slices/uploadSlice"
import { initializeDefaults, selectSettingsInitialized } from "@/lib/store/slices/settingsSlice"
import { Material } from "@/lib/types"
import { useHomepageEstimate } from '@/hooks/use-homepage-estimate'

export default function HomePage() {
  const dispatch = useAppDispatch()
  const { openUploadModal } = useUpload()
  const { user } = useAppSelector(state => state.auth)

  const bambuPrinters = useAppSelector(selectActivePrinters)
  const materials = useAppSelector(selectAvailableMaterials)
  const colors = useAppSelector(selectAvailableColors)
  const deliveryLocations = useAppSelector(selectActiveLocations)
  const appConfigLoading = useAppSelector(selectAppConfigLoading)
  const appConfigError = useAppSelector(selectAppConfigError)
  const appConfigInitialized = useAppSelector(selectAppConfigInitialized)

  const uploadProgress = useAppSelector(selectUploadProgress)
  const { error: uploadError } = useAppSelector(state => state.upload)
  const settingsInitialized = useAppSelector(selectSettingsInitialized)
  
  const { 
    estimateData: homepageEstimateData, 
    estimate, 
    isCalculating, 
    updateEstimateData, 
    proceedToDetailedQuote, 
    proceedToOrder,
  } = useHomepageEstimate()
  
  useEffect(() => {
    if (!appConfigInitialized) {
      dispatch(fetchAllAppConfig())
    }
  }, [dispatch, appConfigInitialized])

  useEffect(() => {
    if (!settingsInitialized && materials.length > 0 && colors.length > 0 && deliveryLocations.length > 0 && bambuPrinters.length > 0) {
      const defaultMaterial = materials.find(m => m.available)?.code || materials[0]?.code
      const defaultLocation = deliveryLocations[0]?.id
      const defaultPrinter = bambuPrinters[0]?.id
      
      dispatch(initializeDefaults({
        defaultMaterial,
        defaultColor: colors[0]?.name,
        defaultLocation,
        defaultPrinter
      }))
      
      updateEstimateData({
        material: defaultMaterial || '',
        location: defaultLocation || '',
        printerModel: defaultPrinter || '',
        quality: 'standard',
        infill: 20,
        quantity: 1,
        urgency: 'standard'
      })
    }
  }, [dispatch, settingsInitialized, materials, colors, deliveryLocations, bambuPrinters, updateEstimateData])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('upload') === 'true') {
      openUploadModal()
      window.history.replaceState({}, '', '/')
    }
  }, [openUploadModal])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent('/?upload=true')
      return
    }

    dispatch(setCurrentFiles(acceptedFiles))
    
    try {
      const result = await dispatch(uploadFile(file)).unwrap()
      // Start analysis automatically
      await dispatch(analyzeFile(result.id))
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }, [user, dispatch])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/octet-stream": [".stl"],
      "application/obj": [".obj"],
      "model/3mf": [".3mf"],
      "application/x-3mf": [".3mf"],
      "application/x-ply": [".ply"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  })

  useEffect(() => {
    dispatch(setDragActive(isDragActive))
  }, [dispatch, isDragActive])

  // Error retry handler
  const handleRetry = useCallback(() => {
    dispatch(fetchAllAppConfig())
  }, [dispatch])

  if (appConfigError) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <WifiOff className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-200 mb-2">Connection Error</h3>
          <p className="text-gray-400 mb-4">{appConfigError}</p>
          <Button onClick={handleRetry} variant="outline">
            <Wifi className="h-4 w-4 mr-2" />
            Try Again
          </Button>
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

      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-3 bg-card/80 backdrop-blur-sm px-6 py-3 rounded-full mb-8 border border-border shadow-sm">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-muted-foreground">Professional 3D Printing Services</span>
              <Badge className="bg-primary/10 text-primary border-primary/20">Bambu Labs Powered</Badge>
            </div>

            <h1 className="heading-primary mb-8">
              Precision Manufacturing
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary-green bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>

            <p className="text-body-large mb-8 max-w-4xl mx-auto">
              Advanced Bambu Labs 3D printing technology meets professional service. From rapid prototyping to production runs, we
              deliver precision parts with industrial-grade quality and speed.
            </p>

            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mb-12">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Located in Landcraft Golflinks, Ghaziabad, Uttar Pradesh</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Button
                size="lg"
                className="btn-primary shadow-lg hover:shadow-primary/25 transform hover:scale-105 transition-all duration-300 px-8 py-4 text-lg font-semibold"
                onClick={openUploadModal}
              >
                <Upload className="mr-3 h-5 w-5" />
                Upload Design
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="btn-secondary shadow-lg backdrop-blur-sm px-8 py-4 text-lg font-semibold hover:scale-105 transition-all duration-300"
                asChild
              >
                <Link href="/marketplace">
                  <ShoppingBag className="mr-3 h-5 w-5" />
                  Browse Catalog
                </Link>
              </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {[
                { icon: CheckCircle, label: "Success Rate", value: "99.8%", color: "text-primary" },
                { icon: Clock, label: "Avg. Turnaround", value: "24h", color: "text-primary" },
                { icon: Award, label: "Quality Rating", value: "4.9★", color: "text-yellow-500" },
                { icon: TrendingUp, label: "Orders Completed", value: "5K+", color: "text-primary" },
              ].map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="w-12 h-12 bg-card border border-border rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:border-primary/50 transition-all duration-300 shadow-sm">
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload and Estimate Section */}
          <div className="grid lg:grid-cols-2 gap-12 mb-20">
            {/* Enhanced Quick Upload Box */}
            <div>
              <Card className="card-elevated h-full hover:border-primary/20 transition-all duration-500">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-green rounded-lg flex items-center justify-center shadow-lg">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-foreground">Upload Your Design</CardTitle>
                      <CardDescription className="text-muted-foreground">Professional analysis & instant quote</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div
                    {...getRootProps()}
                    className={`text-center cursor-pointer transition-all duration-300 rounded-xl p-8 border-2 border-dashed relative overflow-hidden ${
                      isDragActive
                        ? "border-primary bg-primary/5 scale-105"
                        : "border-border hover:border-primary/50 hover:bg-primary/[0.02]"
                    }`}
                  >
                    <input {...getInputProps()} />

                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-green rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg transform hover:scale-110 transition-transform duration-300">
                        <FileText className="h-8 w-8 text-white" />
                      </div>

                      {isDragActive ? (
                        <div>
                          <h3 className="text-xl font-bold text-primary mb-2">Drop files here</h3>
                          <p className="text-muted-foreground">Release to upload your 3D models</p>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-xl font-bold text-foreground mb-2">Drag & Drop Files</h3>
                          <p className="text-muted-foreground mb-4">STL, OBJ, 3MF, PLY files supported (Max 50MB)</p>
                          <div className="flex items-center justify-center space-x-6 text-sm">
                            <div className="flex items-center space-x-2 text-primary">
                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                              <span>Auto Analysis</span>
                            </div>
                            <div className="flex items-center space-x-2 text-primary">
                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-300"></div>
                              <span>Instant Quote</span>
                            </div>
                            <div className="flex items-center space-x-2 text-primary">
                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-700"></div>
                              <span>Quality Check</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {uploadProgress.uploading && (
                    <div className="mt-4 flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-foreground">Uploading to secure storage...</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-4 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span>{uploadError}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Estimate Calculator */}
            <div>
              <Card className="card-elevated h-full hover:border-primary/20 transition-all duration-500">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-green to-primary rounded-lg flex items-center justify-center shadow-lg">
                      <Calculator className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-foreground">Cost Calculator</CardTitle>
                      <CardDescription className="text-muted-foreground">Get accurate pricing estimates</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Printer Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">Printer Model</Label>
                    <Select
                      value={homepageEstimateData.printerModel}
                      onValueChange={(value) => updateEstimateData({printerModel: value})}
                    >
                      <SelectTrigger className="bg-background border-border text-foreground hover:border-primary/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {bambuPrinters.map((printer) => (
                          <SelectItem key={printer.id} value={printer.id} className="text-foreground hover:bg-accent focus:bg-accent">
                            <div>
                              <div className="font-medium">{printer.name}</div>
                              <div className="text-sm text-muted-foreground">{printer.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Material Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">Material Type</Label>
                    {!materials || materials.length === 0 ? (
                      <div className="flex items-center gap-2 p-3 border rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading materials...</span>
                      </div>
                    ) : (
                      <Select
                        value={homepageEstimateData.material}
                        onValueChange={(value) => updateEstimateData({material: value})}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground hover:border-primary/50 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {materials.filter((m: Material) => m.available).map((material: Material) => (
                            <SelectItem key={material.code} value={material.code} className="text-foreground hover:bg-accent focus:bg-accent">
                              <div>
                                <div className="font-medium">{material.name}</div>
                                <div className="text-sm text-muted-foreground">₹{material.price_per_hour}/hour</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Quality Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">Print Quality</Label>
                    <Select
                      value={homepageEstimateData.quality}
                      onValueChange={(value: 'draft' | 'standard' | 'high' | 'ultra') => updateEstimateData({quality: value})}
                    >
                      <SelectTrigger className="bg-background border-border text-foreground hover:border-primary/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="draft" className="text-foreground hover:bg-accent focus:bg-accent">
                          Draft - 0.3mm (Rapid)
                        </SelectItem>
                        <SelectItem value="standard" className="text-foreground hover:bg-accent focus:bg-accent">
                          Standard - 0.2mm (Balanced)
                        </SelectItem>
                        <SelectItem value="high" className="text-foreground hover:bg-accent focus:bg-accent">
                          High - 0.15mm (Precision)
                        </SelectItem>
                        <SelectItem value="ultra" className="text-foreground hover:bg-accent focus:bg-accent">
                          Ultra - 0.1mm (Maximum Detail)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Infill Percentage */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-foreground">
                      Infill Density: {homepageEstimateData.infill}%
                    </Label>
                    <Slider
                      value={[homepageEstimateData.infill]}
                      onValueChange={(value) => updateEstimateData({infill: value[0]})}
                      max={100}
                      min={10}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Hollow (10%)</span>
                      <span>Solid (100%)</span>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-3">
                    <Label htmlFor="quantity" className="text-sm font-medium text-foreground">
                      Quantity
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max="1000"
                      value={homepageEstimateData.quantity}
                      onChange={(e) =>
                        updateEstimateData({quantity: Number.parseInt(e.target.value) || 1})
                      }
                      className="bg-background border-border text-foreground hover:border-primary/50 focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">Delivery Location</Label>
                    <Select
                      value={homepageEstimateData.location}
                      onValueChange={(value) => updateEstimateData({location: value})}
                    >
                      <SelectTrigger className="bg-background border-border text-foreground hover:border-primary/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {deliveryLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id} className="text-foreground hover:bg-accent focus:bg-accent">
                            <div>
                              <div className="font-medium">{location.name}</div>
                              <div className="text-sm text-muted-foreground">{location.state}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Estimate Results */}
                  <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
                    <h4 className="font-bold text-primary mb-4 flex items-center">
                      <Zap className="h-4 w-4 mr-2" />
                      Instant Quote
                    </h4>
                    
                    {isCalculating ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        <span className="text-muted-foreground">Calculating estimate...</span>
                      </div>
                    ) : estimate ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Estimated Cost:</span>
                          <span className="text-3xl font-bold text-foreground">₹{estimate.price}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">Print Time</div>
                            <div className="font-semibold text-foreground">{estimate.printTime}h</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">Ready In</div>
                            <div className="font-semibold text-foreground">{estimate.readyTime}d</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">Delivered</div>
                            <div className="font-semibold text-foreground">{estimate.deliveryTime}d</div>
                          </div>
                        </div>
                        
                        <div className="space-y-3 pt-2">
                          <Button 
                            className="w-full btn-primary shadow-lg"
                            onClick={proceedToDetailedQuote}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Get Detailed Quote PDF
                          </Button>
                          <Button 
                            variant="outline"
                            className="w-full btn-secondary"
                            onClick={proceedToOrder}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Upload File & Place Order
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Configure settings to see estimate</p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    * Estimates based on standard parameters. Final pricing determined after model analysis.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
          
      {/* Technology Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">Bambu Labs Technology</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Advanced manufacturing capabilities powered by professional Bambu Lab 3D printing systems
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-16">
            {bambuPrinters.map((printer, index) => (
              <Card key={printer.id} className="card-elevated hover:border-primary/20 transition-all duration-500">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-green rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Settings className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-white">{printer.name}</CardTitle>
                  <CardDescription className="text-gray-400">{printer.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-gray-400">Build Volume</Label>
                      <p className="text-white font-medium">
                        {printer.max_dimensions.x}×{printer.max_dimensions.y}×{printer.max_dimensions.z}mm
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Layer Heights</Label>
                      <p className="text-white font-medium">
                        {printer.layer_heights[0]}mm - {printer.layer_heights[printer.layer_heights.length - 1]}mm
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Materials</Label>
                      <p className="text-white font-medium">{printer.supported_materials.length}+ Types</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Features</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {printer.features.includes('auto-leveling') && <Badge className="text-xs">Auto-Level</Badge>}
                        {printer.features.includes('enclosed') && <Badge className="text-xs">Enclosed</Badge>}
                        {printer.features.includes('ams') && <Badge className="text-xs">AMS</Badge>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <p className="text-gray-400 mb-6">
              Located at Landcraft Golflinks, Ghaziabad, Uttar Pradesh - Serving Delhi NCR and beyond
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-primary">
              <MapPin className="h-4 w-4" />
              <span>Same-day delivery available in Ghaziabad</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-green-600/20 to-teal-600/20"></div>
        <div className="absolute inset-0 backdrop-blur-3xl"></div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl font-bold text-white mb-6">Ready to Start Manufacturing?</h2>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join manufacturers who trust our Bambu Labs powered facility for precision 3D printing. From rapid prototyping to production runs,
            we deliver professional results with guaranteed quality from our Ghaziabad facility.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-2xl hover:shadow-emerald-500/40 transform hover:scale-105 transition-all duration-300 px-8 py-4 text-lg font-semibold"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload className="mr-3 h-5 w-5" />
              Start Your Project
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-gray-400 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white hover:border-emerald-500/50 shadow-xl backdrop-blur-sm px-8 py-4 text-lg font-semibold"
              asChild
            >
              <Link href="/contact">
                <Play className="mr-3 h-5 w-5" />
                Schedule Visit
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 border-t border-gray-800/50 py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-green-500/5"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold text-white">REYAL</span>
                  <div className="text-xs text-emerald-400 font-medium tracking-wider">3D PRINTING</div>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed mb-4">
                Professional 3D printing services powered by Bambu Labs technology. Precision manufacturing
                with industrial-grade quality and reliability.
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <MapPin className="h-4 w-4" />
                <span>Landcraft Golflinks, Ghaziabad, UP</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-lg text-white">Services</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <button 
                    onClick={() => setShowUploadModal(true)}
                    className="hover:text-emerald-400 transition-colors text-left"
                  >
                    Rapid Prototyping
                  </button>
                </li>
                <li>
                  <Link href="/marketplace" className="hover:text-emerald-400 transition-colors">
                    Production Runs
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400 transition-colors">
                    Design Optimization
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400 transition-colors">
                    Material Consulting
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-lg text-white">Technology</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <span className="hover:text-emerald-400 transition-colors">Bambu Lab A1</span>
                </li>
                <li>
                  <span className="hover:text-emerald-400 transition-colors">Bambu Lab X1 Carbon</span>
                </li>
                <li>
                  <span className="hover:text-emerald-400 transition-colors">Multi-Material System</span>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                    Facility Tour
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-lg text-white">Contact</h3>
              <div className="space-y-3 text-gray-400">
                <p>orders@reyal3d.in</p>
                <p>+91 98765 43210</p>
                <p>Landcraft Golflinks</p>
                <p>Ghaziabad, Uttar Pradesh</p>
                <div className="flex space-x-4 mt-4">
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                    <span className="text-xs">Li</span>
                  </div>
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                    <span className="text-xs">Tw</span>
                  </div>
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                    <span className="text-xs">Yt</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-500">
            <p>© 2024 REYAL 3D Printing. All rights reserved. Powered by Bambu Labs technology.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
