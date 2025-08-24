'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Settings, 
  DollarSign, 
  Printer, 
  Package, 
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  AlertTriangle
} from 'lucide-react'

interface BusinessSettings {
  profitMargin: number
}

interface Material {
  id: string
  name: string
  type: string
  color: string
  price_per_gram: number
  density: number
  available: boolean
  properties: any
}

interface PrinterData {
  id: string
  name: string
  model: string
  max_dimensions: any
  layer_heights: number[]
  supported_materials: string[]
  is_active: boolean
  hourly_rate: number
  setup_cost: number
}

export default function AdminSettingsPage() {
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    profitMargin: 0.35
  })
  
  const [materials, setMaterials] = useState<Material[]>([])
  const [printers, setPrinters] = useState<PrinterData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingMaterials, setLoadingMaterials] = useState(false)
  const [loadingPrinters, setLoadingPrinters] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadAllSettings()
  }, [])

  const loadAllSettings = async () => {
    await Promise.all([
      loadBusinessSettings(),
      loadMaterials(),
      loadPrinters()
    ])
    setLoading(false)
  }

  const loadBusinessSettings = async () => {
    try {
      const response = await fetch('/api/admin/profit-margin')
      const data = await response.json()
      
      if (data.success) {
        setBusinessSettings(prev => ({
          ...prev,
          profitMargin: data.profitMargin
        }))
      }
    } catch (error) {
      console.error('Failed to load business settings:', error)
    }
  }

  const loadMaterials = async () => {
    setLoadingMaterials(true)
    try {
      const response = await fetch('/api/materials')
      const data = await response.json()
      
      if (data.success) {
        setMaterials(data.materials || [])
      }
    } catch (error) {
      console.error('Failed to load materials:', error)
    } finally {
      setLoadingMaterials(false)
    }
  }

  const loadPrinters = async () => {
    setLoadingPrinters(true)
    try {
      const response = await fetch('/api/printers')
      const data = await response.json()
      
      if (data.success) {
        setPrinters(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load printers:', error)
    } finally {
      setLoadingPrinters(false)
    }
  }

  const saveBusinessSettings = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/admin/profit-margin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profitMargin: businessSettings.profitMargin })
      })

      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Settings saved successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button onClick={loadAllSettings} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList>
          <TabsTrigger value="business">
            <DollarSign className="h-4 w-4 mr-2" />
            Business Settings
          </TabsTrigger>
          <TabsTrigger value="materials">
            <Package className="h-4 w-4 mr-2" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="printers">
            <Printer className="h-4 w-4 mr-2" />
            Printers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Business Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profit-margin">Default Profit Margin</Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      id="profit-margin"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={businessSettings.profitMargin}
                      onChange={(e) => setBusinessSettings(prev => ({
                        ...prev,
                        profitMargin: parseFloat(e.target.value) || 0
                      }))}
                      className="max-w-[200px]"
                    />
                    <Badge variant="secondary">
                      {formatPercentage(businessSettings.profitMargin)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The default profit margin applied to all quotes (0.35 = 35%)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Preview Pricing Impact</Label>
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Base Cost:</span>
                        <span className="ml-2">{formatCurrency(100)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Profit Margin:</span>
                        <span className="ml-2">{formatPercentage(businessSettings.profitMargin)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Profit Amount:</span>
                        <span className="ml-2">{formatCurrency(100 * businessSettings.profitMargin)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Final Price:</span>
                        <span className="ml-2 font-bold">{formatCurrency(100 + (100 * businessSettings.profitMargin))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={saveBusinessSettings} 
                  disabled={saving}
                  className="w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Materials Catalog</CardTitle>
              <Button onClick={loadMaterials} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingMaterials ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingMaterials ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Price per Gram</TableHead>
                        <TableHead>Density</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell className="font-medium">
                            {material.name}
                          </TableCell>
                          <TableCell>{material.type}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: material.color }}
                              />
                              {material.color}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(material.price_per_gram)}
                          </TableCell>
                          <TableCell>
                            {material.density} g/cm³
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={material.available ? 'default' : 'secondary'}
                            >
                              {material.available ? 'Available' : 'Unavailable'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {materials.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            No materials found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Printer Fleet</CardTitle>
              <Button onClick={loadPrinters} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingPrinters ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingPrinters ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Max Dimensions</TableHead>
                        <TableHead>Hourly Rate</TableHead>
                        <TableHead>Setup Cost</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {printers.map((printer) => (
                        <TableRow key={printer.id}>
                          <TableCell className="font-medium">
                            {printer.name}
                          </TableCell>
                          <TableCell>{printer.model}</TableCell>
                          <TableCell>
                            {printer.max_dimensions ? (
                              <span className="text-sm font-mono">
                                {printer.max_dimensions.x} × {printer.max_dimensions.y} × {printer.max_dimensions.z} mm
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(printer.hourly_rate)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(printer.setup_cost)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={printer.is_active ? 'default' : 'secondary'}
                            >
                              {printer.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {printers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            No printers found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Total Materials</Label>
              <div className="text-2xl font-bold">{materials.length}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Active Printers</Label>
              <div className="text-2xl font-bold">
                {printers.filter(p => p.is_active).length}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Current Profit Margin</Label>
              <div className="text-2xl font-bold">
                {formatPercentage(businessSettings.profitMargin)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
