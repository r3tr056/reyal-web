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
import { 
  Settings, 
  DollarSign, 
  Printer, 
  Package, 
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface BusinessSettings {
  profitMargin: number
  taxRate: number
  currency: string
  defaultPrintSpeed: string
  autoQuoteApproval: boolean
  maxFileSize: number
  supportedFormats: string[]
  businessHours: string
  contactEmail: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>({
    profitMargin: 0.35,
    taxRate: 0.08,
    currency: 'USD',
    defaultPrintSpeed: 'standard',
    autoQuoteApproval: false,
    maxFileSize: 100,
    supportedFormats: ['stl', 'obj', '3mf', 'ply'],
    businessHours: '9:00 AM - 6:00 PM',
    contactEmail: ''
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Load profit margin
      const response = await fetch('/api/admin/profit-margin')
      const data = await response.json()
      
      if (data.success) {
        setSettings(prev => ({
          ...prev,
          profitMargin: data.profitMargin
        }))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      // Save profit margin
      const response = await fetch('/api/admin/profit-margin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profitMargin: settings.profitMargin })
      })

      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your 3D printing business settings
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="printing">Printing</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="profit-margin">Profit Margin (%)</Label>
                  <Input
                    id="profit-margin"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={(settings.profitMargin * 100).toFixed(1)}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profitMargin: parseFloat(e.target.value) / 100
                    }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Current margin: {(settings.profitMargin * 100).toFixed(1)}% 
                    (${(settings.profitMargin * 10).toFixed(2)} profit per $10 material cost)
                  </p>
                </div>

                <div>
                  <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                  <Input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={(settings.taxRate * 100).toFixed(1)}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      taxRate: parseFloat(e.target.value) / 100
                    }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={settings.currency} 
                    onValueChange={(value) => setSettings(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Pricing Preview Example</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Material Cost:</span>
                    <span>$10.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Labor Cost:</span>
                    <span>$5.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Base Cost:</span>
                    <span>$15.00</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Profit ({(settings.profitMargin * 100).toFixed(1)}%):</span>
                    <span>+${(15 * settings.profitMargin).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${(15 * (1 + settings.profitMargin)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({(settings.taxRate * 100).toFixed(1)}%):</span>
                    <span>+${(15 * (1 + settings.profitMargin) * settings.taxRate).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total:</span>
                    <span>${(15 * (1 + settings.profitMargin) * (1 + settings.taxRate)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Printing Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="print-speed">Default Print Speed</Label>
                  <Select 
                    value={settings.defaultPrintSpeed} 
                    onValueChange={(value) => setSettings(prev => ({ ...prev, defaultPrintSpeed: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft (Fast, Lower Quality)</SelectItem>
                      <SelectItem value="standard">Standard (Balanced)</SelectItem>
                      <SelectItem value="fine">Fine (Slow, High Quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-approval">Auto Quote Approval</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically approve quotes under $50
                    </p>
                  </div>
                  <Switch
                    id="auto-approval"
                    checked={settings.autoQuoteApproval}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoQuoteApproval: checked }))}
                  />
                </div>
              </div>

              {/* Bambu Lab Printer Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Bambu Lab Printer Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium">A1 Mini Settings</h5>
                    <div className="text-sm text-muted-foreground mt-2">
                      <div>Build Volume: 180×180×180mm</div>
                      <div>Layer Height: 0.2mm default</div>
                      <div>Print Speed: 300mm/s max</div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium">X1 Carbon Settings</h5>
                    <div className="text-sm text-muted-foreground mt-2">
                      <div>Build Volume: 256×256×256mm</div>
                      <div>Layer Height: 0.1-0.3mm</div>
                      <div>Print Speed: 500mm/s max</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                File Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="max-file-size">Maximum File Size (MB)</Label>
                  <Input
                    id="max-file-size"
                    type="number"
                    min="1"
                    max="1000"
                    value={settings.maxFileSize}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      maxFileSize: parseInt(e.target.value)
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Supported File Formats</Label>
                <div className="mt-2 space-y-2">
                  {['stl', 'obj', '3mf', 'ply', 'gcode'].map((format) => (
                    <div key={format} className="flex items-center space-x-2">
                      <Switch
                        id={format}
                        checked={settings.supportedFormats.includes(format)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSettings(prev => ({
                              ...prev,
                              supportedFormats: [...prev.supportedFormats, format]
                            }))
                          } else {
                            setSettings(prev => ({
                              ...prev,
                              supportedFormats: prev.supportedFormats.filter(f => f !== format)
                            }))
                          }
                        }}
                      />
                      <Label htmlFor={format} className="text-sm uppercase">
                        .{format}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="business-hours">Business Hours</Label>
                  <Input
                    id="business-hours"
                    value={settings.businessHours}
                    onChange={(e) => setSettings(prev => ({ ...prev, businessHours: e.target.value }))}
                    placeholder="9:00 AM - 6:00 PM"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="contact-email">Contact Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => setSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="admin@3dprinting.com"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
