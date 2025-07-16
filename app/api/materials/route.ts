import { NextResponse } from 'next/server'
import { CostCalculator } from '@/lib/upload/cost-calculator'

export async function GET() {
  try {
    const materials = CostCalculator.getAllMaterials()
    
    return NextResponse.json({
      success: true,
      materials
    })
  } catch (error) {
    console.error('Materials fetch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
