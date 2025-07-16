export interface MaterialType {
  id: string
  name: string
  costPerGram: number
  density: number
  color: string
  properties: {
    strength: number
    flexibility: number
    detail: number
    durability: number
  }
  printSettings: {
    bedTemp: number
    nozzleTemp: number
    printSpeed: number
    supportInterface: boolean
    chamberTemp?: number
  }
  supportMaterial?: {
    enabled: boolean
    costMultiplier: number
    dissolvable: boolean
  }
  postProcessing: {
    required: boolean
    cost: number
    timeHours: number
  }
}

export interface PrintSettings {
  material: string
  color: string
  quality: 'draft' | 'standard' | 'high' | 'ultra'
  infill: number
  supports: boolean
  postProcessing: boolean
  urgency: 'standard' | 'express' | 'rush'
}

export interface CostBreakdown {
  materialCost: number
  supportCost: number
  laborCost: number
  machineTime: number
  electricityCost: number
  postProcessingCost: number
  urgencyCost: number
  baseCost: number
  profitMargin: number
  taxes: number
  total: number
}

export interface Quote {
  id: string
  fileId: string
  settings: PrintSettings
  costBreakdown: CostBreakdown
  estimatedDays: number
  validUntil: Date
  createdAt: Date
  printerModel: 'A1' | 'X1_Carbon'
}

export interface PrinterSpecs {
  model: string
  buildVolume: { x: number; y: number; z: number }
  powerConsumption: number
  operatingCost: number
  maxSpeed: number
  minLayerHeight: number
  maxLayerHeight: number
  nozzleDiameter: number
  enclosedChamber: boolean
}

export class CostCalculator {
  private static readonly PRINTERS: Record<string, PrinterSpecs> = {
    A1: {
      model: 'Bambu A1',
      buildVolume: { x: 256, y: 256, z: 256 },
      powerConsumption: 350,
      operatingCost: 15,
      maxSpeed: 500,
      minLayerHeight: 0.08,
      maxLayerHeight: 0.35,
      nozzleDiameter: 0.4,
      enclosedChamber: false
    },
    X1_Carbon: {
      model: 'Bambu X1 Carbon',
      buildVolume: { x: 256, y: 256, z: 256 },
      powerConsumption: 500,
      operatingCost: 25,
      maxSpeed: 500,
      minLayerHeight: 0.05,
      maxLayerHeight: 0.35,
      nozzleDiameter: 0.4,
      enclosedChamber: true
    }
  }

  private static readonly MATERIALS: Record<string, MaterialType> = {
    pla: {
      id: 'pla',
      name: 'Bambu PLA Basic',
      costPerGram: 0.08,
      density: 1.24,
      color: '#ffffff',
      properties: { strength: 3, flexibility: 2, detail: 4, durability: 3 },
      printSettings: {
        bedTemp: 35,
        nozzleTemp: 220,
        printSpeed: 250,
        supportInterface: true
      },
      supportMaterial: {
        enabled: true,
        costMultiplier: 0.3,
        dissolvable: false
      },
      postProcessing: { required: false, cost: 0, timeHours: 0 }
    },
    'pla-plus': {
      id: 'pla-plus',
      name: 'Bambu PLA-CF',
      costPerGram: 0.15,
      density: 1.35,
      color: '#2c2c2c',
      properties: { strength: 5, flexibility: 2, detail: 4, durability: 4 },
      printSettings: {
        bedTemp: 35,
        nozzleTemp: 220,
        printSpeed: 200,
        supportInterface: true
      },
      supportMaterial: {
        enabled: true,
        costMultiplier: 0.3,
        dissolvable: false
      },
      postProcessing: { required: false, cost: 0, timeHours: 0 }
    },
    abs: {
      id: 'abs',
      name: 'Bambu ABS',
      costPerGram: 0.12,
      density: 1.04,
      color: '#ffffff',
      properties: { strength: 4, flexibility: 4, detail: 3, durability: 5 },
      printSettings: {
        bedTemp: 90,
        nozzleTemp: 270,
        printSpeed: 150,
        supportInterface: true,
        chamberTemp: 60
      },
      supportMaterial: {
        enabled: true,
        costMultiplier: 0.4,
        dissolvable: false
      },
      postProcessing: { required: true, cost: 25, timeHours: 1 }
    },
    petg: {
      id: 'petg',
      name: 'Bambu PETG-CF',
      costPerGram: 0.18,
      density: 1.35,
      color: '#1a1a1a',
      properties: { strength: 5, flexibility: 3, detail: 4, durability: 5 },
      printSettings: {
        bedTemp: 70,
        nozzleTemp: 250,
        printSpeed: 120,
        supportInterface: true
      },
      supportMaterial: {
        enabled: true,
        costMultiplier: 0.4,
        dissolvable: false
      },
      postProcessing: { required: true, cost: 35, timeHours: 1.5 }
    },
    tpu: {
      id: 'tpu',
      name: 'Bambu TPU 95A',
      costPerGram: 0.25,
      density: 1.20,
      color: '#ff6b6b',
      properties: { strength: 2, flexibility: 5, detail: 3, durability: 4 },
      printSettings: {
        bedTemp: 35,
        nozzleTemp: 220,
        printSpeed: 30,
        supportInterface: false
      },
      supportMaterial: {
        enabled: false,
        costMultiplier: 0,
        dissolvable: false
      },
      postProcessing: { required: true, cost: 50, timeHours: 2 }
    },
    'pva-support': {
      id: 'pva-support',
      name: 'Bambu PVA Support',
      costPerGram: 0.35,
      density: 1.23,
      color: '#transparent',
      properties: { strength: 1, flexibility: 1, detail: 5, durability: 1 },
      printSettings: {
        bedTemp: 35,
        nozzleTemp: 200,
        printSpeed: 100,
        supportInterface: true
      },
      supportMaterial: {
        enabled: true,
        costMultiplier: 1.0,
        dissolvable: true
      },
      postProcessing: { required: true, cost: 75, timeHours: 4 }
    }
  }

