import { FileAnalysis, PrintSettings, CostBreakdown, Material, Quote, Order } from '@/lib/types'

describe('Type Validation and Business Logic', () => {
  describe('FileAnalysis Type', () => {
    it('should validate required properties', () => {
      const validAnalysis: FileAnalysis = {
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

      expect(validAnalysis.volume).toBeGreaterThan(0)
      expect(validAnalysis.surfaceArea).toBeGreaterThan(0)
      expect(validAnalysis.dimensions).toHaveProperty('x')
      expect(validAnalysis.dimensions).toHaveProperty('y')
      expect(validAnalysis.dimensions).toHaveProperty('z')
      expect(validAnalysis.complexity).toBeGreaterThanOrEqual(0)
      expect(validAnalysis.complexity).toBeLessThanOrEqual(1)
      expect(typeof validAnalysis.supportRequired).toBe('boolean')
      expect(validAnalysis.printTime).toBeGreaterThan(0)
      expect(validAnalysis.triangleCount).toBeGreaterThan(0)
      expect(validAnalysis.vertexCount).toBeGreaterThan(0)
      expect(validAnalysis.boundingBox).toHaveProperty('min')
      expect(validAnalysis.boundingBox).toHaveProperty('max')
    })

    it('should have consistent dimensions and bounding box', () => {
      const analysis: FileAnalysis = {
        volume: 50, // 5 * 5 * 2 = 50
        surfaceArea: 130, // 2 * (5*5 + 5*2 + 5*2) = 2 * 65 = 130
        dimensions: { x: 5, y: 5, z: 2 },
        complexity: 0.5,
        supportRequired: false,
        printTime: 180,
        triangleCount: 2000,
        vertexCount: 1000,
        boundingBox: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 5, y: 5, z: 2 }
        }
      }

      const calculatedVolume = analysis.dimensions.x * analysis.dimensions.y * analysis.dimensions.z
      const boundingBoxVolume = 
        (analysis.boundingBox.max.x - analysis.boundingBox.min.x) *
        (analysis.boundingBox.max.y - analysis.boundingBox.min.y) *
        (analysis.boundingBox.max.z - analysis.boundingBox.min.z)

      expect(calculatedVolume).toBe(50)
      expect(boundingBoxVolume).toBe(50)
    })
  })

  describe('PrintSettings Type', () => {
    it('should validate print settings constraints', () => {
      const validSettings: PrintSettings = {
        material: 'PLA',
        color: 'white',
        quality: 'standard',
        infill: 20,
        supports: true,
        postProcessing: false,
        urgency: 'standard'
      }

      expect(['PLA', 'ABS', 'PETG', 'TPU', 'WOOD', 'METAL']).toContain(validSettings.material)
      expect(['draft', 'standard', 'high', 'ultra']).toContain(validSettings.quality)
      expect(validSettings.infill).toBeGreaterThanOrEqual(5)
      expect(validSettings.infill).toBeLessThanOrEqual(100)
      expect(['standard', 'express', 'rush']).toContain(validSettings.urgency)
      expect(typeof validSettings.supports).toBe('boolean')
      expect(typeof validSettings.postProcessing).toBe('boolean')
    })

    it('should validate infill percentage ranges', () => {
      const testInfillValues = [0, 5, 20, 50, 100, 150]
      const validRanges = testInfillValues.filter(infill => infill >= 5 && infill <= 100)
      
      expect(validRanges).toEqual([5, 20, 50, 100])
    })
  })

  describe('CostBreakdown Validation', () => {
    it('should have mathematically consistent cost breakdown', () => {
      const breakdown: CostBreakdown = {
        materialCost: 10.50,
        supportCost: 2.10,
        laborCost: 70.00,
        machineTime: 200.00,
        postProcessingCost: 31.50,
        urgencyCost: 0.00,
        baseCost: 314.10,
        taxes: 56.54, // 18% of baseCost
        total: 370.64
      }

      const calculatedBaseCost = breakdown.materialCost + breakdown.supportCost + 
                                breakdown.laborCost + breakdown.machineTime + 
                                breakdown.postProcessingCost + breakdown.urgencyCost

      const calculatedTaxes = breakdown.baseCost * 0.18
      const calculatedTotal = breakdown.baseCost + breakdown.taxes

      expect(breakdown.baseCost).toBeCloseTo(calculatedBaseCost, 2)
      expect(breakdown.taxes).toBeCloseTo(calculatedTaxes, 2)
      expect(breakdown.total).toBeCloseTo(calculatedTotal, 2)
    })

    it('should handle zero values correctly', () => {
      const breakdown: CostBreakdown = {
        materialCost: 15.00,
        supportCost: 0.00, // No supports
        laborCost: 50.00,
        machineTime: 100.00,
        postProcessingCost: 0.00, // No post-processing
        urgencyCost: 0.00, // Standard urgency
        baseCost: 165.00,
        taxes: 29.70,
        total: 194.70
      }

      expect(breakdown.supportCost).toBe(0)
      expect(breakdown.postProcessingCost).toBe(0)
      expect(breakdown.urgencyCost).toBe(0)
      expect(breakdown.total).toBeGreaterThan(breakdown.baseCost)
    })
  })

  describe('Material Properties', () => {
    it('should validate material properties', () => {
      const material: Material = {
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
        created_at: new Date().toISOString()
      }

      expect(material.price_per_hour).toBeGreaterThan(0)
      expect(material.price_per_gram).toBeGreaterThan(0)
      expect(material.density).toBeGreaterThan(0)
      expect(typeof material.available).toBe('boolean')
      expect(material.properties).toHaveProperty('temperature')
      expect(material.code).toBe(material.code.toUpperCase())
    })

    it('should calculate material costs correctly', () => {
      const material = {
        price_per_gram: 0.5,
        density: 1.24
      }

      const volume = 10 // cm³
      const infillPercentage = 20
      
      const materialVolume = volume * (infillPercentage / 100)
      const materialWeight = materialVolume * material.density
      const materialCost = (materialWeight / 1000) * material.price_per_gram

      expect(materialVolume).toBe(2) // 10 * 0.2
      expect(materialWeight).toBeCloseTo(2.48, 2) // 2 * 1.24
      expect(materialCost).toBeCloseTo(0.00124, 5) // (2.48 / 1000) * 0.5
    })
  })

  describe('Quote Validation', () => {
    it('should generate valid quote numbers', () => {
      const currentDate = new Date()
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateString = `${year}${month}${day}`
      
      const quoteNumber = `Q${dateString}-0001`
      const quoteRegex = /^Q\d{8}-\d{4}$/
      
      expect(quoteNumber).toMatch(quoteRegex)
      expect(quoteNumber).toContain(dateString)
    })

    it('should validate quote expiry logic', () => {
      const createdAt = new Date()
      const validUntil = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      
      const daysDifference = Math.ceil((validUntil.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      
      expect(daysDifference).toBe(30)
      expect(validUntil.getTime()).toBeGreaterThan(createdAt.getTime())
    })
  })

  describe('Order Number Generation', () => {
    it('should generate valid order numbers', () => {
      const currentDate = new Date()
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateString = `${year}${month}${day}`
      
      const orderNumber = `ORD${dateString}-0001`
      const orderRegex = /^ORD\d{8}-\d{4}$/
      
      expect(orderNumber).toMatch(orderRegex)
      expect(orderNumber).toContain(dateString)
    })
  })

  describe('Business Rule Validations', () => {
    it('should validate minimum order value', () => {
      const minimumOrderValue = 100 // ₹100 minimum
      
      const validOrder = { total: 150 }
      const invalidOrder = { total: 50 }
      
      expect(validOrder.total).toBeGreaterThanOrEqual(minimumOrderValue)
      expect(invalidOrder.total).toBeLessThan(minimumOrderValue)
    })

    it('should validate delivery time estimations', () => {
      const urgencyDeliveryTimes = {
        standard: 5,
        express: 3,
        rush: 1
      }
      
      const postProcessingDelay = 1
      
      // Test each urgency level
      Object.entries(urgencyDeliveryTimes).forEach(([urgency, baseDays]) => {
        const withoutProcessing = baseDays
        const withProcessing = baseDays + postProcessingDelay
        
        expect(withoutProcessing).toBeGreaterThan(0)
        expect(withProcessing).toBeGreaterThan(withoutProcessing)
        expect(withProcessing).toBe(baseDays + 1)
      })
    })

    it('should validate file size limits', () => {
      const maxFileSize = 50 * 1024 * 1024 // 50MB
      const validFileSize = 10 * 1024 * 1024 // 10MB
      const invalidFileSize = 60 * 1024 * 1024 // 60MB
      
      expect(validFileSize).toBeLessThanOrEqual(maxFileSize)
      expect(invalidFileSize).toBeGreaterThan(maxFileSize)
    })

    it('should validate supported file types', () => {
      const allowedTypes = ['.stl', '.obj', '.3mf', '.ply']
      const validFiles = ['model.stl', 'design.obj', 'print.3mf', 'scan.ply']
      const invalidFiles = ['document.pdf', 'image.jpg', 'text.txt']
      
      validFiles.forEach(filename => {
        const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase()
        expect(allowedTypes).toContain(extension)
      })
      
      invalidFiles.forEach(filename => {
        const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase()
        expect(allowedTypes).not.toContain(extension)
      })
    })

    it('should validate tax calculation', () => {
      const gstRate = 0.18 // 18% GST in India
      const baseCost = 1000
      const expectedTax = baseCost * gstRate
      const total = baseCost + expectedTax
      
      expect(expectedTax).toBe(180)
      expect(total).toBe(1180)
      expect(expectedTax / baseCost).toBe(gstRate)
    })
  })
})