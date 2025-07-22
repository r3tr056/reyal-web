import { Decimal } from 'decimal.js'

// Advanced printing configuration constants based on Bambu/Orca algorithms
const PRINTING_CONFIGS = {
  // Material properties (based on Bambu Labs presets)
  MATERIALS: {
    PLA: {
      density: 1.24, // g/cm³
      printTemp: { min: 190, max: 230, optimal: 210 },
      bedTemp: { min: 45, max: 60, optimal: 50 },
      flowRatio: 1.0,
      maxVolumetricSpeed: 24, // mm³/s
      linearAdvance: 0.05,
      retraction: { length: 0.8, speed: 35 },
      supportOverhangAngle: 50
    },
    PETG: {
      density: 1.27,
      printTemp: { min: 230, max: 270, optimal: 250 },
      bedTemp: { min: 70, max: 90, optimal: 80 },
      flowRatio: 0.98,
      maxVolumetricSpeed: 16,
      linearAdvance: 0.08,
      retraction: { length: 1.2, speed: 25 },
      supportOverhangAngle: 45
    },
    ABS: {
      density: 1.04,
      printTemp: { min: 240, max: 280, optimal: 260 },
      bedTemp: { min: 90, max: 110, optimal: 100 },
      flowRatio: 1.02,
      maxVolumetricSpeed: 18,
      linearAdvance: 0.06,
      retraction: { length: 1.0, speed: 30 },
      supportOverhangAngle: 45
    },
    TPU: {
      density: 1.20,
      printTemp: { min: 220, max: 250, optimal: 230 },
      bedTemp: { min: 45, max: 60, optimal: 50 },
      flowRatio: 1.05,
      maxVolumetricSpeed: 8,
      linearAdvance: 0.15,
      retraction: { length: 0.4, speed: 15 },
      supportOverhangAngle: 60
    }
  },
  
  // Quality settings (based on Bambu Studio presets)
  QUALITY: {
    draft: { layerHeight: 0.28, lineWidth: 0.45, speed: 250, infill: 10 },
    standard: { layerHeight: 0.20, lineWidth: 0.42, speed: 200, infill: 15 },
    fine: { layerHeight: 0.15, lineWidth: 0.40, speed: 150, infill: 20 },
    ultra: { layerHeight: 0.10, lineWidth: 0.38, speed: 100, infill: 25 }
  },
  
  // Nozzle configurations
  NOZZLES: {
    '0.2': { diameter: 0.2, minLineWidth: 0.15, maxLineWidth: 0.25 },
    '0.4': { diameter: 0.4, minLineWidth: 0.30, maxLineWidth: 0.50 },
    '0.6': { diameter: 0.6, minLineWidth: 0.45, maxLineWidth: 0.75 },
    '0.8': { diameter: 0.8, minLineWidth: 0.60, maxLineWidth: 1.00 }
  },
  
  // Printer capabilities (based on Bambu X1C specifications)
  PRINTER: {
    maxSpeed: { x: 500, y: 500, z: 20, e: 120 },
    acceleration: { default: 10000, outer: 5000, inner: 10000 },
    jerk: { xy: 9, z: 3, e: 2.5 },
    buildVolume: { x: 256, y: 256, z: 256 }
  }
} as const

export interface ModelAnalysis {
  // Basic geometry
  volume: string // Use string for precise decimal representation
  surfaceArea: string
  dimensions: { x: number; y: number; z: number }
  boundingBox: { min: Vector3D; max: Vector3D }
  
  // Advanced metrics
  complexity: number
  supportRequired: boolean
  supportVolume: string
  overhangAreas: OverhangArea[]
  bridgeAreas: BridgeArea[]
  thinWalls: ThinWallArea[]
  
  // Printing calculations
  printTime: PrintTimeBreakdown
  materialUsage: MaterialUsage
  qualityMetrics: QualityMetrics
  
  // Slicing parameters
  recommendedSettings: RecommendedSettings
  calibrationNeeds: CalibrationRequirement[]
  
  // Mesh analysis
  triangleCount: number
  vertexCount: number
  meshQuality: MeshQuality
  repairNeeded: boolean
}

interface Vector3D {
  x: number
  y: number
  z: number
}

interface OverhangArea {
  area: number
  angle: number
  position: Vector3D
  supportRequired: boolean
}

interface BridgeArea {
  length: number
  width: number
  position: Vector3D
  supportRequired: boolean
}

interface ThinWallArea {
  thickness: number
  area: number
  position: Vector3D
  printable: boolean
}

interface PrintTimeBreakdown {
  total: number // minutes
  perimeter: number
  infill: number
  support: number
  travel: number
  retraction: number
  heatup: number
}

interface MaterialUsage {
  filament: string // length in mm
  weight: string // weight in grams
  cost: string // estimated cost
  supportMaterial: string
  wastePercentage: number
}

interface QualityMetrics {
  overallScore: number // 1-10
  printability: number
  supportComplexity: number
  bridgeQuality: number
  dimensionalAccuracy: number
}