  private static readonly QUALITY_MULTIPLIERS = {
    draft: { 
      layerHeight: 0.28, 
      speed: 1.5, 
      infillDefault: 10,
      timeMultiplier: 0.6,
      qualityMultiplier: 0.8 
    },
    standard: { 
      layerHeight: 0.20, 
      speed: 1.0, 
      infillDefault: 15,
      timeMultiplier: 1.0,
      qualityMultiplier: 1.0 
    },
    high: { 
      layerHeight: 0.12, 
      speed: 0.7, 
      infillDefault: 20,
      timeMultiplier: 1.6,
      qualityMultiplier: 1.2 
    },
    ultra: { 
      layerHeight: 0.08, 
      speed: 0.5, 
      infillDefault: 25,
      timeMultiplier: 2.4,
      qualityMultiplier: 1.5 
    }
  }

  private static readonly URGENCY_MULTIPLIERS = {
    standard: { cost: 1.0, days: 3 },
    express: { cost: 1.8, days: 1 },
    rush: { cost: 2.5, days: 0.5 }
  }

  private static readonly BUSINESS_CONFIG = {
    electricityRate: 0.15,
    laborRate: 20,
    profitMarginDefault: 0.35,
    taxRate: 0.18,
    operationalOverhead: 1.25
  }

  static getMaterial(materialId: string): MaterialType | null {
    return this.MATERIALS[materialId] || null
  }

  static getAllMaterials(): MaterialType[] {
    return Object.values(this.MATERIALS)
  }

