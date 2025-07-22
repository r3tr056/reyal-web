import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { Canvas, createCanvas } from 'canvas'
import GL from 'gl'
import { ModelAnalysis, PrintingSettings } from '@/lib/upload/server-file-processor'

const THUMBNAIL_CONFIG = {
  width: 512,
  height: 512,
  quality: 0.9,
  format: 'image/jpeg',
  antialiasing: true,
  shadowMapping: true,
  maxFileSize: 2 * 1024 * 1024, // 2MB max thumbnail size
}

const MATERIAL_PRESETS = {
  PLA: {
    color: 0xf0f0f0,
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.1,
    clearcoatRoughness: 0.2,
    specular: 0x111111
  },
  PETG: {
    color: 0xe8e8e8,
    roughness: 0.15,
    metalness: 0.0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.1,
    specular: 0x222222,
    transparency: true,
    opacity: 0.95
  },
  ABS: {
    color: 0xdcdcdc,
    roughness: 0.4,
    metalness: 0.0,
    clearcoat: 0.05,
    clearcoatRoughness: 0.3,
    specular: 0x101010
  },
  TPU: {
    color: 0xf5f5f5,
    roughness: 0.7,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.8,
    specular: 0x050505,
    flexibility: true
  },
  Resin: {
    color: 0xfefefe,
    roughness: 0.1,
    metalness: 0.0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.05,
    specular: 0x444444,
    transparency: true,
    opacity: 0.98
  },
  Metal: {
    color: 0xc0c0c0,
    roughness: 0.2,
    metalness: 0.9,
    clearcoat: 0.0,
    clearcoatRoughness: 0.0,
    specular: 0x999999
  }
} as const

const QUALITY_PRESETS = {
  draft: {
    shadowMapSize: 512,
    antialias: false,
    samples: 1,
    bounces: 1
  },
  standard: {
    shadowMapSize: 1024,
    antialias: true,
    samples: 4,
    bounces: 2
  },
  fine: {
    shadowMapSize: 2048,
    antialias: true,
    samples: 8,
    bounces: 3
  },
  ultra: {
    shadowMapSize: 4096,
    antialias: true,
    samples: 16,
    bounces: 4
  }
} as const

export interface ThumbnailOptions {
  material?: keyof typeof MATERIAL_PRESETS
  quality?: keyof typeof QUALITY_PRESETS
  customColor?: string
  showSupports?: boolean
  showOverhangs?: boolean
  showBuildPlate?: boolean
  cameraAngle?: 'isometric' | 'front' | 'side' | 'top' | 'auto'
  lighting?: 'studio' | 'natural' | 'dramatic' | 'technical'
  background?: 'transparent' | 'gradient' | 'solid' | 'environment'
  annotations?: boolean
}

export class ThumbnailService {
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private canvas!: Canvas
  private gl: any
  
  constructor() {
    this.initializeRenderer()
  }