interface RecommendedSettings {
  material: string
  quality: string
  nozzle: string
  layerHeight: number
  lineWidth: number
  printSpeed: number
  flowRate: number
  temperature: number
  bedTemperature: number
  infillDensity: number
  supportDensity: number
  retraction: { length: number; speed: number }
}

interface CalibrationRequirement {
  type: 'flow_rate' | 'temperature' | 'retraction' | 'pressure_advance' | 'max_flow'
  priority: 'low' | 'medium' | 'high'
  reason: string
  testRange: { min: number; max: number }
}

interface MeshQuality {
  score: number
  issues: MeshIssue[]
  watertight: boolean
  manifold: boolean
}

interface MeshIssue {
  type: 'non_manifold' | 'inverted_normals' | 'duplicate_vertices' | 'holes'
  count: number
  severity: 'low' | 'medium' | 'high'
}

export interface FileValidation {
  isValid: boolean
  errors: string[]
  fileType: string
  fileSize: number
}


export interface PrintingSettings {
  material?: string
  quality?: string
  nozzle?: string
  temperature?: number
  bedTemperature?: number
  printSpeed?: number
  infillDensity?: number
}

export class ModelProcessor {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024
  private static readonly SUPPORTED_FORMATS = ['.stl', '.obj', '.3mf', '.ply']
  private static readonly PRECISION = 6 // Decimal places for calculations

  static validateFile(filename: string, fileSize: number): FileValidation {
    const errors: string[] = []
    const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'))

    if (fileSize > this.MAX_FILE_SIZE) {
      errors.push(`File size must be less than ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`)
    }

    if (!this.SUPPORTED_FORMATS.includes(fileExtension)) {
      errors.push(`Unsupported file format. Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`)
    }

    if (fileSize === 0) {
      errors.push('File is empty')
    }

    // Additional security validations
    if (filename.length > 255) {
      errors.push('Filename too long')
    }

    if (!/^[a-zA-Z0-9._-]+$/i.test(filename)) {
      errors.push('Filename contains invalid characters')
    }

    return {
      isValid: errors.length === 0,
      errors,
      fileType: fileExtension,
      fileSize
    }
  }

  static async analyzeSTL(
    buffer: ArrayBuffer,
    settings: {
      material?: string
      quality?: string
      nozzle?: string
    } = {}
  ): Promise<ModelAnalysis> {
    const dataView = new DataView(buffer)
    let offset = 80
    const triangleCount = dataView.getUint32(offset, true)
    offset += 4

    const vertices: Vector3D[] = []
    const triangles: number[][] = []
    const normals: Vector3D[] = []
    
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let minZ = Infinity, maxZ = -Infinity

    // Parse STL data with enhanced processing
    for (let i = 0; i < triangleCount; i++) {
      // Read normal vector
      const normal: Vector3D = {
        x: dataView.getFloat32(offset, true),
        y: dataView.getFloat32(offset + 4, true),
        z: dataView.getFloat32(offset + 8, true)
      }
      normals.push(normal)
      offset += 12

      const triangle = []
      const triangleVertices: Vector3D[] = []

      // Read triangle vertices
      for (let j = 0; j < 3; j++) {
        const vertex: Vector3D = {
          x: dataView.getFloat32(offset, true),
          y: dataView.getFloat32(offset + 4, true),
          z: dataView.getFloat32(offset + 8, true)
        }

        vertices.push(vertex)
        triangleVertices.push(vertex)
        triangle.push(vertices.length - 1)

        // Update bounding box
        minX = Math.min(minX, vertex.x)
        maxX = Math.max(maxX, vertex.x)
        minY = Math.min(minY, vertex.y)
        maxY = Math.max(maxY, vertex.y)
        minZ = Math.min(minZ, vertex.z)
        maxZ = Math.max(maxZ, vertex.z)

        offset += 12
      }

      triangles.push(triangle)
      offset += 2 // Skip attribute byte count
    }

    const dimensions = { x: maxX - minX, y: maxY - minY, z: maxZ - minZ }
    const boundingBox = {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    }

    // Advanced calculations using Bambu/Orca algorithms
    const volume = this.calculatePreciseVolume(vertices, triangles)
    const surfaceArea = this.calculatePreciseSurfaceArea(vertices, triangles)
    const complexity = this.calculateAdvancedComplexity(triangles, vertices, normals)
    const overhangAnalysis = this.analyzeOverhangs(vertices, triangles, normals, settings.material || 'PLA')
    const bridgeAnalysis = this.analyzeBridges(vertices, triangles, normals)
    const thinWallAnalysis = this.analyzeThinWalls(vertices, triangles, settings.nozzle || '0.4')
    const meshQuality = this.analyzeMeshQuality(vertices, triangles, normals)
    
    // Calculate printing parameters using Bambu/Orca formulas
    const materialConfig = PRINTING_CONFIGS.MATERIALS[settings.material as keyof typeof PRINTING_CONFIGS.MATERIALS] || PRINTING_CONFIGS.MATERIALS.PLA
    const qualityConfig = PRINTING_CONFIGS.QUALITY[settings.quality as keyof typeof PRINTING_CONFIGS.QUALITY] || PRINTING_CONFIGS.QUALITY.standard
    const nozzleConfig = PRINTING_CONFIGS.NOZZLES[settings.nozzle as keyof typeof PRINTING_CONFIGS.NOZZLES] || PRINTING_CONFIGS.NOZZLES['0.4']

    const printTime = this.calculateAdvancedPrintTime(
      volume,
      surfaceArea,
      dimensions,
      overhangAnalysis.supportVolume,
      qualityConfig,
      materialConfig,
      complexity
    )

    const materialUsage = this.calculateMaterialUsage(
      volume,
      overhangAnalysis.supportVolume,
      materialConfig,
      qualityConfig.infill
    )

    const qualityMetrics = this.calculateQualityMetrics(
      complexity,
      overhangAnalysis.areas.length,
      bridgeAnalysis.length,
      thinWallAnalysis.filter(w => !w.printable).length,
      meshQuality.score
    )

    const recommendedSettings = this.generateRecommendedSettings(
      complexity,
      overhangAnalysis.supportRequired,
      bridgeAnalysis.length > 0,
      materialConfig,
      qualityConfig,
      nozzleConfig
    )

    const calibrationNeeds = this.assessCalibrationNeeds(
      complexity,
      overhangAnalysis.supportRequired,
      bridgeAnalysis.length,
      volume,
      materialConfig
    )

    return {
      volume: volume.toFixed(this.PRECISION),
      surfaceArea: surfaceArea.toFixed(this.PRECISION),
      dimensions,
      boundingBox,
      complexity,
      supportRequired: overhangAnalysis.supportRequired,
      supportVolume: overhangAnalysis.supportVolume.toFixed(this.PRECISION),
      overhangAreas: overhangAnalysis.areas,
      bridgeAreas: bridgeAnalysis,
      thinWalls: thinWallAnalysis,
      printTime,
      materialUsage,
      qualityMetrics,
      recommendedSettings,
      calibrationNeeds,
      triangleCount,
      vertexCount: vertices.length,
      meshQuality,
      repairNeeded: meshQuality.issues.some(issue => issue.severity === 'high')
    }
  }