  static calculateCost(
    volume: number,
    surfaceArea: number,
    printTime: number,
    settings: PrintSettings,
    supportRequired: boolean,
    profitMargin: number = 0.35
  ): CostBreakdown {
    const material = this.getMaterial(settings.material)
    if (!material) {
      throw new Error(`Unknown material: ${settings.material}`)
    }

    const qualitySettings = this.QUALITY_MULTIPLIERS[settings.quality]
    const urgencySettings = this.URGENCY_MULTIPLIERS[settings.urgency]
    
    const printer = settings.material.includes('cf') || settings.urgency === 'rush' 
      ? this.PRINTERS.X1_Carbon 
      : this.PRINTERS.A1

    const infillPercentage = settings.infill || qualitySettings.infillDefault
    const adjustedVolume = volume * (infillPercentage / 100)
    const materialWeight = adjustedVolume * material.density

    const materialCost = materialWeight * material.costPerGram * qualitySettings.qualityMultiplier

    let supportCost = 0
    if ((settings.supports || supportRequired) && material.supportMaterial?.enabled) {
      const supportWeight = materialWeight * material.supportMaterial.costMultiplier
      const supportMaterial = material.supportMaterial.dissolvable 
        ? this.getMaterial('pva-support') 
        : material
      
      if (supportMaterial) {
        supportCost = supportWeight * supportMaterial.costPerGram * qualitySettings.qualityMultiplier
      }
    }

    const actualPrintTime = this.calculateActualPrintTime(
      volume, 
      surfaceArea, 
      qualitySettings, 
      material, 
      infillPercentage,
      settings.supports || supportRequired
    )

    const printTimeHours = actualPrintTime / 60
    const electricityCost = printTimeHours * (printer.powerConsumption / 1000) * this.BUSINESS_CONFIG.electricityRate
    const machineOperatingCost = printTimeHours * printer.operatingCost
    
    const laborTime = this.calculateLaborTime(printTimeHours, settings.postProcessing)
    const laborCost = laborTime * this.BUSINESS_CONFIG.laborRate

    const postProcessingCost = settings.postProcessing && material.postProcessing.required
      ? material.postProcessing.cost
      : 0

    const baseCost = (materialCost + supportCost + electricityCost + machineOperatingCost + laborCost + postProcessingCost) 
      * this.BUSINESS_CONFIG.operationalOverhead

    const urgencyCost = baseCost * (urgencySettings.cost - 1)
    const subtotal = baseCost + urgencyCost
    
    const profitAmount = subtotal * profitMargin
    const subtotalWithProfit = subtotal + profitAmount
    const taxes = subtotalWithProfit * this.BUSINESS_CONFIG.taxRate
    const total = subtotalWithProfit + taxes

    return {
      materialCost: Math.round(materialCost * 100) / 100,
      supportCost: Math.round(supportCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      machineTime: Math.round(machineOperatingCost * 100) / 100,
      electricityCost: Math.round(electricityCost * 100) / 100,
      postProcessingCost: Math.round(postProcessingCost * 100) / 100,
      urgencyCost: Math.round(urgencyCost * 100) / 100,
      baseCost: Math.round(baseCost * 100) / 100,
      profitMargin: Math.round(profitAmount * 100) / 100,
      taxes: Math.round(taxes * 100) / 100,
      total: Math.round(total * 100) / 100
    }
  }

  private static calculateActualPrintTime(
    volume: number,
    surfaceArea: number,
    qualitySettings: any,
    material: MaterialType,
    infillPercentage: number,
    hasSupports: boolean
  ): number {
    const layerHeight = qualitySettings.layerHeight
    const printSpeed = material.printSettings.printSpeed * qualitySettings.speed
    
    const perimeterLength = Math.sqrt(surfaceArea) * 4
    const infillArea = volume / layerHeight
    const supportArea = hasSupports ? surfaceArea * 0.3 : 0
    
    const perimeterTime = (perimeterLength / (printSpeed * 0.8)) * 60
    const infillTime = (infillArea * (infillPercentage / 100)) / printSpeed * 60
    const supportTime = supportArea / (printSpeed * 0.5) * 60
    
    const totalTime = perimeterTime + infillTime + supportTime
    const setupTime = 15
    const postTime = hasSupports ? 10 : 5
    
    return Math.max(totalTime * qualitySettings.timeMultiplier + setupTime + postTime, 30)
  }

  private static calculateLaborTime(printTimeHours: number, hasPostProcessing: boolean): number {
    const setupTime = 0.25
    const monitoringTime = Math.min(printTimeHours * 0.1, 2)
    const finishingTime = hasPostProcessing ? 0.5 : 0.15
    
    return setupTime + monitoringTime + finishingTime
  }

  static estimateDelivery(urgency: string, postProcessingRequired: boolean): number {
    const baseTime = this.URGENCY_MULTIPLIERS[urgency as keyof typeof this.URGENCY_MULTIPLIERS]?.days || 3
    const postProcessingDays = postProcessingRequired ? 0.5 : 0
    return Math.ceil(baseTime + postProcessingDays)
  }

  static generateQuote(
    fileId: string,
    volume: number,
    surfaceArea: number,
    printTime: number,
    settings: PrintSettings,
    supportRequired: boolean,
    profitMargin: number = 0.35
  ): Quote {
    const costBreakdown = this.calculateCost(volume, surfaceArea, printTime, settings, supportRequired, profitMargin)
    const material = this.getMaterial(settings.material)!
    const estimatedDays = this.estimateDelivery(settings.urgency, material.postProcessing.required && settings.postProcessing)
    
    const printerModel = settings.material.includes('cf') || settings.urgency === 'rush' || material.printSettings.chamberTemp
      ? 'X1_Carbon' as const
      : 'A1' as const
    
    const quote: Quote = {
      id: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileId,
      settings,
      costBreakdown,
      estimatedDays,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      printerModel
    }

    return quote
  }

  static updateProfitMargin(newMargin: number): void {
    if (newMargin < 0 || newMargin > 1) {
      throw new Error('Profit margin must be between 0 and 1 (0% to 100%)')
    }
  }

  static getRecommendedPrinter(materialId: string, urgency: string): PrinterSpecs {
    const material = this.getMaterial(materialId)
    
    if (!material) {
      return this.PRINTERS.A1
    }
    
    const needsEnclosure = material.printSettings.chamberTemp !== undefined || 
                          materialId.includes('abs') || 
                          urgency === 'rush'
    
    return needsEnclosure ? this.PRINTERS.X1_Carbon : this.PRINTERS.A1
  }

  static getBambuMaterialProfile(materialId: string): any {
    const material = this.getMaterial(materialId)
    if (!material) return null
    
    return {
      material_id: materialId.toUpperCase(),
      nozzle_temperature: material.printSettings.nozzleTemp,
      bed_temperature: material.printSettings.bedTemp,
      chamber_temperature: material.printSettings.chamberTemp || 0,
      max_volumetric_speed: material.printSettings.printSpeed / 10,
      support_interface: material.printSettings.supportInterface,
      supports_enable: material.supportMaterial?.enabled || false
    }
  }

  static validateSettings(settings: PrintSettings): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.getMaterial(settings.material)) {
      errors.push('Invalid material selected')
    }

    if (settings.infill < 5 || settings.infill > 100) {
      errors.push('Infill must be between 5% and 100%')
    }

    if (!['draft', 'standard', 'high', 'ultra'].includes(settings.quality)) {
      errors.push('Invalid quality setting')
    }

    if (!['standard', 'express', 'rush'].includes(settings.urgency)) {
      errors.push('Invalid urgency setting')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
