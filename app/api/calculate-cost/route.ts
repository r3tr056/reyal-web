import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CostBreakdown, PrintSettings, FileAnalysis } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fileId, settings } = body

    if (!fileId || !settings) {
      return NextResponse.json({ 
        error: 'Missing required fields: fileId and settings' 
      }, { status: 400 })
    }

    // Get file record from database
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (fileError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (!fileRecord.is_analyzed || !fileRecord.analysis) {
      return NextResponse.json({ 
        error: 'File must be analyzed before calculating cost' 
      }, { status: 400 })
    }

    // Get material data
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('code', settings.material)
      .eq('available', true)
      .single()

    if (materialError || !material) {
      return NextResponse.json({ 
        error: 'Invalid or unavailable material' 
      }, { status: 400 })
    }

    const analysis = fileRecord.analysis as FileAnalysis
    const costBreakdown = calculateCost(analysis, settings, material)
    const estimatedDays = estimateDelivery(settings.urgency, settings.postProcessing)

    return NextResponse.json({
      success: true,
      costBreakdown,
      estimatedDays,
      material: {
        name: material.name,
        properties: material.properties
      }
    })

  } catch (error) {
    console.error('Cost calculation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

function calculateCost(
  analysis: FileAnalysis,
  settings: PrintSettings,
  material: any
): CostBreakdown {
  // Quality multipliers
  const qualityMultipliers = {
    draft: 0.7,
    standard: 1.0,
    high: 1.4,
    ultra: 2.0
  }

  // Urgency multipliers
  const urgencyMultipliers = {
    standard: 1.0,
    express: 1.5,
    rush: 2.5
  }

  // Base calculations
  const printTimeHours = analysis.printTime / 60
  const qualityMultiplier = qualityMultipliers[settings.quality]
  const infillMultiplier = 1 + (settings.infill / 100) * 0.3
  const urgencyMultiplier = urgencyMultipliers[settings.urgency]

  // Material cost (based on volume and density)
  const materialVolumeCm3 = analysis.volume * (settings.infill / 100)
  const materialWeightG = materialVolumeCm3 * (material.density || 1.24)
  const materialCost = (materialWeightG / 1000) * (material.price_per_gram || material.price_per_hour * 0.1)

  // Support material cost
  const supportCost = settings.supports && analysis.supportRequired 
    ? materialCost * 0.2 
    : 0

  // Machine time cost
  const adjustedPrintTime = printTimeHours * qualityMultiplier * infillMultiplier
  const machineTime = adjustedPrintTime * material.price_per_hour

  // Labor cost (setup + monitoring)
  const laborCost = 50 + (adjustedPrintTime * 10)

  // Post-processing cost
  const postProcessingCost = settings.postProcessing 
    ? materialCost * 0.3 + 100 
    : 0

  // Urgency cost
  const baseCost = materialCost + supportCost + machineTime + laborCost + postProcessingCost
  const urgencyCost = baseCost * (urgencyMultiplier - 1)

  // Subtotal
  const subtotal = baseCost + urgencyCost

  // Taxes (18% GST in India)
  const taxes = subtotal * 0.18

  // Total
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

function estimateDelivery(urgency: string, postProcessing: boolean): number {
  const baseDelivery = {
    standard: 5,
    express: 3,
    rush: 1
  }

  let days = baseDelivery[urgency as keyof typeof baseDelivery] || 5
  
  if (postProcessing) {
    days += 1
  }

  return days
}