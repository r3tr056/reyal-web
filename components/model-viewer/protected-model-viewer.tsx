"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/store/hooks'
import {
  Eye,
  EyeOff,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Download,
  Shield,
  Lock,
  AlertTriangle,
  Maximize,
  Minimize,
  Settings,
  Info,
  Clock
} from 'lucide-react'

interface ModelViewerProps {
  fileId: string
  fileName: string
  fileUrl?: string
  allowDownload?: boolean
  watermarkText?: string
  viewTimeLimit?: number // in minutes
  accessLevel: 'preview' | 'full' | 'premium'
  onViewStart?: () => void
  onViewEnd?: () => void
  onUnauthorizedAccess?: () => void
}

interface DRMConfig {
  preventScreenshot: boolean
  preventRightClick: boolean
  addWatermark: boolean
  limitViewTime: boolean
  trackViewing: boolean
  allowFullscreen: boolean
}

export function ProtectedModelViewer({
  fileId,
  fileName,
  fileUrl,
  allowDownload = false,
  watermarkText = "REYAL 3D - Protected Content",
  viewTimeLimit = 30,
  accessLevel = 'preview',
  onViewStart,
  onViewEnd,
  onUnauthorizedAccess
}: ModelViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationRef = useRef<number | null>(null)
  const watermarkCanvasRef = useRef<HTMLCanvasElement>(null)
  
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [viewingTime, setViewingTime] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [protectionEnabled, setProtectionEnabled] = useState(true)
  const [modelStats, setModelStats] = useState({
    vertices: 0,
    faces: 0,
    boundingBox: { x: 0, y: 0, z: 0 }
  })

  // DRM Configuration based on access level
  const drmConfig: DRMConfig = {
    preventScreenshot: accessLevel === 'preview',
    preventRightClick: accessLevel !== 'premium',
    addWatermark: accessLevel !== 'premium',
    limitViewTime: accessLevel === 'preview',
    trackViewing: true,
    allowFullscreen: accessLevel !== 'preview'
  }

  // Initialize Three.js scene
  const initScene = useCallback(() => {
    if (!mountRef.current) return

    const width = mountRef.current.clientWidth
    const height = mountRef.current.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a1a)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(0, 0, 5)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !drmConfig.preventScreenshot })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enableZoom = true
    controls.enablePan = accessLevel !== 'preview'
    controlsRef.current = controls

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 5, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
    directionalLight2.position.set(-5, -5, -5)
    scene.add(directionalLight2)

    mountRef.current.appendChild(renderer.domElement)

    // Add watermark if enabled
    if (drmConfig.addWatermark) {
      addWatermark()
    }

    // Start animation loop
    animate()
  }, [accessLevel, drmConfig.addWatermark, drmConfig.preventScreenshot])

  // Add security watermark
  const addWatermark = useCallback(() => {
    if (!watermarkCanvasRef.current || !rendererRef.current) return

    const canvas = watermarkCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 400
    canvas.height = 100

    // Create watermark texture
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)' // emerald with transparency
    ctx.font = 'bold 24px Inter'
    ctx.textAlign = 'center'
    ctx.fillText(watermarkText, canvas.width / 2, 40)
    ctx.fillText(`User: ${user?.email?.substring(0, 20)}...`, canvas.width / 2, 70)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(2, 0.5, 1)
    sprite.position.set(0, 2, 0)
    
    sceneRef.current?.add(sprite)
  }, [watermarkText, user?.email])

  // Load 3D model
  const loadModel = useCallback(async () => {
    if (!fileUrl || !sceneRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      const extension = fileName.split('.').pop()?.toLowerCase()
      let loader: STLLoader | OBJLoader

      if (extension === 'stl') {
        loader = new STLLoader()
      } else if (extension === 'obj') {
        loader = new OBJLoader()
      } else {
        throw new Error('Unsupported file format')
      }

      // Load model with progress tracking
      const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
        if (loader instanceof STLLoader) {
          loader.load(
            fileUrl,
            (geometry) => resolve(geometry),
            (progress) => {
              console.log('Loading progress:', progress)
            },
            (error) => reject(error)
          )
        } else {
          // For OBJ loader, we need to handle it differently
          reject(new Error('OBJ loading not implemented'))
        }
      })

      // Create material based on access level
      let material: THREE.Material
      if (accessLevel === 'premium') {
        material = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          roughness: 0.4,
          metalness: 0.2
        })
      } else if (accessLevel === 'full') {
        material = new THREE.MeshLambertMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.9
        })
      } else {
        // Preview mode - wireframe
        material = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          wireframe: true,
          transparent: true,
          opacity: 0.7
        })
      }

      const mesh = new THREE.Mesh(geometry, material)
      mesh.receiveShadow = true
      mesh.castShadow = true

      // Center the model
      const box = new THREE.Box3().setFromObject(mesh)
      const center = box.getCenter(new THREE.Vector3())
      mesh.position.sub(center)

      // Scale model to fit in view
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 4 / maxDim
      mesh.scale.setScalar(scale)

      sceneRef.current.add(mesh)

      // Update model stats
      setModelStats({
        vertices: geometry.attributes.position.count,
        faces: geometry.attributes.position.count / 3,
        boundingBox: { x: size.x, y: size.y, z: size.z }
      })

      setModelLoaded(true)
      setIsLoading(false)
      onViewStart?.()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model')
      setIsLoading(false)
    }
  }, [fileUrl, fileName, accessLevel, onViewStart])

  // Animation loop
  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return

    animationRef.current = requestAnimationFrame(animate)
    
    controlsRef.current?.update()
    rendererRef.current.render(sceneRef.current, cameraRef.current)
  }, [])

  // Security measures
  useEffect(() => {
    if (!protectionEnabled) return

    const handleContextMenu = (e: MouseEvent) => {
      if (drmConfig.preventRightClick) {
        e.preventDefault()
        onUnauthorizedAccess?.()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common screenshot shortcuts
      if (drmConfig.preventScreenshot && (
        (e.ctrlKey && e.shiftKey && e.key === 'I') || // DevTools
        (e.ctrlKey && e.shiftKey && e.key === 'C') || // DevTools
        (e.key === 'F12') || // DevTools
        (e.key === 'PrintScreen') || // Screenshot
        (e.ctrlKey && e.key === 's') // Save
      )) {
        e.preventDefault()
        onUnauthorizedAccess?.()
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && modelLoaded) {
        // Pause or blur model when tab is not visible
        if (rendererRef.current) {
          rendererRef.current.domElement.style.filter = 'blur(10px)'
        }
      } else {
        if (rendererRef.current) {
          rendererRef.current.domElement.style.filter = 'none'
        }
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [drmConfig, protectionEnabled, onUnauthorizedAccess, modelLoaded])

  // View time tracking
  useEffect(() => {
    if (!modelLoaded || !drmConfig.limitViewTime) return

    const interval = setInterval(() => {
      setViewingTime(prev => {
        const newTime = prev + 1
        if (newTime >= viewTimeLimit * 60) {
          onViewEnd?.()
          // Could implement auto-logout or model hiding here
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [modelLoaded, drmConfig.limitViewTime, viewTimeLimit, onViewEnd])

  // Initialize scene on mount
  useEffect(() => {
    initScene()
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (rendererRef.current && mountRef.current?.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement)
      }
    }
  }, [initScene])

  // Load model when URL is available
  useEffect(() => {
    if (fileUrl) {
      loadModel()
    }
  }, [fileUrl, loadModel])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return

      const width = mountRef.current.clientWidth
      const height = mountRef.current.clientHeight

      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const resetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  const toggleFullscreen = () => {
    if (!drmConfig.allowFullscreen) return

    if (!isFullscreen) {
      mountRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div className="relative w-full h-full bg-gray-950 rounded-xl overflow-hidden">
      {/* Security Warning */}
      {drmConfig.addWatermark && (
        <div className="absolute top-4 left-4 z-20">
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <Shield className="h-3 w-3 mr-1" />
            Protected Content
          </Badge>
        </div>
      )}

      {/* Access Level Info */}
      <div className="absolute top-4 right-4 z-20">
        <Badge className={`${
          accessLevel === 'premium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
          accessLevel === 'full' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
          'bg-gray-500/20 text-gray-400 border-gray-500/30'
        }`}>
          {accessLevel.toUpperCase()} ACCESS
        </Badge>
      </div>

      {/* View Time Limit Warning */}
      {drmConfig.limitViewTime && modelLoaded && (
        <div className="absolute top-16 right-4 z-20">
          <Badge className={`${
            viewingTime > (viewTimeLimit * 60 * 0.8) ? 'bg-red-500/20 text-red-400 border-red-500/30' :
            'bg-orange-500/20 text-orange-400 border-orange-500/30'
          }`}>
            <Clock className="h-3 w-3 mr-1" />
            {formatTime((viewTimeLimit * 60) - viewingTime)} left
          </Badge>
        </div>
      )}

      {/* Main Viewer */}
      <div ref={mountRef} className="w-full h-96 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
            <div className="text-center text-white">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading 3D Model...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
            <div className="text-center text-red-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-4" />
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <div className="flex items-center justify-between bg-gray-800/80 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50">
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="ghost" onClick={resetView} className="text-gray-300 hover:text-white">
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            {drmConfig.allowFullscreen && (
              <Button size="sm" variant="ghost" onClick={toggleFullscreen} className="text-gray-300 hover:text-white">
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setProtectionEnabled(!protectionEnabled)}
              className="text-gray-300 hover:text-white"
            >
              {protectionEnabled ? <Lock className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>

          <div className="text-xs text-gray-400">
            {modelStats.vertices > 0 && (
              <span>{modelStats.vertices.toLocaleString()} vertices • {Math.round(modelStats.faces).toLocaleString()} faces</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {allowDownload && accessLevel === 'premium' && (
              <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300">
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            <div className="text-xs text-gray-400">
              {fileName}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden watermark canvas */}
      <canvas ref={watermarkCanvasRef} style={{ display: 'none' }} />

      {/* Access Level Restrictions Overlay */}
      {accessLevel === 'preview' && (
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent pointer-events-none z-10" />
      )}
    </div>
  )
}