import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CostCalculator, PrintSettings } from '@/lib/upload/cost-calculator'

export async function POST(request: NextRequest) {
  try {
    const { supabase } = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fileId, settings, profitMargin = 0.35 } = body

    if (!fileId || !settings) {
      return NextResponse.json({ 
        error: 'Missing required fields: fileId and settings' 
      }, { status: 400 })
    }

    if (profitMargin < 0 || profitMargin > 1) {
      return NextResponse.json({ 
        error: 'Profit margin must be between 0 and 1 (0% to 100%)' 
      }, { status: 400 })
    }

    const settingsValidation = CostCalculator.validateSettings(settings as PrintSettings)
    if (!settingsValidation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid print settings', 
        details: settingsValidation.errors 
      }, { status: 400 })
    }

    const { data: fileRecord, error: fileError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (fileError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (fileRecord.status !== 'analyzed' || !fileRecord.analysis_data) {
      return NextResponse.json({ 
        error: 'File must be analyzed before calculating cost' 
      }, { status: 400 })
    }

    const analysis = fileRecord.analysis_data
    const costBreakdown = CostCalculator.calculateCost(
      analysis.volume,
      analysis.surfaceArea,
      analysis.printTime,
      settings as PrintSettings,
      analysis.supportRequired,
      profitMargin
    )

    const material = CostCalculator.getMaterial(settings.material)
    const estimatedDays = CostCalculator.estimateDelivery(
      settings.urgency,
      material?.postProcessing.required && settings.postProcessing
    )

    const recommendedPrinter = CostCalculator.getRecommendedPrinter(settings.material, settings.urgency)
    const bambuProfile = CostCalculator.getBambuMaterialProfile(settings.material)

    return NextResponse.json({
      success: true,
      costBreakdown,
      estimatedDays,
      printerRecommendation: {
        model: recommendedPrinter.model,
        reason: recommendedPrinter.enclosedChamber ? 'Enclosed chamber required for this material' : 'Standard printing suitable'
      },
      bambuProfile,
      analysis: {
        volume: analysis.volume,
        surfaceArea: analysis.surfaceArea,
        dimensions: analysis.dimensions,
        complexity: analysis.complexity,
        supportRequired: analysis.supportRequired,
        printTime: analysis.printTime
      }
    })

  } catch (error) {
    console.error('Cost calculation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}