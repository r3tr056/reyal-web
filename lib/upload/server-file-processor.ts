export interface ModelAnalysis {
  volume: number
  surfaceArea: number
  dimensions: {
    x: number
    y: number
    z: number
  }
  boundingBox: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
  complexity: number
  supportRequired: boolean
  hollowPercentage: number
  printTime: number
  triangleCount: number
  vertexCount: number
}

export interface FileValidation {
  isValid: boolean
  errors: string[]
  fileType: string
  fileSize: number
}

export class ServerModelProcessor {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024
  private static readonly SUPPORTED_FORMATS = ['.stl', '.obj', '.3mf', '.ply']

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

    return {
      isValid: errors.length === 0,
      errors,
      fileType: fileExtension,
      fileSize
    }
  }

  static async analyzeSTL(buffer: ArrayBuffer): Promise<ModelAnalysis> {
    const dataView = new DataView(buffer)
    let offset = 80

    const triangleCount = dataView.getUint32(offset, true)
    offset += 4

    const vertices: number[][] = []
    const triangles: number[][] = []
    
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let minZ = Infinity, maxZ = -Infinity

    for (let i = 0; i < triangleCount; i++) {
      offset += 12

      const triangle = []
      for (let j = 0; j < 3; j++) {
        const x = dataView.getFloat32(offset, true)
        const y = dataView.getFloat32(offset + 4, true)
        const z = dataView.getFloat32(offset + 8, true)
        
        vertices.push([x, y, z])
        triangle.push(vertices.length - 1)
        
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
        minZ = Math.min(minZ, z)
        maxZ = Math.max(maxZ, z)
        
        offset += 12
      }
      triangles.push(triangle)
      offset += 2
    }

    const dimensions = {
      x: maxX - minX,
      y: maxY - minY,
      z: maxZ - minZ
    }

    const boundingBox = {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    }

    const volume = this.calculateVolumeFromTriangles(vertices, triangles)
    const surfaceArea = this.calculateSurfaceAreaFromTriangles(vertices, triangles)
    const complexity = this.calculateComplexity(triangleCount, vertices.length)
    const supportRequired = this.checkSupportRequirement(vertices, triangles)
    const hollowPercentage = this.calculateHollowPercentage(volume, dimensions)
    const printTime = this.estimatePrintTime(volume, complexity, dimensions.z)

    return {
      volume,
      surfaceArea,
      dimensions,
      boundingBox,
      complexity,
      supportRequired,
      hollowPercentage,
      printTime,
      triangleCount,
      vertexCount: vertices.length
    }
  }

  static async analyzeOBJ(text: string): Promise<ModelAnalysis> {
    const lines = text.split('\n')
    const vertices: number[][] = []
    const faces: number[][] = []
    
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let minZ = Infinity, maxZ = -Infinity

    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      
      if (parts[0] === 'v') {
        const x = parseFloat(parts[1])
        const y = parseFloat(parts[2])
        const z = parseFloat(parts[3])
        
        vertices.push([x, y, z])
        
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
        minZ = Math.min(minZ, z)
        maxZ = Math.max(maxZ, z)
      } else if (parts[0] === 'f') {
        const face = []
        for (let i = 1; i < parts.length; i++) {
          const vertexIndex = parseInt(parts[i].split('/')[0]) - 1
          face.push(vertexIndex)
        }
        if (face.length >= 3) {
          for (let i = 1; i < face.length - 1; i++) {
            faces.push([face[0], face[i], face[i + 1]])
          }
        }
      }
    }

    const dimensions = {
      x: maxX - minX,
      y: maxY - minY,
      z: maxZ - minZ
    }

    const boundingBox = {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    }

    const volume = this.calculateVolumeFromTriangles(vertices, faces)
    const surfaceArea = this.calculateSurfaceAreaFromTriangles(vertices, faces)
    const complexity = this.calculateComplexity(faces.length, vertices.length)
    const supportRequired = this.checkSupportRequirement(vertices, faces)
    const hollowPercentage = this.calculateHollowPercentage(volume, dimensions)
    const printTime = this.estimatePrintTime(volume, complexity, dimensions.z)

    return {
      volume,
      surfaceArea,
      dimensions,
      boundingBox,
      complexity,
      supportRequired,
      hollowPercentage,
      printTime,
      triangleCount: faces.length,
      vertexCount: vertices.length
    }
  }

  private static calculateVolumeFromTriangles(vertices: number[][], triangles: number[][]): number {
    let volume = 0
    
    for (const triangle of triangles) {
      const v0 = vertices[triangle[0]]
      const v1 = vertices[triangle[1]]
      const v2 = vertices[triangle[2]]
      
      if (v0 && v1 && v2) {
        const tetrahedronVolume = Math.abs(
          v0[0] * (v1[1] * v2[2] - v1[2] * v2[1]) +
          v1[0] * (v2[1] * v0[2] - v2[2] * v0[1]) +
          v2[0] * (v0[1] * v1[2] - v0[2] * v1[1])
        ) / 6
        volume += tetrahedronVolume
      }
    }
    
    return Math.abs(volume)
  }

  private static calculateSurfaceAreaFromTriangles(vertices: number[][], triangles: number[][]): number {
    let surfaceArea = 0
    
    for (const triangle of triangles) {
      const v0 = vertices[triangle[0]]
      const v1 = vertices[triangle[1]]
      const v2 = vertices[triangle[2]]
      
      if (v0 && v1 && v2) {
        const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]]
        const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]]
        
        const cross = [
          edge1[1] * edge2[2] - edge1[2] * edge2[1],
          edge1[2] * edge2[0] - edge1[0] * edge2[2],
          edge1[0] * edge2[1] - edge1[1] * edge2[0]
        ]
        
        const triangleArea = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]) / 2
        surfaceArea += triangleArea
      }
    }
    
    return surfaceArea
  }

  private static calculateComplexity(triangleCount: number, vertexCount: number): number {
    if (triangleCount > 100000 || vertexCount > 50000) return 5
    if (triangleCount > 50000 || vertexCount > 25000) return 4
    if (triangleCount > 10000 || vertexCount > 5000) return 3
    if (triangleCount > 1000 || vertexCount > 500) return 2
    return 1
  }

  private static checkSupportRequirement(vertices: number[][], triangles: number[][]): boolean {
    let overhangs = 0
    let bridgeCount = 0
    
    for (const triangle of triangles) {
      const v0 = vertices[triangle[0]]
      const v1 = vertices[triangle[1]]
      const v2 = vertices[triangle[2]]
      
      if (v0 && v1 && v2) {
        const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]]
        const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]]
        
        const normal = [
          edge1[1] * edge2[2] - edge1[2] * edge2[1],
          edge1[2] * edge2[0] - edge1[0] * edge2[2],
          edge1[0] * edge2[1] - edge1[1] * edge2[0]
        ]
        
        const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2])
        if (length > 0) {
          const normalZ = normal[2] / length
          
          if (normalZ < -0.7) {
            overhangs++
          }
          
          if (normalZ > -0.3 && normalZ < 0.3) {
            const avgZ = (v0[2] + v1[2] + v2[2]) / 3
            if (avgZ > 2) {
              bridgeCount++
            }
          }
        }
      }
    }
    
    const overhangRatio = overhangs / triangles.length
    const bridgeRatio = bridgeCount / triangles.length
    
    return overhangRatio > 0.05 || bridgeRatio > 0.02
  }

  private static calculateHollowPercentage(volume: number, dimensions: { x: number; y: number; z: number }): number {
    const boundingVolume = dimensions.x * dimensions.y * dimensions.z
    if (boundingVolume === 0) return 0
    
    const fillPercentage = (volume / boundingVolume) * 100
    return Math.max(0, Math.min(100 - fillPercentage, 95))
  }

  private static estimatePrintTime(volume: number, complexity: number, height: number): number {
    const layerHeight = 0.2
    const layerCount = height / layerHeight
    
    const baseSpeedMmMin = 200
    const complexitySpeedReduction = Math.max(0.3, 1 - (complexity - 1) * 0.15)
    const effectiveSpeed = baseSpeedMmMin * complexitySpeedReduction
    
    const volumePerLayer = volume / layerCount
    const perimeterLength = Math.sqrt(volumePerLayer) * 4
    const infillArea = volumePerLayer * 0.15
    
    const timePerLayer = (perimeterLength / (effectiveSpeed * 0.8)) + (infillArea / effectiveSpeed)
    const totalPrintTime = timePerLayer * layerCount
    
    const setupTime = 10
    const firstLayerTime = 5
    
    return Math.round(totalPrintTime + setupTime + firstLayerTime)
  }
}
