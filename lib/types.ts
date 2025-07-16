// Database types for the 3D printing service
export interface FileAnalysis {
  volume: number
  surfaceArea: number
  dimensions: { x: number; y: number; z: number }
  complexity: number
  supportRequired: boolean
  printTime: number
  triangleCount: number
  vertexCount: number
  boundingBox: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
}

export interface CostBreakdown {
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

export interface PrintSettings {
  material: string
  color: string
  quality: 'draft' | 'standard' | 'high' | 'ultra'
  infill: number
  supports: boolean
  postProcessing: boolean
  urgency: 'standard' | 'express' | 'rush'
  layerHeight?: number
  raft?: boolean
  brim?: boolean
}

export interface Material {
  id: string
  name: string
  code: string
  description: string | null
  price_per_hour: number
  price_per_gram: number | null
  density: number | null
  available: boolean
  properties: any
  created_at: string
}

export interface UploadedFile {
  id: string
  user_id: string
  original_filename: string
  filename: string
  file_path: string
  file_size: number
  file_type: string
  mime_type: string | null
  analysis: FileAnalysis | null
  is_analyzed: boolean
  created_at: string
}

export interface Quote {
  id: string
  user_id: string
  file_id: string
  quote_number: string
  settings: PrintSettings
  cost_breakdown: CostBreakdown
  total_cost: number
  estimated_days: number
  status: 'pending' | 'approved' | 'expired' | 'converted'
  valid_until: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  order_number: string
  status: 'pending' | 'confirmed' | 'in_production' | 'quality_check' | 'shipped' | 'delivered' | 'cancelled'
  total_amount: number
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method: string | null
  payment_id: string | null
  shipping_address: any
  notes: string | null
  estimated_delivery: string | null
  actual_delivery: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  quote_id: string
  file_id: string
  quantity: number
  unit_price: number
  total_price: number
  settings: PrintSettings
  status: 'pending' | 'in_queue' | 'printing' | 'post_processing' | 'completed' | 'failed'
  print_started_at: string | null
  print_completed_at: string | null
  created_at: string
}

export interface CartItem {
  id: string
  user_id: string
  quote_id: string
  quantity: number
  created_at: string
  quote?: Quote
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  company: string | null
  address: string | null
  city: string | null
  country: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface UploadResponse {
  file: UploadedFile
}

export interface AnalysisResponse {
  analysis: FileAnalysis
}

export interface CostCalculationResponse {
  costBreakdown: CostBreakdown
  estimatedDays: number
}

export interface QuoteResponse {
  quote: Quote
}

// Form types
export interface CheckoutForm {
  shipping_address: {
    full_name: string
    address_line_1: string
    address_line_2?: string
    city: string
    state: string
    postal_code: string
    country: string
    phone: string
  }
  payment_method: 'card' | 'upi' | 'bank_transfer'
  notes?: string
}

export interface ContactForm {
  name: string
  email: string
  phone?: string
  company?: string
  message: string
  subject: string
}

// Admin types
export interface Analytics {
  totalOrders: number
  totalRevenue: number
  activeUsers: number
  avgOrderValue: number
  recentOrders: Order[]
  topMaterials: { material: string; count: number }[]
  monthlyRevenue: { month: string; revenue: number }[]
}