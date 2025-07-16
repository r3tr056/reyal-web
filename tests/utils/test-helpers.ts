import { FileAnalysis, PrintSettings, Material, Quote, Order, CartItem } from '@/lib/types'

// Mock data factories for testing
export const createMockFileAnalysis = (overrides?: Partial<FileAnalysis>): FileAnalysis => ({
  volume: 10.5,
  surfaceArea: 50.2,
  dimensions: { x: 5, y: 5, z: 2 },
  complexity: 0.7,
  supportRequired: true,
  printTime: 120,
  triangleCount: 1000,
  vertexCount: 500,
  boundingBox: {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 5, y: 5, z: 2 }
  },
  ...overrides
})

export const createMockPrintSettings = (overrides?: Partial<PrintSettings>): PrintSettings => ({
  material: 'PLA',
  color: 'white',
  quality: 'standard',
  infill: 20,
  supports: true,
  postProcessing: false,
  urgency: 'standard',
  ...overrides
})

export const createMockMaterial = (overrides?: Partial<Material>): Material => ({
  id: 'mat-1',
  name: 'PLA',
  code: 'PLA',
  description: 'Polylactic Acid',
  price_per_hour: 100,
  price_per_gram: 0.5,
  density: 1.24,
  available: true,
  properties: {
    temperature: '190-220°C',
    bed_temperature: '60°C',
    strength: 'Medium',
    flexibility: 'Low',
    difficulty: 'Easy'
  },
  created_at: new Date().toISOString(),
  ...overrides
})

export const createMockQuote = (overrides?: Partial<Quote>): Quote => ({
  id: 'quote-123',
  user_id: 'user-123',
  file_id: 'file-123',
  quote_number: 'Q20241216-0001',
  settings: createMockPrintSettings(),
  cost_breakdown: {
    materialCost: 10.5,
    supportCost: 2.1,
    laborCost: 70,
    machineTime: 200,
    postProcessingCost: 0,
    urgencyCost: 0,
    baseCost: 282.6,
    taxes: 50.87,
    total: 333.47
  },
  total_cost: 333.47,
  estimated_days: 5,
  status: 'pending',
  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

export const createMockOrder = (overrides?: Partial<Order>): Order => ({
  id: 'order-123',
  user_id: 'user-123',
  order_number: 'ORD20241216-0001',
  status: 'pending',
  total_amount: 333.47,
  payment_status: 'pending',
  payment_method: null,
  payment_id: null,
  shipping_address: {
    full_name: 'Test User',
    address_line_1: '123 Test Street',
    address_line_2: '',
    city: 'Test City',
    state: 'Test State',
    postal_code: '12345',
    country: 'India',
    phone: '+91 9876543210'
  },
  notes: null,
  estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  actual_delivery: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

export const createMockCartItem = (overrides?: Partial<CartItem>): CartItem => ({
  id: 'cart-123',
  user_id: 'user-123',
  quote_id: 'quote-123',
  quantity: 1,
  created_at: new Date().toISOString(),
  quote: createMockQuote(),
  ...overrides
})

// Test utilities
export const generateQuoteNumber = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const sequence = '0001' // In real app, this would be incremented
  return `Q${year}${month}${day}-${sequence}`
}

export const generateOrderNumber = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const sequence = '0001' // In real app, this would be incremented
  return `ORD${year}${month}${day}-${sequence}`
}

export const calculateExpectedCost = (
  analysis: FileAnalysis,
  settings: PrintSettings,
  material: Material
) => {
  const qualityMultipliers = {
    draft: 0.7,
    standard: 1.0,
    high: 1.4,
    ultra: 2.0
  }

  const urgencyMultipliers = {
    standard: 1.0,
    express: 1.5,
    rush: 2.5
  }

  const printTimeHours = analysis.printTime / 60
  const qualityMultiplier = qualityMultipliers[settings.quality]
  const infillMultiplier = 1 + (settings.infill / 100) * 0.3
  const urgencyMultiplier = urgencyMultipliers[settings.urgency]

  const materialVolumeCm3 = analysis.volume * (settings.infill / 100)
  const materialWeightG = materialVolumeCm3 * (material.density || 1.24)
  const materialCost = (materialWeightG / 1000) * (material.price_per_gram || material.price_per_hour * 0.1)

  const supportCost = settings.supports && analysis.supportRequired 
    ? materialCost * 0.2 
    : 0

  const adjustedPrintTime = printTimeHours * qualityMultiplier * infillMultiplier
  const machineTime = adjustedPrintTime * material.price_per_hour
  const laborCost = 50 + (adjustedPrintTime * 10)

  const postProcessingCost = settings.postProcessing 
    ? materialCost * 0.3 + 100 
    : 0

  const baseCost = materialCost + supportCost + machineTime + laborCost + postProcessingCost
  const urgencyCost = baseCost * (urgencyMultiplier - 1)
  const subtotal = baseCost + urgencyCost
  const taxes = subtotal * 0.18
  const total = subtotal + taxes

  return {
    materialCost: Math.round(materialCost * 100) / 100,
    supportCost: Math.round(supportCost * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
    machineTime: Math.round(machineTime * 100) / 100,
    postProcessingCost: Math.round(postProcessingCost * 100) / 100,
    urgencyCost: Math.round(urgencyCost * 100) / 100,
    baseCost: Math.round(baseCost * 100) / 100,
    taxes: Math.round(taxes * 100) / 100,
    total: Math.round(total * 100) / 100
  }
}

// Mock file utilities
export const createMockFile = (
  filename: string = 'test.stl',
  size: number = 1024,
  type: string = 'application/vnd.ms-pki.stl'
): File => {
  return new File(['mock content'], filename, { type, size })
}

export const createMockFormData = (file: File): FormData => {
  const formData = new FormData()
  formData.append('file', file)
  return formData
}

// API response helpers
export const createMockApiResponse = <T>(data: T, success: boolean = true) => ({
  success,
  data,
  error: success ? undefined : 'Mock error message'
})

export const createMockErrorResponse = (error: string) => ({
  success: false,
  error
})

// Date utilities for testing
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export const isValidDateString = (dateString: string): boolean => {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

// Validation helpers
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
  return phoneRegex.test(phone)
}

export const isValidPostalCode = (postalCode: string): boolean => {
  const indiaPostalCodeRegex = /^\d{6}$/
  return indiaPostalCodeRegex.test(postalCode)
}

// Test setup helpers
export const mockSupabaseResponse = <T>(data: T) => ({
  data,
  error: null
})

export const mockSupabaseError = (message: string) => ({
  data: null,
  error: { message }
})

export const mockAuthUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  },
  ...overrides
})

// Component testing helpers
export const mockComponent = (name: string) => {
  return function MockComponent(props: any) {
    return <div data-testid={`mock-${name.toLowerCase()}`} {...props} />
  }
}

// API testing helpers
export const mockFetch = (response: any, status: number = 200) => {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response))
  })
}

export const mockFetchError = (error: string) => {
  return jest.fn().mockRejectedValue(new Error(error))
}