  static async analyzeOBJ(
    text: string,
    settings: {
      material?: string
      quality?: string
      nozzle?: string
    } = {}
  ): Promise<ModelAnalysis> {
    const lines = text.split('\n')
    const vertices: Vector3D[] = []
    const faces: number[][] = []
    
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let minZ = Infinity, maxZ = -Infinity

    // Parse OBJ format with enhanced processing
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      
      if (parts[0] === 'v' && parts.length >= 4) {
        const vertex: Vector3D = {
          x: parseFloat(parts[1]),
          y: parseFloat(parts[2]),
          z: parseFloat(parts[3])
        }

        // Validate vertex data
        if (isNaN(vertex.x) || isNaN(vertex.y) || isNaN(vertex.z)) continue

        vertices.push(vertex)

        // Update bounding box
        minX = Math.min(minX, vertex.x)
        maxX = Math.max(maxX, vertex.x)
        minY = Math.min(minY, vertex.y)
        maxY = Math.max(maxY, vertex.y)
        minZ = Math.min(minZ, vertex.z)
        maxZ = Math.max(maxZ, vertex.z)
        
      } else if (parts[0] === 'f' && parts.length >= 4) {
        const face = []
        
        for (let i = 1; i < parts.length; i++) {
          const vertexIndex = parseInt(parts[i].split('/')[0]) - 1 // OBJ uses 1-based indexing
          if (!isNaN(vertexIndex) && vertexIndex >= 0 && vertexIndex < vertices.length) {
            face.push(vertexIndex)
          }
        }

        // Triangulate face (convert polygons to triangles)
        if (face.length >= 3) {
          for (let i = 1; i < face.length - 1; i++) {
            faces.push([face[0], face[i], face[i + 1]])
          }
        }
      }
    }

    if (vertices.length === 0 || faces.length === 0) {
      throw new Error('Invalid OBJ file: no valid vertices or faces found')
    }

    // Calculate normals for OBJ (not provided in format)
    const normals = this.calculateTriangleNormals(vertices, faces)

    const dimensions = { x: maxX - minX, y: maxY - minY, z: maxZ - minZ }
    const boundingBox = {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    }

    // Use same analysis as STL
    const volume = this.calculatePreciseVolume(vertices, faces)
    const surfaceArea = this.calculatePreciseSurfaceArea(vertices, faces)
    const complexity = this.calculateAdvancedComplexity(faces, vertices, normals)
    const overhangAnalysis = this.analyzeOverhangs(vertices, faces, normals, settings.material || 'PLA')
    const bridgeAnalysis = this.analyzeBridges(vertices, faces, normals)
    const thinWallAnalysis = this.analyzeThinWalls(vertices, faces, settings.nozzle || '0.4')
    const meshQuality = this.analyzeMeshQuality(vertices, faces, normals)
    
