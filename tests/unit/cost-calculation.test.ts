import { FileAnalysis, PrintSettings, CostBreakdown } from '@/lib/types'

// Extract the cost calculation functions for testing
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
  const materialCost = materialWeightG * (material.price_per_gram || material.price_per_hour * 0.1)

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

describe('Cost Calculation Logic', () => {
  const mockAnalysis: FileAnalysis = {
    volume: 10.5, // cm³
    surfaceArea: 50.2,
    dimensions: { x: 5, y: 5, z: 2 },
    complexity: 0.7,
    supportRequired: true,
    printTime: 120, // minutes
    triangleCount: 1000,
    vertexCount: 500,
    boundingBox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 5, y: 5, z: 2 }
    }
  }

  const mockMaterial = {
    name: 'PLA',
    code: 'PLA',
    price_per_hour: 100,
    price_per_gram: 5, // Increased from 0.5 to make costs more visible
    density: 1.24,
    available: true
  }

  describe('calculateCost', () => {
    it('should calculate basic cost correctly for standard settings', () => {
      const settings: PrintSettings = {
        material: 'PLA',
        color: 'white',
        quality: 'standard',
        infill: 20,
        supports: true,
        postProcessing: false,
        urgency: 'standard'
      }

      const result = calculateCost(mockAnalysis, settings, mockMaterial)

      expect(result).toHaveProperty('materialCost')
      expect(result).toHaveProperty('supportCost')
      expect(result).toHaveProperty('laborCost')
      expect(result).toHaveProperty('machineTime')
      expect(result).toHaveProperty('postProcessingCost')
      expect(result).toHaveProperty('urgencyCost')
      expect(result).toHaveProperty('baseCost')
      expect(result).toHaveProperty('taxes')
      expect(result).toHaveProperty('total')

      expect(result.materialCost).toBeGreaterThan(0)
      expect(result.supportCost).toBeGreaterThan(0) // supports enabled
      expect(result.laborCost).toBeGreaterThan(50) // base labor cost
      expect(result.machineTime).toBeGreaterThan(0)
      expect(result.postProcessingCost).toBe(0) // not enabled
      expect(result.urgencyCost).toBe(0) // standard urgency
      expect(result.taxes).toBeGreaterThan(0) // 18% tax
      expect(result.total).toBeGreaterThan(result.baseCost)
    })

    it('should apply quality multipliers correctly', () => {
      const standardSettings: PrintSettings = {
        material: 'PLA',
        color: 'white',
        quality: 'standard',
        infill: 20,
        supports: false,
        postProcessing: false,
        urgency: 'standard'
      }

      const ultraSettings: PrintSettings = {
        ...standardSettings,
        quality: 'ultra'
      }

      const standardCost = calculateCost(mockAnalysis, standardSettings, mockMaterial)
      const ultraCost = calculateCost(mockAnalysis, ultraSettings, mockMaterial)

      expect(ultraCost.machineTime).toBeGreaterThan(standardCost.machineTime)
      expect(ultraCost.total).toBeGreaterThan(standardCost.total)
    })

    it('should apply urgency multipliers correctly', () => {
      const standardSettings: PrintSettings = {
        material: 'PLA',
        color: 'white',
        quality: 'standard',
        infill: 20,
        supports: false,
        postProcessing: false,
        urgency: 'standard'
      }

      const rushSettings: PrintSettings = {
        ...standardSettings,
        urgency: 'rush'
      }

      const standardCost = calculateCost(mockAnalysis, standardSettings, mockMaterial)
      const rushCost = calculateCost(mockAnalysis, rushSettings, mockMaterial)

      expect(rushCost.urgencyCost).toBeGreaterThan(0)
      expect(rushCost.total).toBeGreaterThan(standardCost.total)
    })

    it('should calculate support costs when enabled', () => {
      const withoutSupports: PrintSettings = {
        material: 'PLA',
        color: 'white',
        quality: 'standard',
        infill: 20,
        supports: false,
        postProcessing: false,
        urgency: 'standard'
      }

      const withSupports: PrintSettings = {
        ...withoutSupports,
        supports: true
      }

      const costWithoutSupports = calculateCost(mockAnalysis, withoutSupports, mockMaterial)
      const costWithSupports = calculateCost(mockAnalysis, withSupports, mockMaterial)

      expect(costWithoutSupports.supportCost).toBe(0)
      expect(costWithSupports.supportCost).toBeGreaterThan(0)
    })

    it('should calculate post-processing costs when enabled', () => {
      const withoutProcessing: PrintSettings = {
        material: 'PLA',
        color: 'white',
        quality: 'standard',
        infill: 20,
        supports: false,
        postProcessing: false,
        urgency: 'standard'
      }

      const withProcessing: PrintSettings = {
        ...withoutProcessing,
        postProcessing: true
      }

      const costWithoutProcessing = calculateCost(mockAnalysis, withoutProcessing, mockMaterial)
      const costWithProcessing = calculateCost(mockAnalysis, withProcessing, mockMaterial)

      expect(costWithoutProcessing.postProcessingCost).toBe(0)
      expect(costWithProcessing.postProcessingCost).toBeGreaterThan(0)
    })

    it('should handle different infill percentages', () => {
      const lowInfill: PrintSettings = {
        material: 'PLA',
        color: 'white',
        quality: 'standard',
        infill: 10,
        supports: false,
        postProcessing: false,
        urgency: 'standard'
      }

      const highInfill: PrintSettings = {
        ...lowInfill,
        infill: 100
      }

      const lowInfillCost = calculateCost(mockAnalysis, lowInfill, mockMaterial)
      const highInfillCost = calculateCost(mockAnalysis, highInfill, mockMaterial)

      expect(highInfillCost.materialCost).toBeGreaterThan(lowInfillCost.materialCost)
      expect(highInfillCost.machineTime).toBeGreaterThan(lowInfillCost.machineTime)
    })

    it('should round costs to 2 decimal places', () => {
      const settings: PrintSettings = {
        material: 'PLA',
        color: 'white',
        quality: 'standard',
        infill: 33,
        supports: true,
        postProcessing: true,
        urgency: 'express'
      }

      const result = calculateCost(mockAnalysis, settings, mockMaterial)

      // Check that all costs are rounded to 2 decimal places
      expect(result.materialCost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2)
      expect(result.supportCost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2)
      expect(result.laborCost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2)
      expect(result.machineTime.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2)
      expect(result.total.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2)
    })
  })

  describe('estimateDelivery', () => {
    it('should return correct base delivery times', () => {
      expect(estimateDelivery('standard', false)).toBe(5)
      expect(estimateDelivery('express', false)).toBe(3)
      expect(estimateDelivery('rush', false)).toBe(1)
    })

    it('should add extra day for post-processing', () => {
      expect(estimateDelivery('standard', true)).toBe(6)
      expect(estimateDelivery('express', true)).toBe(4)
      expect(estimateDelivery('rush', true)).toBe(2)
    })

    it('should handle unknown urgency types', () => {
      expect(estimateDelivery('unknown', false)).toBe(5)
      expect(estimateDelivery('unknown', true)).toBe(6)
    })
  })
})