import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sanitizeInput } from '@/lib/middleware/security'
import { z } from 'zod'

const calculateCostSchema = z.object({
  fileId: z.string().uuid(),
  settings: z.object({
    material: z.string().min(1),
    color: z.string().min(1),
    quality: z.enum(['draft', 'standard', 'high', 'ultra']),
    infill: z.number().min(5).max(100),
    supports: z.boolean(),
    postProcessing: z.boolean(),
    urgency: z.enum(['standard', 'express', 'rush']),
    printerModel: z.string().optional(),
    layerHeight: z.number().optional(),
    raft: z.boolean().optional(),
    brim: z.boolean().optional(),
  }),
  profitMargin: z.number().min(0).max(1).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const sanitizedBody = sanitizeInput(body)
    
    let validatedData
    try {
      validatedData = calculateCostSchema.parse(sanitizedBody)
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

    // Get and verify file ownership
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', validatedData.fileId)
      .eq('user_id', userId)
      .single()

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      )
    }

    if (!file.is_analyzed || !file.analysis) {
      return NextResponse.json(
        { error: 'File analysis is not complete. Please wait and try again.' },
        { status: 400 }
      )
    }

    // Check if analysis contains error
    if (file.analysis.error) {
      return NextResponse.json(
        { error: 'File analysis failed. Please re-upload the file.' },
        { status: 400 }
      )
    }

    const analysis = file.analysis as {
      volume: number
      surfaceArea: number
      supportRequired: boolean
      printTime: number
      complexity?: number
      triangleCount?: number
      vertexCount?: number
    }

    // Get pricing configuration from database
    const { data: pricing, error: pricingError } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (pricingError || !pricing) {
      return NextResponse.json(
        { error: 'Pricing configuration not found' },
        { status: 500 }
      )
    }

    // Get material pricing
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('code', validatedData.settings.material)
      .eq('available', true)
      .single()

    if (materialError || !material) {
      return NextResponse.json(
        { error: 'Material not found or unavailable' },
        { status: 404 }
      )
    }

    // Validate settings against material compatibility
    const materialSettings = material.print_settings || {}
    if (materialSettings.max_infill && validatedData.settings.infill > materialSettings.max_infill) {
      return NextResponse.json(
        { 
          error: 'Invalid settings',
          details: [`Infill percentage too high for ${material.name}. Maximum allowed: ${materialSettings.max_infill}%`]
        },
        { status: 400 }
      )
    }

    // Get printer information
    const { data: printer, error: printerError } = await supabase
      .from('printers')
      .select('*')
      .eq('model', validatedData.settings.printerModel || 'A1')
      .eq('is_active', true)
      .single()

    if (printerError || !printer) {
      return NextResponse.json(
        { error: 'Printer not found or unavailable' },
        { status: 404 }
      )
    }

    // Calculate cost with caching
    const cacheKey = `cost_${validatedData.fileId}_${JSON.stringify(validatedData.settings)}_${pricing.updated_at}`
    
    // Try to get from cache first (implement Redis in production)
    const cachedResult = await getCachedCost(cacheKey)
    if (cachedResult) {
      return NextResponse.json({
        success: true,
        data: cachedResult,
        cached: true,
      })
    }

    // Financial calculation with proper business logic
    const qualityMultiplier = pricing.quality_multipliers[validatedData.settings.quality] || 1.0
    const urgencyMultiplier = pricing.urgency_multipliers[validatedData.settings.urgency] || 1.0
    const infillMultiplier = 1 + (validatedData.settings.infill / 100) * 0.5
    const complexityMultiplier = 1 + (analysis.supportRequired ? 0.3 : 0)

    // Calculate material consumption
    const materialVolume = analysis.volume * (validatedData.settings.infill / 100)
    const supportVolume = analysis.supportRequired && validatedData.settings.supports 
      ? analysis.volume * 0.15 
      : 0
    const totalMaterialVolume = materialVolume + supportVolume
    const materialWeight = totalMaterialVolume * material.density
    const materialCost = materialWeight * material.price_per_gram

    // Calculate print time with quality and complexity factors
    const basePrintTime = analysis.printTime * qualityMultiplier * infillMultiplier * complexityMultiplier
    const totalPrintTime = Math.max(0.5, basePrintTime)

    // Machine operation costs
    const machineCost = totalPrintTime * printer.hourly_rate
    const electricityCost = totalPrintTime * (printer.power_consumption || 400) * 0.008 / 1000
    const setupCost = printer.setup_cost || 25

    // Labor costs
    const operatorTime = Math.max(0.25, totalPrintTime * 0.1)
    const qualityCheckTime = validatedData.settings.postProcessing ? 0.5 : 0.25
    const totalLaborTime = operatorTime + qualityCheckTime
    const laborCost = totalLaborTime * pricing.base_labor_rate

    // Post-processing costs
    const postProcessingCost = validatedData.settings.postProcessing 
      ? material.price_per_hour * 0.5 + 50
      : 0

    // Support material costs
    const supportCost = analysis.supportRequired && validatedData.settings.supports
      ? supportVolume * material.density * material.price_per_gram * 1.2
      : 0

    // Calculate base cost
    const baseCost = materialCost + supportCost + machineCost + electricityCost + 
                    setupCost + laborCost + postProcessingCost

    // Apply urgency multiplier
    const urgencyCost = baseCost * (urgencyMultiplier - 1)
    const subtotalBeforeMargin = baseCost + urgencyCost

    // Apply profit margin
    const profitMargin = subtotalBeforeMargin * pricing.profit_margin
    const subtotalAfterMargin = subtotalBeforeMargin + profitMargin

    // Calculate taxes
    const taxes = subtotalAfterMargin * pricing.tax_rate

    // Final total
    const total = subtotalAfterMargin + taxes

    // Calculate delivery time
    const baseDeliveryDays = Math.ceil(totalPrintTime / 16)
    const qualityDelay = validatedData.settings.quality === 'ultra' ? 1 : 0
    const postProcessingDelay = validatedData.settings.postProcessing ? 1 : 0
    const urgencyReduction = validatedData.settings.urgency === 'rush' ? -1 : 
                            validatedData.settings.urgency === 'express' ? -0.5 : 0
    const estimatedDays = Math.max(1, baseDeliveryDays + qualityDelay + postProcessingDelay + urgencyReduction)

    const costBreakdown = {
      materialCost: Math.round(materialCost * 100) / 100,
      supportCost: Math.round(supportCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      machineTime: Math.round(machineCost * 100) / 100,
      electricityCost: Math.round(electricityCost * 100) / 100,
      postProcessingCost: Math.round(postProcessingCost * 100) / 100,
      urgencyCost: Math.round(urgencyCost * 100) / 100,
      baseCost: Math.round(baseCost * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      taxes: Math.round(taxes * 100) / 100,
      total: Math.round(total * 100) / 100
    }

    const result = {
      costBreakdown,
      estimatedDays,
      printTime: Math.round(totalPrintTime * 10) / 10,
      material: material.name,
      printerModel: printer.name,
      materialWeight: Math.round(materialWeight * 100) / 100,
      analysisDetails: {
        volume: analysis.volume,
        surfaceArea: analysis.surfaceArea,
        supportRequired: analysis.supportRequired,
        complexity: analysis.complexity || 1
      },
      multipliers: {
        quality: qualityMultiplier,
        urgency: urgencyMultiplier,
        infill: infillMultiplier,
        complexity: complexityMultiplier
      }
    }

    // Cache result for 1 hour
    await setCachedCost(cacheKey, result, 3600)

    // Log detailed activity for business intelligence
    await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action: 'cost_calculation',
        resource_type: 'file',
        resource_id: validatedData.fileId,
        metadata: {
          settings: validatedData.settings,
          costBreakdown,
          printTime: result.printTime,
          materialWeight: result.materialWeight,
          printer: printer.name,
          material: material.name,
          analysisDetails: result.analysisDetails,
          multipliers: result.multipliers
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Cost calculation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Cache implementation (use Redis in production)
async function getCachedCost(key: string): Promise<any | null> {
  // Implement Redis caching in production
  return null
}

async function setCachedCost(key: string, data: any, ttl: number): Promise<void> {
  // Implement Redis caching in production
}

export const runtime = 'nodejs'