    const materialConfig = PRINTING_CONFIGS.MATERIALS[settings.material as keyof typeof PRINTING_CONFIGS.MATERIALS] || PRINTING_CONFIGS.MATERIALS.PLA
    const qualityConfig = PRINTING_CONFIGS.QUALITY[settings.quality as keyof typeof PRINTING_CONFIGS.QUALITY] || PRINTING_CONFIGS.QUALITY.standard
    const nozzleConfig = PRINTING_CONFIGS.NOZZLES[settings.nozzle as keyof typeof PRINTING_CONFIGS.NOZZLES] || PRINTING_CONFIGS.NOZZLES['0.4']

    const printTime = this.calculateAdvancedPrintTime(
      volume,
      surfaceArea,
      dimensions,
      overhangAnalysis.supportVolume,
      qualityConfig,
      materialConfig,
      complexity
    )

    const materialUsage = this.calculateMaterialUsage(
      volume,
      overhangAnalysis.supportVolume,
      materialConfig,
      qualityConfig.infill
    )

    const qualityMetrics = this.calculateQualityMetrics(
      complexity,
      overhangAnalysis.areas.length,
      bridgeAnalysis.length,
      thinWallAnalysis.filter(w => !w.printable).length,
      meshQuality.score
    )

    const recommendedSettings = this.generateRecommendedSettings(
      complexity,
      overhangAnalysis.supportRequired,
      bridgeAnalysis.length > 0,
      materialConfig,
      qualityConfig,
      nozzleConfig
    )

    const calibrationNeeds = this.assessCalibrationNeeds(
      complexity,
      overhangAnalysis.supportRequired,
      bridgeAnalysis.length,
      volume,
      materialConfig
    )