  private initializeRenderer(): void {
    // Create headless WebGL context
    this.canvas = createCanvas(THUMBNAIL_CONFIG.width, THUMBNAIL_CONFIG.height)
    this.gl = GL(THUMBNAIL_CONFIG.width, THUMBNAIL_CONFIG.height, {
      preserveDrawingBuffer: true,
      antialias: THUMBNAIL_CONFIG.antialiasing,
      alpha: true,
      stencil: true,
      depth: true
    })

    // Initialize Three.js renderer with headless context
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas as any,
      context: this.gl,
      antialias: THUMBNAIL_CONFIG.antialiasing,
      alpha: true,
      preserveDrawingBuffer: true
    })

    this.renderer.setSize(THUMBNAIL_CONFIG.width, THUMBNAIL_CONFIG.height)
    this.renderer.setPixelRatio(2) // High DPI rendering
    
    // Enable advanced rendering features
    this.renderer.shadowMap.enabled = THUMBNAIL_CONFIG.shadowMapping
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.scene = new THREE.Scene()
    
    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      THUMBNAIL_CONFIG.width / THUMBNAIL_CONFIG.height,
      0.1,
      10000
    )
  }

  async generateThumbnail(
    filePath: string,
    fileType: string,
    fileBuffer: ArrayBuffer,
    analysis: ModelAnalysis,
    printingSettings: PrintingSettings,
    options: ThumbnailOptions = {}
  ): Promise<{ buffer: Buffer; metadata: any } | null> {
    try {
      // Set default options
      const opts: Required<ThumbnailOptions> = {
        material: (printingSettings.material as keyof typeof MATERIAL_PRESETS) || 'PLA',
        quality: (printingSettings.quality as keyof typeof QUALITY_PRESETS) || 'standard',
        customColor: options.customColor || '',
        showSupports: options.showSupports ?? analysis.supportRequired,
        showOverhangs: options.showOverhangs ?? analysis.overhangAreas.length > 0,
        showBuildPlate: options.showBuildPlate ?? true,
        cameraAngle: options.cameraAngle || 'auto',
        lighting: options.lighting || 'studio',
        background: options.background || 'gradient',
        annotations: options.annotations ?? false
      }

      // Clear scene
      this.clearScene()

      // Load 3D model
      const model = await this.loadModel(fileBuffer, fileType)
      if (!model) {
        throw new Error('Failed to load 3D model')
      }

      // Apply realistic materials
      await this.applyRealisticMaterials(model, opts, analysis)

      // Add model to scene
      this.scene.add(model)

      // Add support structures if needed
      if (opts.showSupports && analysis.supportRequired) {
        const supports = this.generateSupportVisualization(analysis.overhangAreas, model)
        this.scene.add(supports)
      }

      // Add overhang indicators
      if (opts.showOverhangs && analysis.overhangAreas.length > 0) {
        const overhangs = this.generateOverhangVisualization(analysis.overhangAreas, model)
        this.scene.add(overhangs)
      }

      // Add build plate
      if (opts.showBuildPlate) {
        const buildPlate = this.createBuildPlate(analysis.dimensions)
        this.scene.add(buildPlate)
      }

      // Setup lighting
      this.setupLighting(opts.lighting, opts.quality)

      // Setup background
      this.setupBackground(opts.background)

      // Position camera
      this.positionCamera(model, opts.cameraAngle, analysis.dimensions)

      // Add annotations if needed
      if (opts.annotations) {
        await this.addAnnotations(analysis, printingSettings)
      }

      // Configure render quality
      this.configureRenderQuality(opts.quality)

      // Render scene
      this.renderer.render(this.scene, this.camera)

      // Extract image data
      const imageBuffer = this.extractImageBuffer()

      // Generate metadata
      const metadata = {
        width: THUMBNAIL_CONFIG.width,
        height: THUMBNAIL_CONFIG.height,
        format: THUMBNAIL_CONFIG.format,
        quality: opts.quality,
        material: opts.material,
        lighting: opts.lighting,
        cameraAngle: opts.cameraAngle,
        renderTime: Date.now(),
        modelInfo: {
          volume: analysis.volume,
          complexity: analysis.complexity,
          supportRequired: analysis.supportRequired,
          triangleCount: analysis.triangleCount
        },
        renderingOptions: opts
      }

      return {
        buffer: imageBuffer,
        metadata
      }

    } catch (error) {
      console.error('Thumbnail generation error:', error)
      return null
    }
  }

  private async loadModel(buffer: ArrayBuffer, fileType: string): Promise<THREE.Object3D | null> {
    try {
      let model: THREE.Object3D

      switch (fileType.toLowerCase()) {
        case '.stl':
          model = await this.loadSTL(buffer)
          break
        case '.obj':
          model = await this.loadOBJ(buffer)
          break
        case '.ply':
          model = await this.loadPLY(buffer)
          break
        case '.3mf':
          model = await this.load3MF(buffer)
          break
        default:
          throw new Error(`Unsupported file format: ${fileType}`)
      }

      // Center and scale model
      this.centerAndScaleModel(model)
      
      return model

    } catch (error) {
      console.error(`Error loading ${fileType} model:`, error)
      return null
    }
  }

  private async loadSTL(buffer: ArrayBuffer): Promise<THREE.Object3D> {
    const loader = new STLLoader()
    const geometry = loader.parse(buffer)
    
    // Compute normals for smooth shading
    geometry.computeVertexNormals()
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    
    const mesh = new THREE.Mesh(geometry)
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    return mesh
  }

  private async loadOBJ(buffer: ArrayBuffer): Promise<THREE.Object3D> {
    const loader = new OBJLoader()
    const text = new TextDecoder().decode(buffer)
    const group = loader.parse(text)
    
    // Process all meshes in the group
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.computeVertexNormals()
        child.geometry.computeBoundingBox()
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    return group
  }

  private async loadPLY(buffer: ArrayBuffer): Promise<THREE.Object3D> {
    const loader = new PLYLoader()
    const geometry = loader.parse(buffer)
    
    geometry.computeVertexNormals()
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    
    const mesh = new THREE.Mesh(geometry)
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    return mesh
  }

  private async load3MF(buffer: ArrayBuffer): Promise<THREE.Object3D> {
    // 3MF files are ZIP-based, would need specialized loader
    // For now, create placeholder geometry
    const geometry = new THREE.BoxGeometry(10, 10, 10)
    const mesh = new THREE.Mesh(geometry)
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    return mesh
  }

  private centerAndScaleModel(model: THREE.Object3D): void {
    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    
    // Center the model
    model.position.sub(center)
    
    // Scale to fit in viewport (max dimension = 100 units)
    const maxDimension = Math.max(size.x, size.y, size.z)
    if (maxDimension > 0) {
      const scale = 100 / maxDimension
      model.scale.setScalar(scale)
    }
    
    // Position slightly above build plate
    model.position.y += 0.1
  }

  private async applyRealisticMaterials(
    model: THREE.Object3D,
    options: Required<ThumbnailOptions>,
    analysis: ModelAnalysis
  ): Promise<void> {
    const materialPreset = MATERIAL_PRESETS[options.material]
    
    // Create physically-based material
    const material = new THREE.MeshPhysicalMaterial({
      color: options.customColor ? new THREE.Color(options.customColor) : materialPreset.color,
      roughness: materialPreset.roughness,
      metalness: materialPreset.metalness,
      clearcoat: materialPreset.clearcoat,
      clearcoatRoughness: materialPreset.clearcoatRoughness,
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide,
      normalScale: new THREE.Vector2(0.1, 0.1),
      bumpScale: 0.02
    })

    // Add procedural layer lines texture for 3D printing realism
    if (options.quality !== 'draft') {
      const layerLinesTexture = this.generateLayerLinesTexture(
        parseFloat(analysis.recommendedSettings?.layerHeight?.toString() || '0.2')
      )
      material.normalMap = layerLinesTexture
      material.bumpMap = layerLinesTexture
    }

    // Add surface roughness variation
    if (options.quality === 'ultra') {
      const roughnessTexture = this.generateSurfaceRoughnessTexture()
      material.roughnessMap = roughnessTexture
    }

    // Apply material to all meshes
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material
        
        // Add edge highlighting for technical look
        if (options.lighting === 'technical') {
          const edges = new THREE.EdgesGeometry(child.geometry)
          const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x404040, 
            opacity: 0.3, 
            transparent: true 
          })
          const wireframe = new THREE.LineSegments(edges, edgeMaterial)
          child.add(wireframe)
        }
      }
    })
  }

  private generateLayerLinesTexture(layerHeight: number): THREE.DataTexture {
    const size = 512
    const data = new Uint8Array(size * size * 4)
    
    const layerPixelHeight = Math.max(1, Math.floor(size * layerHeight / 10))
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = (i * size + j) * 4
        
        // Create horizontal layer lines
        const isLayerLine = (i % layerPixelHeight) < (layerPixelHeight * 0.3)
        const intensity = isLayerLine ? 0.7 : 1.0
        
        data[index] = 128 * intensity     // R
        data[index + 1] = 128 * intensity // G
        data[index + 2] = 255 * intensity // B (normal Z)
        data[index + 3] = 255             // A
      }
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 20) // Repeat vertically for layer effect
    texture.needsUpdate = true
    
    return texture
  }

  private generateSurfaceRoughnessTexture(): THREE.DataTexture {
    const size = 256
    const data = new Uint8Array(size * size)
    
    for (let i = 0; i < size * size; i++) {
      // Add noise for surface variation
      data[i] = Math.floor(128 + Math.random() * 64)
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    texture.needsUpdate = true
    
    return texture
  }

  private setupLighting(lightingType: string, quality: keyof typeof QUALITY_PRESETS): void {
    // Remove existing lights
    const existingLights = this.scene.children.filter(child => child instanceof THREE.Light)
    existingLights.forEach(light => this.scene.remove(light))

    const qualitySettings = QUALITY_PRESETS[quality]

    switch (lightingType) {
      case 'studio':
        this.setupStudioLighting(qualitySettings)
        break
      case 'natural':
        this.setupNaturalLighting(qualitySettings)
        break
      case 'dramatic':
        this.setupDramaticLighting(qualitySettings)
        break
      case 'technical':
        this.setupTechnicalLighting(qualitySettings)
        break
    }

    // Add ambient light for fill
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
    this.scene.add(ambientLight)
  }

  private setupStudioLighting(qualitySettings: any): void {
    // Key light (main)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5)
    keyLight.position.set(100, 100, 50)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = qualitySettings.shadowMapSize
    keyLight.shadow.mapSize.height = qualitySettings.shadowMapSize
    keyLight.shadow.camera.near = 0.1
    keyLight.shadow.camera.far = 500
    keyLight.shadow.camera.left = -100
    keyLight.shadow.camera.right = 100
    keyLight.shadow.camera.top = 100
    keyLight.shadow.camera.bottom = -100
    this.scene.add(keyLight)

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.7)
    fillLight.position.set(-50, 50, 50)
    this.scene.add(fillLight)

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5)
    rimLight.position.set(0, 0, -100)
    this.scene.add(rimLight)

    // Environment light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4)
    this.scene.add(hemiLight)
  }

  private setupNaturalLighting(qualitySettings: any): void {
    // Sun light
    const sunLight = new THREE.DirectionalLight(0xfff4e6, 2.0)
    sunLight.position.set(50, 100, 30)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = qualitySettings.shadowMapSize
    sunLight.shadow.mapSize.height = qualitySettings.shadowMapSize
    this.scene.add(sunLight)

    // Sky light
    const skyLight = new THREE.HemisphereLight(0x87CEEB, 0x98FB98, 0.6)
    this.scene.add(skyLight)
  }

  private setupDramaticLighting(qualitySettings: any): void {
    // Strong directional light
    const mainLight = new THREE.SpotLight(0xffffff, 2.5)
    mainLight.position.set(80, 120, 40)
    mainLight.angle = Math.PI / 6
    mainLight.penumbra = 0.3
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = qualitySettings.shadowMapSize
    mainLight.shadow.mapSize.height = qualitySettings.shadowMapSize
    this.scene.add(mainLight)

    // Colored accent light
    const accentLight = new THREE.DirectionalLight(0x4169E1, 0.8)
    accentLight.position.set(-60, 30, -40)
    this.scene.add(accentLight)
  }

  private setupTechnicalLighting(qualitySettings: any): void {
    // Even, diffuse lighting
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.2)
    frontLight.position.set(0, 0, 100)
    this.scene.add(frontLight)

    const backLight = new THREE.DirectionalLight(0xffffff, 0.8)
    backLight.position.set(0, 0, -100)
    this.scene.add(backLight)

    const topLight = new THREE.DirectionalLight(0xffffff, 1.0)
    topLight.position.set(0, 100, 0)
    topLight.castShadow = true
    topLight.shadow.mapSize.width = qualitySettings.shadowMapSize
    topLight.shadow.mapSize.height = qualitySettings.shadowMapSize
    this.scene.add(topLight)
  }

  private setupBackground(backgroundType: string): void {
    switch (backgroundType) {
      case 'transparent':
        this.scene.background = null
        this.renderer.setClearColor(0x000000, 0)
        break
      case 'gradient':
        this.scene.background = this.createGradientBackground()
        break
      case 'solid':
        this.scene.background = new THREE.Color(0xf0f0f0)
        break
      case 'environment':
        this.scene.background = this.createEnvironmentBackground()
        break
    }
  }

  private createGradientBackground(): THREE.CubeTexture {
    const size = 256
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')
    
    const gradient = ctx.createLinearGradient(0, 0, 0, size)
    gradient.addColorStop(0, '#f0f8ff')
    gradient.addColorStop(1, '#e6f3ff')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    
    const texture = new THREE.CanvasTexture(canvas as any)
    
    // Create cube texture from single gradient
    const cubeTexture = new THREE.CubeTexture([
      texture.image, texture.image, texture.image,
      texture.image, texture.image, texture.image
    ])
    cubeTexture.needsUpdate = true
    
    return cubeTexture
  }

  private createEnvironmentBackground(): THREE.Color {
    // Simple environment color for now
    return new THREE.Color(0xe0e8f0)
  }

  private positionCamera(
    model: THREE.Object3D, 
    angle: string, 
    dimensions: { x: number; y: number; z: number }
  ): void {
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    
    let cameraPosition: THREE.Vector3

    switch (angle) {
      case 'front':
        cameraPosition = new THREE.Vector3(0, 0, maxDim * 2)
        break
      case 'side':
        cameraPosition = new THREE.Vector3(maxDim * 2, 0, 0)
        break
      case 'top':
        cameraPosition = new THREE.Vector3(0, maxDim * 2, 0)
        break
      case 'isometric':
        cameraPosition = new THREE.Vector3(
          maxDim * 1.5, 
          maxDim * 1.2, 
          maxDim * 1.5
        )
        break
      case 'auto':
      default:
        // Choose best angle based on model dimensions
        if (dimensions.z > dimensions.x && dimensions.z > dimensions.y) {
          // Tall object - use isometric
          cameraPosition = new THREE.Vector3(
            maxDim * 1.5, 
            maxDim * 1.2, 
            maxDim * 1.5
          )
        } else {
          // Wide or deep object - use elevated front view
          cameraPosition = new THREE.Vector3(
            maxDim * 0.5, 
            maxDim * 0.8, 
            maxDim * 2
          )
        }
        break
    }

    this.camera.position.copy(cameraPosition)
    this.camera.lookAt(center)
    this.camera.updateProjectionMatrix()
  }

  private generateSupportVisualization(
    overhangAreas: any[], 
    model: THREE.Object3D
  ): THREE.Group {
    const supportGroup = new THREE.Group()
    
    const supportMaterial = new THREE.MeshLambertMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.6,
      wireframe: true
    })

    overhangAreas.forEach(area => {
      if (area.supportRequired) {
        // Create simple support pillar
        const supportGeometry = new THREE.CylinderGeometry(0.5, 0.8, area.position.z, 8)
        const support = new THREE.Mesh(supportGeometry, supportMaterial)
        support.position.set(area.position.x, area.position.z / 2, area.position.y)
        supportGroup.add(support)
      }
    })

    return supportGroup
  }

  private generateOverhangVisualization(
    overhangAreas: any[], 
    model: THREE.Object3D
  ): THREE.Group {
    const overhangGroup = new THREE.Group()
    
    const overhangMaterial = new THREE.MeshBasicMaterial({
      color: 0xffa500,
      transparent: true,
      opacity: 0.4
    })

    overhangAreas.forEach(area => {
      // Create sphere to indicate overhang area
      const overhangGeometry = new THREE.SphereGeometry(Math.sqrt(area.area), 8, 6)
      const overhang = new THREE.Mesh(overhangGeometry, overhangMaterial)
      overhang.position.set(area.position.x, area.position.z, area.position.y)
      overhangGroup.add(overhang)
    })

    return overhangGroup
  }

  private createBuildPlate(dimensions: { x: number; y: number; z: number }): THREE.Mesh {
    const plateSize = Math.max(dimensions.x, dimensions.y) * 1.5
    const plateGeometry = new THREE.PlaneGeometry(plateSize, plateSize)
    const plateMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2c3e50,
      roughness: 0.8,
      metalness: 0.2,
      clearcoat: 0.1
    })
    
    const buildPlate = new THREE.Mesh(plateGeometry, plateMaterial)
    buildPlate.rotation.x = -Math.PI / 2
    buildPlate.position.y = -0.1
    buildPlate.receiveShadow = true
    
    // Add grid pattern
    const gridSize = plateSize / 20
    const grid = new THREE.GridHelper(plateSize, 20, 0x34495e, 0x34495e)
    grid.position.y = -0.05
    
    const group = new THREE.Group()
    group.add(buildPlate)
    group.add(grid)
    
    return group as any
  }

  private async addAnnotations(
    analysis: ModelAnalysis, 
    settings: PrintingSettings
  ): Promise<void> {
    // Create text sprites for annotations
    const annotations = [
      `Volume: ${parseFloat(analysis.volume).toFixed(1)} cm³`,
      `Print Time: ${analysis.printTime.total}min`,
      `Material: ${settings.material || 'PLA'}`,
      `Support: ${analysis.supportRequired ? 'Required' : 'None'}`
    ]

    // This would require canvas-based text rendering
    // Implementation would create texture-based text sprites
    // positioned around the model
  }

  private configureRenderQuality(quality: keyof typeof QUALITY_PRESETS): void {
    const settings = QUALITY_PRESETS[quality]
    
    // Configure renderer based on quality
    if (settings.antialias) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    }
    
    // Configure shadow quality
    if (this.renderer.shadowMap.enabled) {
      this.scene.children.forEach(child => {
        if (child instanceof THREE.DirectionalLight || child instanceof THREE.SpotLight) {
          if (child.shadow) {
            child.shadow.mapSize.width = settings.shadowMapSize
            child.shadow.mapSize.height = settings.shadowMapSize
          }
        }
      })
    }
  }

  private extractImageBuffer(): Buffer {
    // Read pixels from WebGL context
    const pixels = new Uint8Array(THUMBNAIL_CONFIG.width * THUMBNAIL_CONFIG.height * 4)
    this.gl.readPixels(
      0, 0, 
      THUMBNAIL_CONFIG.width, 
      THUMBNAIL_CONFIG.height,
      this.gl.RGBA, 
      this.gl.UNSIGNED_BYTE, 
      pixels
    )

    // Flip Y axis (OpenGL renders upside down)
    const flippedPixels = new Uint8Array(pixels.length)
    for (let y = 0; y < THUMBNAIL_CONFIG.height; y++) {
      for (let x = 0; x < THUMBNAIL_CONFIG.width; x++) {
        const srcIndex = ((THUMBNAIL_CONFIG.height - 1 - y) * THUMBNAIL_CONFIG.width + x) * 4
        const destIndex = (y * THUMBNAIL_CONFIG.width + x) * 4
        
        flippedPixels[destIndex] = pixels[srcIndex]
        flippedPixels[destIndex + 1] = pixels[srcIndex + 1]
        flippedPixels[destIndex + 2] = pixels[srcIndex + 2]
        flippedPixels[destIndex + 3] = pixels[srcIndex + 3]
      }
    }

    // Convert RGBA to JPEG using canvas
    const canvas = createCanvas(THUMBNAIL_CONFIG.width, THUMBNAIL_CONFIG.height)
    const ctx = canvas.getContext('2d')
    const imageData = ctx.createImageData(THUMBNAIL_CONFIG.width, THUMBNAIL_CONFIG.height)
    imageData.data.set(flippedPixels)
    ctx.putImageData(imageData, 0, 0)

    // Return JPEG buffer
    return canvas.toBuffer('image/jpeg', { quality: THUMBNAIL_CONFIG.quality })
  }

  private clearScene(): void {
    // Remove all objects except lights
    const objectsToRemove = this.scene.children.filter(
      child => !(child instanceof THREE.Light)
    )
    objectsToRemove.forEach(obj => this.scene.remove(obj))
  }

  dispose(): void {
    if (this.renderer) {
      this.renderer.dispose()
    }
    if (this.gl) {
      this.gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }
}