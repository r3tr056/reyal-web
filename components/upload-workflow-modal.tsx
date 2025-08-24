"use client"

import { useCallback, useState, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import {
  Upload,
  FileText,
  Calculator,
  Loader2,
  AlertCircle,
  Receipt,
  CheckCircle,
  Settings
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { useRouter } from "next/navigation"
import { CostBreakdown, PrintSettings, Quote } from "@/lib/types"
import { selectActivePrinters, selectAvailableColors, selectAvailableMaterials } from "@/lib/store/slices/appConfigSlice"
import { analyzeFile, calculateCost, generateQuote, selectCurrentUploadSession, selectUploadProgress, selectHomepageSession, setCurrentFiles, setDragActive, uploadFile, resetUploadFlow as resetUploadFlowAction, resetHomepageSession } from "@/lib/store/slices/uploadSlice"

interface UploadWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UploadWorkflowModal({ isOpen, onClose }: UploadWorkflowModalProps) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  
  const { user } = useAppSelector(state => state.auth)
  const printers = useAppSelector(selectActivePrinters)
  const materials = useAppSelector(selectAvailableMaterials)
  const colors = useAppSelector(selectAvailableColors)
  
  const uploadSession = useAppSelector(selectCurrentUploadSession)
  const uploadProgress = useAppSelector(selectUploadProgress)
  const homepageSession = useAppSelector(selectHomepageSession)
  const { error: uploadError } = useAppSelector(state => state.upload)

  const [uploadMethod, setUploadMethod] = useState<"device" | "url">("device")
  const [fileUrl, setFileUrl] = useState("")
  const [uploadStep, setUploadStep] = useState(1)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    material: '',
    color: '',
    quality: 'standard' as const,
    infill: 20,
    supports: false,
    postProcessing: false,
    urgency: 'standard' as const,
    printerModel: ''
  })
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [estimatedDays, setEstimatedDays] = useState(3)

  const getRecommendedPrinter = useCallback(() => {
    if (!printers.length) return null
    
    const material = printSettings.material
    const hasMultiMaterial = printSettings.supports && material !== 'pva-support'
    
    // Find X1C if available for complex materials/features
    const x1c = printers.find(p => p.model.toLowerCase().includes('x1'))
    const a1 = printers.find(p => p.model.toLowerCase().includes('a1'))
    
    if (['abs-cf', 'petg-cf', 'tpu'].includes(material) || hasMultiMaterial) {
      return x1c || printers[0]
    }
    
    return printers.find(p => p.id === printSettings.printerModel) || a1 || printers[0]
  }, [printers, printSettings])
  
  const resetUploadFlow = () => {
    setUploadStep(1)
    setCostBreakdown(null)
    setQuote(null)
    setAnalysisProgress(0)
    setFileUrl("")
    dispatch(resetUploadFlowAction())
  }
  
  const isUploading = uploadProgress.uploading || false
  const isAnalyzing = uploadProgress.analyzing || false
  const isCalculating = uploadProgress.calculating || false
  const isGeneratingQuote = uploadProgress.generatingQuote || false
  const uploadedFile = uploadSession.uploadedFile
  const fileAnalysis = uploadSession.fileAnalysis

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/?upload=true'))
      return
    }

    dispatch(setCurrentFiles(acceptedFiles))
    
    try {
      const result = await dispatch(uploadFile(file)).unwrap()
      setUploadStep(2)
      await dispatch(analyzeFile(result.id))
      setUploadStep(3)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }, [user, dispatch, router])

  const handleCalculateCost = async () => {
    if (!uploadedFile) return
    
    try {
      const result = await dispatch(calculateCost({
        fileId: uploadedFile.id,
        settings: printSettings
      })).unwrap()
      setCostBreakdown(result.costBreakdown)
      setEstimatedDays(result.estimatedDays)
      setUploadStep(4)
    } catch (error) {
      console.error('Cost calculation failed:', error)
    }
  }

  const handleGenerateQuote = async () => {
    if (!uploadedFile) return
    
    try {
      const result = await dispatch(generateQuote({
        fileId: uploadedFile.id,
        settings: printSettings
      })).unwrap()
      setQuote(result)
      setUploadStep(5)
    } catch (error) {
      console.error('Quote generation failed:', error)
    }
  }

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

  // Handle homepage session transfer
  useEffect(() => {
    if (isOpen && homepageSession.isHomepageSession && homepageSession.homepageEstimate) {
      // Pre-fill print settings from homepage estimate data
      const homepageData = homepageSession.homepageEstimateData
      // The transfer was already done in the Redux action, so we just need to ensure the workflow starts properly
      
      // If we have a file uploaded but haven't analyzed it yet, start analysis
      if (uploadSession.uploadedFile && !uploadSession.fileAnalysis) {
        dispatch(analyzeFile(uploadSession.uploadedFile.id))
      }
    }
  }, [isOpen, homepageSession, uploadSession, dispatch])

  const handleClose = () => {
    resetUploadFlow()
    // Reset homepage session when closing
    if (homepageSession.isHomepageSession) {
      dispatch(resetHomepageSession())
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl bg-gray-800 border-gray-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white flex items-center">
            <Upload className="h-6 w-6 mr-3 text-emerald-400" />
            3D Printing Workflow - Bambu Labs
            {homepageSession.isHomepageSession && (
              <Badge className="ml-3 bg-emerald-600 text-white">
                Homepage Session
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {homepageSession.isHomepageSession 
              ? "Continue from your homepage estimate with pre-filled settings"
              : "Complete workflow from upload to quote generation using professional Bambu Lab printers"
            }
          </DialogDescription>
        </DialogHeader>

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
                    <p className="text-sm text-gray-400 mb-4">Supports STL, OBJ, 3MF, PLY files up to 50MB</p>
                    <div className="flex items-center justify-center space-x-4 text-sm">
                      <Badge variant="secondary">Bambu A1 Ready</Badge>
                      <Badge variant="secondary">X1C Compatible</Badge>
                    </div>
                  </div>
                )}
              </div>
              {isUploading && (
                <div className="mt-4 flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading to secure server...</span>
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
                    console.log("Upload from URL:", fileUrl)
                  }}
                >
                  Import from URL
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {uploadStep === 2 && (
          <Card className="bg-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5" />
                Analyzing Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-white">{uploadedFile?.original_filename}</p>
                    <p className="text-sm text-gray-400">
                      {uploadedFile ? (uploadedFile.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Processing...'}
                    </p>
                  </div>
                  {isAnalyzing && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing geometry...</span>
                    </div>
                  )}
                </div>
                
                {isAnalyzing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Analysis Progress</span>
                      <span>{analysisProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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

                <div className="mt-4 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-emerald-400" />
                    <span className="font-medium text-emerald-400">Recommended Printer</span>
                  </div>
                  <p className="text-white">{getRecommendedPrinter()?.name}</p>
                  <p className="text-sm text-gray-400">{getRecommendedPrinter()?.description}</p>
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
                    <Label htmlFor="printerModel" className="text-gray-300">Printer Model</Label>
                    <Select
                      value={printSettings.printerModel}
                      onValueChange={(value) => setPrintSettings(prev => ({ ...prev, printerModel: value }))}
                    >
                      <SelectTrigger className="bg-gray-600 border-gray-500 text-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {printers.map((printer) => (
                          <SelectItem key={printer.id} value={printer.id} className="text-gray-300">
                            <div>
                              <div className="font-medium">{printer.name}</div>
                              <div className="text-sm text-gray-400">{printer.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                        {materials.filter(m => m.available).map((material) => (
                          <SelectItem key={material.code} value={material.code} className="text-gray-300">
                            <div>
                              <div className="font-medium">{material.name}</div>
                              <div className="text-sm text-gray-400">₹{material.price_per_hour}/hour</div>
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
                          <SelectItem key={color.id} value={color.name} className="text-gray-300">
                            {color.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quality" className="text-gray-300">Print Quality</Label>
                    <Select
                      value={printSettings.quality}
                      onValueChange={(value: 'draft' | 'standard' | 'high' | 'ultra') => setPrintSettings(prev => ({ ...prev, quality: value }))}
                    >
                      <SelectTrigger className="bg-gray-600 border-gray-500 text-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="draft" className="text-gray-300">Draft (0.3mm - Fast)</SelectItem>
                        <SelectItem value="standard" className="text-gray-300">Standard (0.2mm - Balanced)</SelectItem>
                        <SelectItem value="high" className="text-gray-300">High (0.15mm - Detailed)</SelectItem>
                        <SelectItem value="ultra" className="text-gray-300">Ultra (0.1mm - Maximum Detail)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="urgency" className="text-gray-300">Delivery</Label>
                    <Select
                      value={printSettings.urgency}
                      onValueChange={(value: 'standard' | 'express' | 'rush') => setPrintSettings(prev => ({ ...prev, urgency: value }))}
                    >
                      <SelectTrigger className="bg-gray-600 border-gray-500 text-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="standard" className="text-gray-300">Standard (3-5 days)</SelectItem>
                        <SelectItem value="express" className="text-gray-300">Express (1-2 days)</SelectItem>
                        <SelectItem value="rush" className="text-gray-300">Rush (Same day)</SelectItem>
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

                <Button 
                  onClick={handleCalculateCost} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700" 
                  disabled={isCalculating}
                >
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
                  <span>₹{costBreakdown.materialCost.toFixed(2)}</span>
                </div>
                {costBreakdown.supportCost > 0 && (
                  <div className="flex justify-between text-gray-300">
                    <span>Support Material</span>
                    <span>₹{costBreakdown.supportCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-300">
                  <span>Machine Time</span>
                  <span>₹{costBreakdown.machineTime.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Labor</span>
                  <span>₹{costBreakdown.laborCost.toFixed(2)}</span>
                </div>
                {costBreakdown.postProcessingCost > 0 && (
                  <div className="flex justify-between text-gray-300">
                    <span>Post-Processing</span>
                    <span>₹{costBreakdown.postProcessingCost.toFixed(2)}</span>
                  </div>
                )}
                {costBreakdown.urgencyCost > 0 && (
                  <div className="flex justify-between text-gray-300">
                    <span>Urgency Fee</span>
                    <span>₹{costBreakdown.urgencyCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-600" />
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>₹{costBreakdown.baseCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>GST (18%)</span>
                  <span>₹{costBreakdown.taxes.toFixed(2)}</span>
                </div>
                <div className="h-px bg-gray-600" />
                <div className="flex justify-between font-bold text-lg text-white">
                  <span>Total</span>
                  <span>₹{costBreakdown.total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
                <p className="text-sm text-emerald-400">
                  <strong>Estimated Delivery:</strong> {estimatedDays} business days to Ghaziabad, UP
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Printed on {getRecommendedPrinter()?.name} at Landcraft Golflinks facility
                </p>
              </div>

              <Button 
                onClick={handleGenerateQuote} 
                className="w-full bg-emerald-600 hover:bg-emerald-700" 
                disabled={isGeneratingQuote}
              >
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
                  <p className="text-3xl font-bold text-white">₹{quote.total_cost.toFixed(2)}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Delivery in {quote.estimated_days} business days
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3 text-white">Quote Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Quote ID:</span>
                    <span className="font-mono">{quote.quote_number}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Valid Until:</span>
                    <span>{new Date(quote.valid_until).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Material:</span>
                    <span>{materials.find(m => m.code === quote.settings.material)?.name}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Quality:</span>
                    <span className="capitalize">{quote.settings.quality}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Printer:</span>
                    <span>{getRecommendedPrinter()?.name}</span>
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
            Powered by Bambu Labs A1 & X1C Printers
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
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
  )
}