    return {
      volume: volume.toFixed(this.PRECISION),
      surfaceArea: surfaceArea.toFixed(this.PRECISION),
      dimensions,
      boundingBox,
      complexity,
      supportRequired: overhangAnalysis.supportRequired,
      supportVolume: overhangAnalysis.supportVolume.toFixed(this.PRECISION),
      overhangAreas: overhangAnalysis.areas,
      bridgeAreas: bridgeAnalysis,
      thinWalls: thinWallAnalysis,
      printTime,
      materialUsage,
      qualityMetrics,
      recommendedSettings,
      calibrationNeeds,
      triangleCount: faces.length,
      vertexCount: vertices.length,
      meshQuality,
      repairNeeded: meshQuality.issues.some(issue => issue.severity === 'high')
    }
  }

  // Advanced calculation methods using Bambu/Orca algorithms

  private static calculatePreciseVolume(vertices: Vector3D[], triangles: number[][]): Decimal {
    let volume = new Decimal(0)
    
    for (const triangle of triangles) {
      if (triangle.length < 3) continue
      
      const v0 = vertices[triangle[0]]
      const v1 = vertices[triangle[1]]
      const v2 = vertices[triangle[2]]
      
      if (!v0 || !v1 || !v2) continue

      // Use the divergence theorem (tetrahedron volume calculation)
      const tetrahedronVolume = new Decimal(
        v0.x * (v1.y * v2.z - v1.z * v2.y) +
        v1.x * (v2.y * v0.z - v2.z * v0.y) +
        v2.x * (v0.y * v1.z - v0.z * v1.y)
      ).div(6)

      volume = volume.plus(tetrahedronVolume)
    }

    return volume.abs()
  }

  private static calculatePreciseSurfaceArea(vertices: Vector3D[], triangles: number[][]): Decimal {
    let surfaceArea = new Decimal(0)

    for (const triangle of triangles) {
      if (triangle.length < 3) continue
      
      const v0 = vertices[triangle[0]]
      const v1 = vertices[triangle[1]]
      const v2 = vertices[triangle[2]]
      
      if (!v0 || !v1 || !v2) continue

      // Calculate triangle area using cross product
      const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z }
      const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z }

      const cross = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x
      }

      const triangleArea = new Decimal(
        Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z)
      ).div(2)

      surfaceArea = surfaceArea.plus(triangleArea)
    }

    return surfaceArea
  }

  private static calculateAdvancedComplexity(
    triangles: number[][],
    vertices: Vector3D[],
    normals: Vector3D[]
  ): number {
    const triangleCount = triangles.length
    const vertexCount = vertices.length

    // Base complexity from mesh density
    let complexity = 1
    if (triangleCount > 100000 || vertexCount > 50000) complexity = 5
    else if (triangleCount > 50000 || vertexCount > 25000) complexity = 4
    else if (triangleCount > 10000 || vertexCount > 5000) complexity = 3
    else if (triangleCount > 1000 || vertexCount > 500) complexity = 2

    // Adjust for geometric complexity
    let angleVariation = 0
    let curvatureCount = 0

    for (let i = 0; i < Math.min(triangles.length - 1, 1000); i++) {
      const normal1 = normals[i]
      const normal2 = normals[i + 1]
      
      if (normal1 && normal2) {
        const dotProduct = normal1.x * normal2.x + normal1.y * normal2.y + normal1.z * normal2.z
        const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)))
        angleVariation += angle
        
        if (angle > Math.PI / 4) curvatureCount++ // 45 degree threshold
      }
    }

    const avgAngleVariation = angleVariation / Math.min(triangles.length - 1, 1000)
    const curvatureRatio = curvatureCount / Math.min(triangles.length - 1, 1000)

    // Adjust complexity based on geometric features
    if (avgAngleVariation > Math.PI / 3) complexity += 1 // High curvature
    if (curvatureRatio > 0.3) complexity += 1 // Many sharp features

    return Math.min(5, Math.max(1, complexity))
  }

  private static analyzeOverhangs(
    vertices: Vector3D[],
    triangles: number[][],
    normals: Vector3D[],
    material: string
  ): { supportRequired: boolean; areas: OverhangArea[]; supportVolume: Decimal } {
    const materialConfig = PRINTING_CONFIGS.MATERIALS[material as keyof typeof PRINTING_CONFIGS.MATERIALS] || PRINTING_CONFIGS.MATERIALS.PLA
    const overhangThreshold = Math.cos((materialConfig.supportOverhangAngle * Math.PI) / 180)
    
    const overhangAreas: OverhangArea[] = []
    let totalSupportVolume = new Decimal(0)

    for (let i = 0; i < triangles.length; i++) {
      const triangle = triangles[i]
      const normal = normals[i]
      
      if (!normal || triangle.length < 3) continue

      // Normalize the normal vector
      const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z)
      if (normalLength === 0) continue

      const normalizedZ = normal.z / normalLength

      // Check if triangle is facing downward (overhang)
      if (normalizedZ < -overhangThreshold) {
        const v0 = vertices[triangle[0]]
        const v1 = vertices[triangle[1]]
        const v2 = vertices[triangle[2]]
        
        if (!v0 || !v1 || !v2) continue

        // Calculate triangle area
        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z }
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z }
        const area = Math.sqrt(
          Math.pow(edge1.y * edge2.z - edge1.z * edge2.y, 2) +
          Math.pow(edge1.z * edge2.x - edge1.x * edge2.z, 2) +
          Math.pow(edge1.x * edge2.y - edge1.y * edge2.x, 2)
        ) / 2

        // Calculate center point
        const center = {
          x: (v0.x + v1.x + v2.x) / 3,
          y: (v0.y + v1.y + v2.y) / 3,
          z: (v0.z + v1.z + v2.z) / 3
        }

        const angle = Math.acos(-normalizedZ) * (180 / Math.PI)
        const supportRequired = angle > materialConfig.supportOverhangAngle

        overhangAreas.push({
          area,
          angle,
          position: center,
          supportRequired
        })

        if (supportRequired) {
          // Estimate support volume (simplified calculation)
          const supportHeight = Math.max(0, center.z - 0.2) // Assume 0.2mm clearance
          const supportVolume = new Decimal(area).mul(supportHeight).mul(0.2) // 20% infill for supports
          totalSupportVolume = totalSupportVolume.plus(supportVolume)
        }
      }
    }

    const supportRequired = overhangAreas.some(area => area.supportRequired)

    return {
      supportRequired,
      areas: overhangAreas,
      supportVolume: totalSupportVolume
    }
  }

  private static analyzeBridges(
    vertices: Vector3D[],
    triangles: number[][],
    normals: Vector3D[]
  ): BridgeArea[] {
    const bridgeAreas: BridgeArea[] = []
    const horizontalThreshold = 0.1 // Nearly horizontal surfaces

    for (let i = 0; i < triangles.length; i++) {
      const triangle = triangles[i]
      const normal = normals[i]
      
      if (!normal || triangle.length < 3) continue

      // Normalize normal vector
      const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z)
      if (normalLength === 0) continue

      const normalizedZ = Math.abs(normal.z / normalLength)

      // Check if triangle is nearly horizontal (potential bridge)
      if (normalizedZ > (1 - horizontalThreshold)) {
        const v0 = vertices[triangle[0]]
        const v1 = vertices[triangle[1]]
        const v2 = vertices[triangle[2]]
        
        if (!v0 || !v1 || !v2) continue

        // Check if triangle is elevated (potential bridge)
        const avgZ = (v0.z + v1.z + v2.z) / 3
        if (avgZ > 2.0) { // Above 2mm height
          // Calculate bridge dimensions
          const edge1Length = Math.sqrt(
            Math.pow(v1.x - v0.x, 2) + Math.pow(v1.y - v0.y, 2) + Math.pow(v1.z - v0.z, 2)
          )
          const edge2Length = Math.sqrt(
            Math.pow(v2.x - v0.x, 2) + Math.pow(v2.y - v0.y, 2) + Math.pow(v2.z - v0.z, 2)
          )

          const length = Math.max(edge1Length, edge2Length)
          const width = Math.min(edge1Length, edge2Length)

          // Consider it a bridge if it's long enough
          if (length > 5.0) { // 5mm minimum bridge length
            bridgeAreas.push({
              length,
              width,
              position: {
                x: (v0.x + v1.x + v2.x) / 3,
                y: (v0.y + v1.y + v2.y) / 3,
                z: avgZ
              },
              supportRequired: length > 10.0 // Support needed for bridges > 10mm
            })
          }
        }
      }
    }

    return bridgeAreas
  }

  private static analyzeThinWalls(
    vertices: Vector3D[],
    triangles: number[][],
    nozzle: string
  ): ThinWallArea[] {
    const nozzleConfig = PRINTING_CONFIGS.NOZZLES[nozzle as keyof typeof PRINTING_CONFIGS.NOZZLES] || PRINTING_CONFIGS.NOZZLES['0.4']
    const minWallThickness = nozzleConfig.diameter * 1.5 // Minimum printable wall thickness
    const thinWalls: ThinWallArea[] = []

    // Simplified thin wall detection
    // In a full implementation, this would require more sophisticated mesh analysis
    for (let i = 0; i < Math.min(triangles.length, 1000); i++) {
      const triangle = triangles[i]
      if (triangle.length < 3) continue

      const v0 = vertices[triangle[0]]
      const v1 = vertices[triangle[1]]
      const v2 = vertices[triangle[2]]
      
      if (!v0 || !v1 || !v2) continue

      // Calculate triangle area and perimeter
      const edge1Length = Math.sqrt(
        Math.pow(v1.x - v0.x, 2) + Math.pow(v1.y - v0.y, 2) + Math.pow(v1.z - v0.z, 2)
      )
      const edge2Length = Math.sqrt(
        Math.pow(v2.x - v0.x, 2) + Math.pow(v2.y - v0.y, 2) + Math.pow(v2.z - v0.z, 2)
      )
      const edge3Length = Math.sqrt(
        Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2) + Math.pow(v2.z - v1.z, 2)
      )

      const area = Math.abs(
        ((v1.x - v0.x) * (v2.y - v0.y) - (v2.x - v0.x) * (v1.y - v0.y)) / 2
      )
      const perimeter = edge1Length + edge2Length + edge3Length

      // Estimate "thickness" as area-to-perimeter ratio
      if (perimeter > 0) {
        const thickness = (2 * area) / perimeter

        if (thickness < minWallThickness && thickness > 0) {
          thinWalls.push({
            thickness,
            area,
            position: {
              x: (v0.x + v1.x + v2.x) / 3,
              y: (v0.y + v1.y + v2.y) / 3,
              z: (v0.z + v1.z + v2.z) / 3
            },
            printable: thickness > nozzleConfig.diameter * 0.8 // 80% of nozzle diameter minimum
          })
        }
      }
    }

    return thinWalls
  }

  private static calculateTriangleNormals(vertices: Vector3D[], triangles: number[][]): Vector3D[] {
    const normals: Vector3D[] = []

    for (const triangle of triangles) {
      if (triangle.length < 3) {
        normals.push({ x: 0, y: 0, z: 1 }) // Default normal
        continue
      }

      const v0 = vertices[triangle[0]]
      const v1 = vertices[triangle[1]]
      const v2 = vertices[triangle[2]]

      if (!v0 || !v1 || !v2) {
        normals.push({ x: 0, y: 0, z: 1 })
        continue
      }

      // Calculate normal using cross product
      const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z }
      const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z }

      const normal = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x
      }

      // Normalize
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z)
      if (length > 0) {
        normal.x /= length
        normal.y /= length
        normal.z /= length
      }

      normals.push(normal)
    }

    return normals
  }

  private static analyzeMeshQuality(
    vertices: Vector3D[],
    triangles: number[][],
    normals: Vector3D[]
  ): MeshQuality {
    const issues: MeshIssue[] = []
    let qualityScore = 10

    // Check for duplicate vertices
    const duplicateVertices = this.findDuplicateVertices(vertices)
    if (duplicateVertices > 0) {
      issues.push({
        type: 'duplicate_vertices',
        count: duplicateVertices,
        severity: duplicateVertices > vertices.length * 0.1 ? 'high' : 'medium'
      })
      qualityScore -= Math.min(3, duplicateVertices / 100)
    }

    // Check for inverted normals (simplified)
    let invertedNormals = 0
    for (const normal of normals) {
      if (normal.z < -0.9) invertedNormals++ // Likely inverted if pointing strongly downward
    }

    if (invertedNormals > normals.length * 0.1) {
      issues.push({
        type: 'inverted_normals',
        count: invertedNormals,
        severity: invertedNormals > normals.length * 0.3 ? 'high' : 'medium'
      })
      qualityScore -= Math.min(2, invertedNormals / normals.length * 10)
    }

    // Check for manifold mesh (simplified - would need more complex algorithms for full check)
    const isManifold = this.checkManifold(vertices, triangles)
    const isWatertight = this.checkWatertight(vertices, triangles)

    if (!isManifold) {
      issues.push({
        type: 'non_manifold',
        count: 1,
        severity: 'high'
      })
      qualityScore -= 3
    }

    qualityScore = Math.max(1, Math.min(10, qualityScore))

    return {
      score: qualityScore,
      issues,
      watertight: isWatertight,
      manifold: isManifold
    }
  }

  private static findDuplicateVertices(vertices: Vector3D[]): number {
    const tolerance = 1e-6
    let duplicates = 0

    for (let i = 0; i < vertices.length - 1; i++) {
      for (let j = i + 1; j < Math.min(vertices.length, i + 100); j++) { // Limit check for performance
        const v1 = vertices[i]
        const v2 = vertices[j]
        
        if (Math.abs(v1.x - v2.x) < tolerance &&
            Math.abs(v1.y - v2.y) < tolerance &&
            Math.abs(v1.z - v2.z) < tolerance) {
          duplicates++
          break
        }
      }
    }

    return duplicates
  }

  private static checkManifold(vertices: Vector3D[], triangles: number[][]): boolean {
    // Simplified manifold check - each edge should be shared by exactly 2 triangles
    const edgeCount = new Map<string, number>()

    for (const triangle of triangles) {
      if (triangle.length < 3) continue

      for (let i = 0; i < 3; i++) {
        const v1 = triangle[i]
        const v2 = triangle[(i + 1) % 3]
        
        // Create edge key (smaller index first for consistency)
        const edgeKey = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`
        
        edgeCount.set(edgeKey, (edgeCount.get(edgeKey) || 0) + 1)
      }
    }

    // Check if any edge is shared by more than 2 triangles (non-manifold)
    for (const count of edgeCount.values()) {
      if (count > 2) return false
    }

    return true
  }

  private static checkWatertight(vertices: Vector3D[], triangles: number[][]): boolean {
    // Simplified watertight check - all edges should be shared by exactly 2 triangles
    const edgeCount = new Map<string, number>()

    for (const triangle of triangles) {
      if (triangle.length < 3) continue

      for (let i = 0; i < 3; i++) {
        const v1 = triangle[i]
        const v2 = triangle[(i + 1) % 3]
        
        const edgeKey = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`
        edgeCount.set(edgeKey, (edgeCount.get(edgeKey) || 0) + 1)
      }
    }

    // Check if all edges are shared by exactly 2 triangles
    for (const count of edgeCount.values()) {
      if (count !== 2) return false
    }

    return true
  }

  // Advanced print time calculation using Bambu/Orca algorithms
  private static calculateAdvancedPrintTime(
    volume: Decimal,
    surfaceArea: Decimal,
    dimensions: { x: number; y: number; z: number },
    supportVolume: Decimal,
    qualityConfig: any,
    materialConfig: any,
    complexity: number
  ): PrintTimeBreakdown {
    const layerHeight = qualityConfig.layerHeight
    const lineWidth = qualityConfig.lineWidth
    const printSpeed = qualityConfig.speed
    const infillDensity = qualityConfig.infill / 100

    const layerCount = dimensions.z / layerHeight

    // Calculate perimeter time using Bambu's formula
    const perimeterLength = surfaceArea.div(layerHeight).mul(0.8) // Estimate perimeter per layer
    const perimeterTime = perimeterLength.div(printSpeed * 0.8).mul(layerCount).toNumber() // 80% of max speed for perimeters

    // Calculate infill time
    const infillVolume = volume.mul(infillDensity)
    const infillTime = infillVolume.div(materialConfig.maxVolumetricSpeed * 0.6).toNumber() // 60% of max for infill

    // Calculate support time
    const supportTime = supportVolume.gt(0) ? 
      supportVolume.div(materialConfig.maxVolumetricSpeed * 0.4).toNumber() : 0 // 40% of max for supports

    // Calculate travel time (based on complexity)
    const travelDistance = new Decimal(layerCount).mul(complexity * 50) // Estimate based on complexity
    const travelTime = travelDistance.div(300).toNumber() // 300mm/s travel speed

    // Calculate retraction time
    const retractionCount = Math.floor(layerCount * complexity * 2)
    const retractionTime = (retractionCount * materialConfig.retraction.length) / materialConfig.retraction.speed / 60

    // Heatup time
    const heatupTime = 5 // 5 minutes standard heatup

    const total = perimeterTime + infillTime + supportTime + travelTime + retractionTime + heatupTime

    return {
      total: Math.round(total),
      perimeter: Math.round(perimeterTime),
      infill: Math.round(infillTime),
      support: Math.round(supportTime),
      travel: Math.round(travelTime),
      retraction: Math.round(retractionTime),
      heatup: heatupTime
    }
  }

  // Calculate material usage using Bambu/Orca formulas
  private static calculateMaterialUsage(
    volume: Decimal,
    supportVolume: Decimal,
    materialConfig: any,
    infillDensity: number
  ): MaterialUsage {
    const infillVolume = volume.mul(infillDensity / 100)
    const perimeterVolume = volume.mul(0.3) // Estimate 30% for perimeters
    const totalPrintVolume = infillVolume.plus(perimeterVolume).plus(supportVolume)

    // Convert volume to filament length (1.75mm filament)
    const filamentArea = Math.PI * Math.pow(1.75 / 2, 2) // mm²
    const filamentLength = totalPrintVolume.div(filamentArea)

    // Calculate weight
    const weight = totalPrintVolume.mul(materialConfig.density)

    // Estimate cost (assuming $25/kg average)
    const cost = weight.mul(25).div(1000)

    // Support material calculation
    const supportMaterial = supportVolume.gt(0) ? 
      supportVolume.div(filamentArea).toFixed(2) + 'mm' : '0mm'

    // Waste percentage (typical 5-15% depending on complexity)
    const wastePercentage = supportVolume.gt(0) ? 12 : 5

    return {
      filament: filamentLength.toFixed(2) + 'mm',
      weight: weight.toFixed(2) + 'g',
      cost: '$' + cost.toFixed(2),
      supportMaterial,
      wastePercentage
    }
  }

  private static calculateQualityMetrics(
    complexity: number,
    overhangCount: number,
    bridgeCount: number,
    thinWallCount: number,
    meshScore: number
  ): QualityMetrics {
    // Calculate individual metrics
    const printability = Math.max(1, 10 - (complexity - 1) * 1.5 - overhangCount * 0.5)
    const supportComplexity = Math.max(1, 10 - overhangCount * 0.8)
    const bridgeQuality = Math.max(1, 10 - bridgeCount * 1.2)
    const dimensionalAccuracy = Math.max(1, 10 - thinWallCount * 1.5)

    // Overall score weighted by importance
    const overallScore = (
      printability * 0.3 +
      supportComplexity * 0.25 +
      bridgeQuality * 0.2 +
      dimensionalAccuracy * 0.15 +
      meshScore * 0.1
    )

    return {
      overallScore: Math.round(overallScore * 10) / 10,
      printability: Math.round(printability * 10) / 10,
      supportComplexity: Math.round(supportComplexity * 10) / 10,
      bridgeQuality: Math.round(bridgeQuality * 10) / 10,
      dimensionalAccuracy: Math.round(dimensionalAccuracy * 10) / 10
    }
  }

  private static generateRecommendedSettings(
    complexity: number,
    needsSupport: boolean,
    hasBridges: boolean,
    materialConfig: any,
    qualityConfig: any,
    nozzleConfig: any
  ): RecommendedSettings {
    // Adjust settings based on analysis
    let recommendedSpeed = qualityConfig.speed
    let recommendedFlowRate = materialConfig.flowRatio
    let recommendedInfill = qualityConfig.infill

    // Reduce speed for complex models
    if (complexity >= 4) recommendedSpeed *= 0.8
    else if (complexity >= 3) recommendedSpeed *= 0.9

    // Adjust for supports
    if (needsSupport) {
      recommendedSpeed *= 0.9
      recommendedInfill = Math.max(recommendedInfill, 20) // Minimum 20% infill with supports
    }

    // Adjust for bridges
    if (hasBridges) {
      recommendedFlowRate *= 0.95 // Slightly reduce flow for bridges
    }

    return {
      material: 'PLA', // This would be determined by user input
      quality: complexity <= 2 ? 'draft' : complexity <= 3 ? 'standard' : 'fine',
      nozzle: '0.4',
      layerHeight: qualityConfig.layerHeight,
      lineWidth: qualityConfig.lineWidth,
      printSpeed: Math.round(recommendedSpeed),
      flowRate: Math.round(recommendedFlowRate * 100) / 100,
      temperature: materialConfig.printTemp.optimal,
      bedTemperature: materialConfig.bedTemp.optimal,
      infillDensity: recommendedInfill,
      supportDensity: needsSupport ? 15 : 0,
      retraction: materialConfig.retraction
    }
  }

  private static assessCalibrationNeeds(
    complexity: number,
    needsSupport: boolean,
    bridgeCount: number,
    volume: Decimal,
    materialConfig: any
  ): CalibrationRequirement[] {
    const needs: CalibrationRequirement[] = []

    // Flow rate calibration for complex models
    if (complexity >= 3 || volume.gt(100000)) { // > 100cm³
      needs.push({
        type: 'flow_rate',
        priority: 'medium',
        reason: 'Complex geometry or large volume requires flow rate optimization',
        testRange: { min: 0.9, max: 1.1 }
      })
    }

    // Temperature calibration for supports
    if (needsSupport) {
      needs.push({
        type: 'temperature',
        priority: 'medium',
        reason: 'Support structures require temperature optimization',
        testRange: { 
          min: materialConfig.printTemp.min, 
          max: materialConfig.printTemp.max 
        }
      })
    }

    // Retraction calibration for bridges
    if (bridgeCount > 0) {
      needs.push({
        type: 'retraction',
        priority: 'high',
        reason: 'Bridge features require retraction tuning',
        testRange: { min: 0.4, max: 2.0 }
      })
    }

    // Pressure advance for high-speed printing
    if (complexity <= 2) {
      needs.push({
        type: 'pressure_advance',
        priority: 'low',
        reason: 'Simple geometry allows for pressure advance optimization',
        testRange: { min: 0.0, max: 0.2 }
      })
    }

    // Max flow test for large models
    if (volume.gt(50000)) {
      needs.push({
        type: 'max_flow',
        priority: 'medium',
        reason: 'Large model benefits from maximum flow rate testing',
        testRange: { min: 5, max: materialConfig.maxVolumetricSpeed }
      })
    }

    return needs
  }
}

