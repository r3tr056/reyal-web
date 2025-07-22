import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { 
  rateLimit, 
  validateUUID,
  sanitizeInput,
  createSecureResponse,
  logSecurityEvent
} from '@/lib/middleware/api-middleware'
import { API_CONFIG } from '@/lib/config/api'
import { randomUUID } from 'crypto'

const EstimateSchema = z.object({
  material: z.string().min(1).max(50).transform(sanitizeInput),
  quality: z.enum(['draft', 'standard', 'high', 'ultra']),
  infill: z.number().min(5).max(100),
  quantity: z.number().min(1).max(1000),
  location: z.string().uuid(),
  printerModel: z.string().max(100).optional().transform(val => val ? sanitizeInput(val) : val),
  dimensions: z.object({
    x: z.number().positive().max(1000).optional(),
    y: z.number().positive().max(1000).optional(),
    z: z.number().positive().max(1000).optional(),
  }).optional(),
  volume: z.number().positive().max(100000).optional(),
  urgency: z.enum(['standard', 'express', 'rush']).default('standard'),
}).strict()

export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    // Allow unauthenticated access for estimates, but log user if available
    const userId = request.headers.get('x-user-id')
    
    const body = await request.json()
    const sanitizedBody = sanitizeInput(body)
    
    let validatedData
    try {
      validatedData = EstimateSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid request data',
            details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
          },
          { status: 400 }
        )
      }
      throw error
    }

    const supabase = await createServerClient()

    // Get material pricing
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('code', validatedData.material)
      .eq('available', true)
      .single()

    if (materialError || !material) {
      return NextResponse.json(
        { error: 'Material not found or unavailable' },
        { status: 404 }
      )
    }

    // Get delivery location
    const { data: location, error: locationError } = await supabase
      .from('serviceable_locations')
      .select('*')
      .eq('id', validatedData.location)
      .eq('is_active', true)
      .single()

    if (locationError || !location) {
      return NextResponse.json(
        { error: 'Service location not found' },
        { status: 404 }
      )
    }

    // Get printer info if specified
    let printer = null
    if (validatedData.printerModel) {
      const { data: printerData } = await supabase
        .from('printers')
        .select('*')
        .eq('id', validatedData.printerModel)
        .eq('is_active', true)
        .single()
      
      printer = printerData
    }

    // Get pricing multipliers from database
    const { data: pricing } = await supabase
      .from('pricing_config')
      .select('*')
      .single()

    const pricingConfig = pricing || {
      quality_multipliers: {
        draft: 0.7,
        standard: 1.0,
        high: 1.4,
        ultra: 2.0
      },
      urgency_multipliers: {
        standard: 1.0,
        express: 1.5,
        rush: 2.0
      },
      base_labor_rate: 50,
      base_machine_rate: 25,
      tax_rate: 0.18,
      profit_margin: 0.35
    }

    // Calculate estimate
    const urgency = validatedData.urgency || 'standard'
    const qualityMultiplier = pricingConfig.quality_multipliers[validatedData.quality] || 1.0
    const urgencyMultiplier = pricingConfig.urgency_multipliers[urgency] || 1.0
    const infillMultiplier = 1 + (validatedData.infill / 100) * 0.3

    // Estimate volume if not provided (rough estimate for homepage)
    const estimatedVolume = validatedData.volume || (
      validatedData.dimensions 
        ? validatedData.dimensions.x! * validatedData.dimensions.y! * validatedData.dimensions.z! / 1000
        : 10 // Default placeholder volume in cm³
    )

    // Base calculations
    const baseHours = Math.max(1, estimatedVolume * 0.4 * qualityMultiplier * infillMultiplier)
    const materialCost = material.price_per_hour * baseHours
    const laborCost = baseHours * pricingConfig.base_labor_rate
    const machineCost = baseHours * (printer?.hourly_rate || pricingConfig.base_machine_rate)
    
    const baseCost = (materialCost + laborCost + machineCost) * urgencyMultiplier * validatedData.quantity
    const profitMargin = baseCost * pricingConfig.profit_margin
    const subtotal = baseCost + profitMargin
    const taxes = subtotal * pricingConfig.tax_rate
    const total = subtotal + taxes

    // Calculate delivery time
    const qualityDelay = validatedData.quality === 'ultra' ? 1 : 0
    const urgencyReduction = urgency === 'rush' ? -1 : urgency === 'express' ? -0.5 : 0
    const deliveryDays = Math.max(1, location.delivery_days + qualityDelay + urgencyReduction)
    const readyDays = Math.max(1, Math.ceil(baseHours / 24))

    const estimate = {
      price: Math.round(total),
      printTime: Math.round(baseHours),
      readyTime: readyDays,
      deliveryTime: deliveryDays,
      breakdown: {
        materialCost: Math.round(materialCost),
        laborCost: Math.round(laborCost),
        machineCost: Math.round(machineCost),
        baseCost: Math.round(baseCost),
        profitMargin: Math.round(profitMargin),
        taxes: Math.round(taxes),
        total: Math.round(total)
      },
      material: material.name,
      location: location.name,
      printer: printer?.name || 'Auto-selected',
      settings: {
        material: validatedData.material,
        quality: validatedData.quality,
        infill: validatedData.infill,
        quantity: validatedData.quantity,
        urgency
      }
    }

    return createSecureResponse(
      {
        success: true,
        data: estimate
      },
      200,
      requestId
    )

  } catch (error) {
    await logSecurityEvent('INTERNAL_ERROR', {
      endpoint: '/api/estimate',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    })
    
    return createSecureResponse(
      { error: 'Internal server error' },
      500,
      requestId
    )
  }
}