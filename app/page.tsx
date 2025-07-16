"use client"

import { useCallback, useState, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import Link from "next/link"
import Image from "next/image"
import {
  Upload,
  ShoppingBag,
  Zap,
  Star,
  ArrowRight,
  FileText,
  ShoppingCart,
  User,
  Calculator,
  Clock,
  Package,
  LinkIcon,
  X,
  Play,
  Award,
  Layers,
  Settings,
  CheckCircle,
  TrendingUp,
  Loader2,
  AlertCircle,
  Receipt,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

interface FileAnalysis {
  volume: number
  surfaceArea: number
  dimensions: { x: number; y: number; z: number }
  complexity: number
  supportRequired: boolean
  printTime: number
  triangleCount: number
  vertexCount: number
}

interface CostBreakdown {
  materialCost: number
  supportCost: number
  laborCost: number
  machineTime: number
  postProcessingCost: number
  urgencyCost: number
  baseCost: number
  taxes: number
  total: number
}

interface PrintSettings {
  material: string
  color: string
  quality: 'draft' | 'standard' | 'high' | 'ultra'
  infill: number
  supports: boolean
  postProcessing: boolean
  urgency: 'standard' | 'express' | 'rush'
}

const materials = [
  { id: 'pla', name: 'Bambu PLA Basic', description: 'Eco-friendly, easy to print, great for prototypes' },
  { id: 'pla-plus', name: 'Bambu PLA-CF', description: 'Carbon fiber reinforced, high strength' },
  { id: 'abs', name: 'Bambu ABS', description: 'Engineering grade, heat resistant, durable' },
  { id: 'petg', name: 'Bambu PETG-CF', description: 'Chemical resistant, carbon fiber reinforced' },
  { id: 'tpu', name: 'Bambu TPU 95A', description: 'Flexible, rubber-like properties' },
  { id: 'pva-support', name: 'Bambu PVA Support', description: 'Water-soluble support material' }
]

const colors = ['White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Gray']

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  // Upload workflow state
  const [uploadStep, setUploadStep] = useState(1)
  const [uploadedFile, setUploadedFile] = useState<any>(null)
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null)
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    material: 'pla',
    color: 'White',
    quality: 'standard',
    infill: 20,
    supports: false,
    postProcessing: false,
    urgency: 'standard'
  })
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null)
  const [estimatedDays, setEstimatedDays] = useState<number>(0)
  const [quote, setQuote] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Estimate calculator state
  const [estimateData, setEstimateData] = useState({
    material: "pla",
    quality: "standard",
    infill: [20],
    dimensions: "",
    quantity: 1,
    location: "mumbai",
  })

  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<"device" | "url">("device")
  const [fileUrl, setFileUrl] = useState("")

  // Check for upload URL parameter and open modal automatically
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('upload') === 'true') {
      setShowUploadModal(true)
      // Clean up URL
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!user) {
      router.push('/login')
      return
    }

    setUploadedFiles(acceptedFiles)
    setUploadError(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `Upload failed (${response.status})`)

      setUploadedFile(result.file)
      setUploadStep(2)
      
      analyzeFile(result.file.id)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [user, router])

  const analyzeFile = async (fileId: string) => {
    setIsAnalyzing(true)
    setUploadError(null)

    try {
      const response = await fetch(`/api/analyze/${fileId}`, {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed')
      }

      setFileAnalysis(result.analysis)
      setUploadStep(3)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const calculateCost = async () => {
    if (!uploadedFile) return

    setIsCalculating(true)
    setUploadError(null)

    try {
      const response = await fetch('/api/calculate-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: uploadedFile.id, settings: printSettings })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `Cost calculation failed (${response.status})`)

      setCostBreakdown(result.costBreakdown)
      setEstimatedDays(result.estimatedDays)
      setUploadStep(4)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Cost calculation failed')
    } finally {
      setIsCalculating(false)
    }
  }

  const generateQuote = async () => {
    if (!uploadedFile) return

    setIsGeneratingQuote(true)
    setUploadError(null)

    try {
      const response = await fetch('/api/generate-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: uploadedFile.id, settings: printSettings })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `Quote generation failed (${response.status})`)
      const q = result.quote
      q.validUntil = new Date(q.validUntil)
      setQuote(q)
      setUploadStep(5)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Quote generation failed')
    } finally {
      setIsGeneratingQuote(false)
    }
  }

  const resetUploadFlow = () => {
    setUploadStep(1)
    setUploadedFile(null)
    setFileAnalysis(null)
    setCostBreakdown(null)
    setQuote(null)
    setUploadedFiles([])
    setUploadError(null)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/octet-stream": [".stl"],
      "application/obj": [".obj"],
      "model/3mf": [".3mf"],
      "application/x-3mf": [".3mf"],
    },
    maxFiles: 5,
  })

  // Calculate estimate
  const calculateEstimate = () => {
    const basePrices = {
      pla: 35,
      abs: 45,
      petg: 65,
      tpu: 85,
    }

    const qualityMultipliers = {
      draft: 0.7,
      standard: 1.0,
      high: 1.4,
      ultra: 2.0,
    }

    const basePrice = basePrices[estimateData.material as keyof typeof basePrices] || 35
    const qualityMultiplier = qualityMultipliers[estimateData.quality as keyof typeof qualityMultipliers] || 1.0
    const infillMultiplier = 1 + (estimateData.infill[0] / 100) * 0.3

    const estimatedPrice = Math.round(basePrice * qualityMultiplier * infillMultiplier * estimateData.quantity)

    // Calculate time estimates
    const basePrintTime = 3.5 // hours
    const printTime = Math.round(basePrintTime * qualityMultiplier * infillMultiplier)

    const processingTime = estimateData.quality === "ultra" ? 0.5 : 0.25 // days
    const shippingTime = estimateData.location === "mumbai" ? 0.5 : 2 // days

    return {
      price: estimatedPrice,
      printTime: printTime,
      readyTime: Math.ceil(processingTime),
      deliveryTime: Math.ceil(processingTime + shippingTime),
    }
  }

  const estimate = calculateEstimate()

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
              <Badge className="bg-primary/10 text-primary border-primary/20">Industry Leading</Badge>
            </div>

            <h1 className="heading-primary mb-8">
              Precision Manufacturing
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary-green bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>

            <p className="text-body-large mb-12 max-w-4xl mx-auto">
              Advanced 3D printing technology meets professional service. From rapid prototyping to production runs, we
              deliver precision parts with industrial-grade quality and speed.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Button
                size="lg"
                className="btn-primary shadow-lg hover:shadow-primary/25 transform hover:scale-105 transition-all duration-300 px-8 py-4 text-lg font-semibold"
                onClick={() => setShowUploadModal(true)}
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
                { icon: TrendingUp, label: "Orders Completed", value: "50K+", color: "text-primary" },
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
                          <p className="text-muted-foreground mb-4">STL, OBJ, 3MF files supported (Max 100MB)</p>
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

                  {uploadedFiles.length > 0 && (
                    <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <h4 className="font-bold text-primary mb-3 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Files Ready for Processing
                      </h4>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-3 text-sm bg-card p-3 rounded-lg backdrop-blur-sm border border-border"
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-green rounded-lg flex items-center justify-center">
                              <FileText className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-foreground font-medium flex-1">{file.name}</span>
                            <span className="text-primary text-xs bg-primary/10 px-2 py-1 rounded-full">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    <Button
                      className="mt-4 w-full btn-primary shadow-lg"
                      onClick={() => setShowUploadModal(true)}
                    >
                      Continue to Analysis
                    </Button>
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
                  {/* Material Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">Material Type</Label>
                    <Select
                      value={estimateData.material}
                      onValueChange={(value) => setEstimateData((prev) => ({ ...prev, material: value }))}
                    >
                      <SelectTrigger className="bg-background border-border text-foreground hover:border-primary/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="pla" className="text-foreground hover:bg-accent focus:bg-accent">
                          Bambu PLA Basic (₹35/hr)
                        </SelectItem>
                        <SelectItem value="abs" className="text-foreground hover:bg-accent focus:bg-accent">
                          Bambu ABS Engineering (₹45/hr)
                        </SelectItem>
                        <SelectItem value="petg" className="text-foreground hover:bg-accent focus:bg-accent">
                          Bambu PETG-CF (₹65/hr)
                        </SelectItem>
                        <SelectItem value="tpu" className="text-foreground hover:bg-accent focus:bg-accent">
                          Bambu TPU 95A (₹85/hr)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quality Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">Print Quality</Label>
                    <Select
                      value={estimateData.quality}
                      onValueChange={(value) => setEstimateData((prev) => ({ ...prev, quality: value }))}
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
                      Infill Density: {estimateData.infill[0]}%
                    </Label>
                    <Slider
                      value={estimateData.infill}
                      onValueChange={(value) => setEstimateData((prev) => ({ ...prev, infill: value }))}
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
                      value={estimateData.quantity}
                      onChange={(e) =>
                        setEstimateData((prev) => ({ ...prev, quantity: Number.parseInt(e.target.value) || 1 }))
                      }
                      className="bg-background border-border text-foreground hover:border-primary/50 focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">Delivery Location</Label>
                    <Select
                      value={estimateData.location}
                      onValueChange={(value) => setEstimateData((prev) => ({ ...prev, location: value }))}
                    >
                      <SelectTrigger className="bg-background border-border text-foreground hover:border-primary/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="mumbai" className="text-foreground hover:bg-accent focus:bg-accent">
                          Mumbai (Same Day)
                        </SelectItem>
                        <SelectItem value="delhi" className="text-foreground hover:bg-accent focus:bg-accent">
                          Delhi (1-2 days)
                        </SelectItem>
                        <SelectItem value="bangalore" className="text-foreground hover:bg-accent focus:bg-accent">
                          Bangalore (1-2 days)
                        </SelectItem>
                        <SelectItem value="other" className="text-foreground hover:bg-accent focus:bg-accent">
                          Other Cities (2-4 days)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Estimate Results */}
                  <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
                    <h4 className="font-bold text-primary mb-4 flex items-center">
                      <Zap className="h-4 w-4 mr-2" />
                      Instant Quote
                    </h4>
                    <div className="space-y-3">
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
                    </div>
                    <Button className="w-full mt-4 btn-primary shadow-lg">
                      Get Detailed Quote
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    * Estimates based on standard parameters. Final pricing may vary based on model complexity.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Upload Workflow Modal */}
        <Dialog open={showUploadModal} onOpenChange={(open) => {
          setShowUploadModal(open)
          if (!open) resetUploadFlow()
        }}>
          <DialogContent className="sm:max-w-4xl bg-gray-800 border-gray-700 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl text-white flex items-center">
                <Upload className="h-6 w-6 mr-3 text-emerald-400" />
                3D Printing Workflow
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Complete workflow from upload to quote generation
              </DialogDescription>
            </DialogHeader>

            {/* Progress Steps */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      i <= uploadStep ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-gray-400'
                    }`}>
                      {i}
                    </div>
                    {i < 5 && (
                      <div className={`h-1 w-16 mx-2 ${
                        i < uploadStep ? 'bg-emerald-600' : 'bg-gray-600'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-400">
                <span>Upload</span>
                <span>Analyze</span>
                <span>Configure</span>
                <span>Calculate</span>
                <span>Quote</span>
              </div>
            </div>

            {uploadError && (
              <Card className="mb-6 border-red-500/20 bg-red-500/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>{uploadError}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Upload */}
            {uploadStep === 1 && (
              <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as "device" | "url")}>
                <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                  <TabsTrigger value="device" className="data-[state=active]:bg-emerald-600">
                    From Device
                  </TabsTrigger>
                  <TabsTrigger value="url" className="data-[state=active]:bg-emerald-600">
                    From URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="device" className="mt-6">
                  <div
                    {...getRootProps()}
                    className={`text-center cursor-pointer transition-all duration-300 rounded-xl p-8 border-2 border-dashed ${
                      isDragActive
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-gray-600 hover:border-emerald-500/50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
                    {isDragActive ? (
                      <p className="text-lg text-emerald-400">Drop your 3D model here...</p>
                    ) : (
                      <div>
                        <p className="text-lg mb-2 text-white">Drag & drop your 3D model here, or click to select</p>
                        <p className="text-sm text-gray-400">Supports STL, OBJ, 3MF, PLY files up to 50MB</p>
                      </div>
                    )}
                  </div>
                  {isUploading && (
                    <div className="mt-4 flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading file...</span>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="url" className="mt-6">
                  <div className="space-y-4">
                    <Input
                      type="url"
                      placeholder="https://example.com/model.stl"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      className="bg-gray-700/50 border-gray-600 text-gray-300"
                    />
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      disabled={!fileUrl.trim()}
                      onClick={() => {
                        // Handle URL upload
                        console.log("Upload from URL:", fileUrl)
                      }}
                    >
                      Import from URL
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {/* Step 2: Analysis */}
            {uploadStep === 2 && (
              <Card className="bg-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileText className="h-5 w-5" />
                    Analyzing Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-white">{uploadedFile?.original_filename}</p>
                      <p className="text-sm text-gray-400">
                        {(uploadedFile?.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {isAnalyzing && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Analyzing geometry...</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Configuration */}
            {uploadStep === 3 && fileAnalysis && (
              <div className="space-y-6">
                <Card className="bg-gray-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Analysis Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm text-gray-400">Volume</Label>
                        <p className="font-medium text-white">{fileAnalysis.volume.toFixed(2)} cm³</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-400">Dimensions</Label>
                        <p className="font-medium text-white">
                          {fileAnalysis.dimensions.x.toFixed(1)} × {fileAnalysis.dimensions.y.toFixed(1)} × {fileAnalysis.dimensions.z.toFixed(1)} mm
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-400">Complexity</Label>
                        <Badge variant={fileAnalysis.complexity <= 2 ? 'secondary' : fileAnalysis.complexity <= 4 ? 'default' : 'destructive'}>
                          {fileAnalysis.complexity}/5
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-400">Support Required</Label>
                        <p className="font-medium text-white">{fileAnalysis.supportRequired ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-400">Est. Print Time</Label>
                        <p className="font-medium text-white">{Math.round(fileAnalysis.printTime / 60)} hours</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-400">Triangles</Label>
                        <p className="font-medium text-white">{fileAnalysis.triangleCount.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Settings className="h-5 w-5" />
                      Print Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="material" className="text-gray-300">Material</Label>
                        <Select
                          value={printSettings.material}
                          onValueChange={(value) => setPrintSettings(prev => ({ ...prev, material: value }))}
                        >
                          <SelectTrigger className="bg-gray-600 border-gray-500 text-gray-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {materials.map((material) => (
                              <SelectItem key={material.id} value={material.id} className="text-gray-300">
                                <div>
                                  <div className="font-medium">{material.name}</div>
                                  <div className="text-sm text-gray-400">{material.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="color" className="text-gray-300">Color</Label>
                        <Select
                          value={printSettings.color}
                          onValueChange={(value) => setPrintSettings(prev => ({ ...prev, color: value }))}
                        >
                          <SelectTrigger className="bg-gray-600 border-gray-500 text-gray-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {colors.map((color) => (
                              <SelectItem key={color} value={color} className="text-gray-300">
                                {color}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="quality" className="text-gray-300">Print Quality</Label>
                        <Select
                          value={printSettings.quality}
                          onValueChange={(value: any) => setPrintSettings(prev => ({ ...prev, quality: value }))}
                        >
                          <SelectTrigger className="bg-gray-600 border-gray-500 text-gray-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            <SelectItem value="draft" className="text-gray-300">Draft (Fast, lower quality)</SelectItem>
                            <SelectItem value="standard" className="text-gray-300">Standard (Balanced)</SelectItem>
                            <SelectItem value="high" className="text-gray-300">High (Slower, better quality)</SelectItem>
                            <SelectItem value="ultra" className="text-gray-300">Ultra (Slowest, best quality)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="urgency" className="text-gray-300">Delivery</Label>
                        <Select
                          value={printSettings.urgency}
                          onValueChange={(value: any) => setPrintSettings(prev => ({ ...prev, urgency: value }))}
                        >
                          <SelectTrigger className="bg-gray-600 border-gray-500 text-gray-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            <SelectItem value="standard" className="text-gray-300">Standard (7 days)</SelectItem>
                            <SelectItem value="express" className="text-gray-300">Express (3 days)</SelectItem>
                            <SelectItem value="rush" className="text-gray-300">Rush (1 day)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="infill" className="text-gray-300">Infill Density: {printSettings.infill}%</Label>
                      <Slider
                        value={[printSettings.infill]}
                        onValueChange={([value]) => setPrintSettings(prev => ({ ...prev, infill: value }))}
                        max={100}
                        min={5}
                        step={5}
                        className="mt-2"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="supports" className="text-gray-300">Support Structures</Label>
                        <p className="text-sm text-gray-400">
                          {fileAnalysis.supportRequired ? 'Recommended for this model' : 'Optional for this model'}
                        </p>
                      </div>
                      <Switch
                        id="supports"
                        checked={printSettings.supports}
                        onCheckedChange={(checked) => setPrintSettings(prev => ({ ...prev, supports: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="postProcessing" className="text-gray-300">Post-Processing</Label>
                        <p className="text-sm text-gray-400">Sanding, painting, and finishing</p>
                      </div>
                      <Switch
                        id="postProcessing"
                        checked={printSettings.postProcessing}
                        onCheckedChange={(checked) => setPrintSettings(prev => ({ ...prev, postProcessing: checked }))}
                      />
                    </div>

                    <Button onClick={calculateCost} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isCalculating}>
                      {isCalculating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Calculating Cost...
                        </>
                      ) : (
                        <>
                          <Calculator className="h-4 w-4 mr-2" />
                          Calculate Cost
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Cost Calculation */}
            {uploadStep === 4 && costBreakdown && (
              <Card className="bg-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Calculator className="h-5 w-5" />
                    Cost Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Material Cost</span>
                      <span>${costBreakdown.materialCost.toFixed(2)}</span>
                    </div>
                    {costBreakdown.supportCost > 0 && (
                      <div className="flex justify-between text-gray-300">
                        <span>Support Material</span>
                        <span>${costBreakdown.supportCost.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-300">
                      <span>Machine Time</span>
                      <span>${costBreakdown.machineTime.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Labor</span>
                      <span>${costBreakdown.laborCost.toFixed(2)}</span>
                    </div>
                    {costBreakdown.postProcessingCost > 0 && (
                      <div className="flex justify-between text-gray-300">
                        <span>Post-Processing</span>
                        <span>${costBreakdown.postProcessingCost.toFixed(2)}</span>
                      </div>
                    )}
                    {costBreakdown.urgencyCost > 0 && (
                      <div className="flex justify-between text-gray-300">
                        <span>Urgency Fee</span>
                        <span>${costBreakdown.urgencyCost.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator className="bg-gray-600" />
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal</span>
                      <span>${costBreakdown.baseCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Taxes (18%)</span>
                      <span>${costBreakdown.taxes.toFixed(2)}</span>
                    </div>
                    <Separator className="bg-gray-600" />
                    <div className="flex justify-between font-bold text-lg text-white">
                      <span>Total</span>
                      <span>${costBreakdown.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
                    <p className="text-sm text-emerald-400">
                      <strong>Estimated Delivery:</strong> {estimatedDays} business days
                    </p>
                  </div>

                  <Button onClick={generateQuote} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isGeneratingQuote}>
                    {isGeneratingQuote ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Quote...
                      </>
                    ) : (
                      <>
                        <Receipt className="h-4 w-4 mr-2" />
                        Generate Quote
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Quote Generated */}
            {uploadStep === 5 && quote && (
              <Card className="bg-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Quote Generated
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-emerald-500/10 p-6 rounded-lg border border-emerald-500/20">
                    <div className="text-center">
                      <p className="text-sm text-gray-400 mb-2">Total Cost</p>
                      <p className="text-3xl font-bold text-white">${quote.costBreakdown.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Delivery in {quote.estimatedDays} business days
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3 text-white">Quote Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>Quote ID:</span>
                        <span className="font-mono">{quote.id}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Valid Until:</span>
                        <span>{new Date(quote.validUntil).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Material:</span>
                        <span>{materials.find(m => m.id === quote.settings.material)?.name}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Quality:</span>
                        <span className="capitalize">{quote.settings.quality}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                      Add to Cart
                    </Button>
                    <Button variant="outline" className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-600">
                      Save Quote
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-500">
                {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) selected` : ""}
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Close
                </Button>
                {uploadStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={resetUploadFlow}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Start Over
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>

      {/* Technology Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">Industrial-Grade Technology</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Advanced manufacturing capabilities powered by professional 3D printing systems
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Layers,
                title: "Multi-Material Printing",
                description:
                  "Advanced FDM and SLA systems supporting PLA, ABS, PETG, TPU, and engineering-grade materials for diverse applications.",
                gradient: "from-emerald-600 to-green-600",
                features: ["20+ Material Options", "Dual Extrusion", "Soluble Supports"],
              },
              {
                icon: Settings,
                title: "Precision Manufacturing",
                description:
                  "Sub-millimeter accuracy with automated quality control, ensuring consistent results for prototypes and production parts.",
                gradient: "from-green-600 to-teal-600",
                features: ["±0.1mm Tolerance", "Auto Calibration", "Quality Assurance"],
              },
              {
                icon: Zap,
                title: "Rapid Production",
                description:
                  "Optimized workflows and parallel processing capabilities for fast turnaround times without compromising quality.",
                gradient: "from-teal-600 to-emerald-600",
                features: ["24/7 Operation", "Batch Processing", "Express Service"],
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 border border-gray-700/50 bg-gray-800/50 backdrop-blur-xl hover:scale-105"
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl mb-3 text-white">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed text-gray-400 mb-4">
                    {feature.description}
                  </CardDescription>
                  <div className="space-y-2">
                    {feature.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center justify-center text-sm text-emerald-400">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {feat}
                      </div>
                    ))}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Designs */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 to-gray-800/50"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex justify-between items-center mb-16">
            <div>
              <h2 className="text-5xl font-bold mb-2 text-white">Featured Designs</h2>
              <p className="text-gray-400 text-xl">Professional-grade models ready for production</p>
            </div>
            <Button
              variant="outline"
              className="border-2 border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white hover:border-emerald-500/50 shadow-xl backdrop-blur-sm"
              asChild
            >
              <Link href="/marketplace">
                View Catalog <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                id: 1,
                name: "Precision Phone Stand",
                price: 299,
                originalPrice: 399,
                image: "/placeholder.svg?height=300&width=300",
                rating: 4.8,
                reviews: 124,
                category: "Accessories",
                tags: ["Professional", "New"],
                material: "PLA+",
              },
              {
                id: 2,
                name: "Modular Desk Organizer",
                price: 599,
                image: "/placeholder.svg?height=300&width=300",
                rating: 4.9,
                reviews: 89,
                category: "Office",
                tags: ["Bestseller"],
                material: "PETG",
              },
              {
                id: 3,
                name: "Articulated Dragon",
                price: 899,
                image: "/placeholder.svg?height=300&width=300",
                rating: 4.7,
                reviews: 156,
                category: "Figurines",
                tags: ["Complex"],
                material: "Resin",
              },
              {
                id: 4,
                name: "Custom Keychain",
                price: 199,
                image: "/placeholder.svg?height=300&width=300",
                rating: 4.6,
                reviews: 203,
                category: "Accessories",
                tags: ["Customizable"],
                material: "ABS",
              },
            ].map((product) => (
              <Card
                key={product.id}
                className="group hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 cursor-pointer border border-gray-700/50 bg-gray-800/50 backdrop-blur-xl overflow-hidden hover:scale-105"
              >
                <CardContent className="p-0">
                  <div className="relative">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      width={300}
                      height={300}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                      {product.tags.map((tag, index) => (
                        <Badge key={index} className="bg-gray-800/80 text-gray-300 text-xs backdrop-blur-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                        {product.material}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold mb-2 text-white line-clamp-2">{product.name}</h3>
                    <div className="flex items-center mb-3">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-400 ml-1">{product.rating}</span>
                        <span className="text-sm text-gray-500 ml-1">({product.reviews})</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-emerald-400">₹{product.price}</span>
                        {product.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">₹{product.originalPrice}</span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                        {product.category}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
                        asChild
                      >
                        <Link href={`/product/${product.id}`}>View Details</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-emerald-500/50 bg-transparent"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
            Join industry leaders who trust REYAL for precision 3D printing. From rapid prototyping to production runs,
            we deliver professional results with guaranteed quality.
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
                Schedule Consultation
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
              <p className="text-gray-400 leading-relaxed">
                Professional 3D printing services for engineers, designers, and manufacturers. Precision manufacturing
                with industrial-grade quality and reliability.
              </p>
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
              <h3 className="font-bold mb-6 text-lg text-white">Industries</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-emerald-400 transition-colors">
                    Automotive
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400 transition-colors">
                    Aerospace
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400 transition-colors">
                    Medical Devices
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                    Consumer Products
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-lg text-white">Contact</h3>
              <div className="space-y-3 text-gray-400">
                <p>manufacturing@reyal.in</p>
                <p>+91 98765 43210</p>
                <p>Mumbai, Maharashtra</p>
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
            <p>© 2024 REYAL 3D Printing. All rights reserved. Professional manufacturing solutions.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
