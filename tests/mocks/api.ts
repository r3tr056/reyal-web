/**
 * Mock Service Worker setup for API testing
 */
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  }
}

const mockFile = {
  id: 'file-123',
  user_id: 'user-123',
  filename: 'test-model.stl',
  original_filename: 'test-model.stl',
  file_path: '/uploads/user-123/test-model.stl',
  file_size: 1024000,
  file_type: '.stl',
  mime_type: 'application/vnd.ms-pki.stl',
  is_analyzed: false,
  analysis: null,
  created_at: new Date().toISOString()
}

const mockAnalysis = {
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
  }
}

const mockMaterial = {
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
    strength: 'Medium'
  },
  created_at: new Date().toISOString()
}

const mockQuote = {
  id: 'quote-123',
  user_id: 'user-123',
  file_id: 'file-123',
  quote_number: 'Q20241216-0001',
  settings: {
    material: 'PLA',
    color: 'white',
    quality: 'standard',
    infill: 20,
    supports: true,
    postProcessing: false,
    urgency: 'standard'
  },
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
  updated_at: new Date().toISOString()
}

const mockOrder = {
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
  updated_at: new Date().toISOString()
}

const mockCartItem = {
  id: 'cart-123',
  user_id: 'user-123',
  quote_id: 'quote-123',
  quantity: 1,
  created_at: new Date().toISOString(),
  quote: mockQuote
}

// Define handlers for each API endpoint
export const handlers = [
  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: 'test'
    })
  }),

  // Upload file
  http.post('/api/upload', async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return HttpResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.size > 50 * 1024 * 1024) {
      return HttpResponse.json(
        { error: 'File too large. Maximum size: 50MB' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      file: mockFile
    })
  }),

  // Analyze file
  http.post('/api/analyze/:fileId', ({ params }) => {
    if (params.fileId !== 'file-123') {
      return HttpResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      analysis: mockAnalysis
    })
  }),

  // Calculate cost
  http.post('/api/calculate-cost', async ({ request }) => {
    const body = await request.json()
    const { fileId, settings } = body

    if (!fileId || !settings) {
      return HttpResponse.json(
        { error: 'Missing required fields: fileId and settings' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      costBreakdown: mockQuote.cost_breakdown,
      estimatedDays: 5,
      material: {
        name: mockMaterial.name,
        properties: mockMaterial.properties
      }
    })
  }),

  // Generate quote
  http.post('/api/generate-quote', async ({ request }) => {
    const body = await request.json()
    const { fileId, settings, costBreakdown } = body

    if (!fileId || !settings || !costBreakdown) {
      return HttpResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      quote: mockQuote
    })
  }),

  // Materials
  http.get('/api/materials', () => {
    return HttpResponse.json({
      success: true,
      materials: [mockMaterial]
    })
  }),

  // Cart operations
  http.get('/api/cart', () => {
    return HttpResponse.json({
      success: true,
      items: [mockCartItem]
    })
  }),

  http.post('/api/cart', async ({ request }) => {
    const body = await request.json()
    const { quoteId, quantity } = body

    if (!quoteId) {
      return HttpResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      item: {
        ...mockCartItem,
        quote_id: quoteId,
        quantity: quantity || 1
      }
    })
  }),

  http.delete('/api/cart', async ({ request }) => {
    const url = new URL(request.url)
    const itemId = url.searchParams.get('itemId')

    if (!itemId) {
      return HttpResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      message: 'Item removed from cart'
    })
  }),

  // Orders
  http.get('/api/orders', () => {
    return HttpResponse.json({
      success: true,
      orders: [mockOrder]
    })
  }),

  http.post('/api/orders', async ({ request }) => {
    const body = await request.json()
    const { cartItems, shippingAddress, paymentMethod } = body

    if (!cartItems || !shippingAddress) {
      return HttpResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      order: mockOrder
    })
  }),

  // Quotes
  http.get('/api/quotes', () => {
    return HttpResponse.json({
      success: true,
      quotes: [mockQuote]
    })
  })
]

// Setup server
export const server = setupServer(...handlers)

// Export mock data for tests
export {
  mockUser,
  mockFile,
  mockAnalysis,
  mockMaterial,
  mockQuote,
  mockOrder,
  mockCartItem
}