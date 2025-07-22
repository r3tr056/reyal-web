import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { ModelProcessor, type ModelAnalysis, type PrintingSettings } from '@/lib/upload/server-file-processor'
import { 
  rateLimit, 
  sanitizeInput,
  createSecureResponse,
  logSecurityEvent
} from '@/lib/middleware/api-middleware'
import { randomUUID } from 'crypto'
import * as crypto from 'crypto'
import { ThumbnailService } from './thumbnail/tn-service'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = ['.stl', '.obj', '.3mf', '.ply']

const PrintingSettingsSchema = z.object({
  material: z.string().min(1).max(50),
  layer_height: z.number().min(0.1).max(1.0),
  infill_percentage: z.number().min(0).max(100),
  supports: z.boolean().default(false),
  quality: z.enum(['draft', 'standard', 'high']).default('standard')
}).strict()

export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS', {
        endpoint: '/api/upload',
        requestId
      })
      return createSecureResponse(
        { error: 'Authentication required' },
        401,
        requestId
      )
    }

    const rateLimitResult = await rateLimit('DEFAULT')(request, userId)
    if (!rateLimitResult.success) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        endpoint: '/api/upload',
        method: 'POST',
        requestId
      })
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait before uploading again.', 
          retryAfter: rateLimitResult.retryAfter 
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '0',
          }
        }
      )
    }

    const supabase = await createServerClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      await logSecurityEvent('INVALID_AUTHENTICATION', {
        endpoint: '/api/upload',
        userId,
        requestId
      })
      return createSecureResponse(
        { error: 'Invalid authentication' },
        401,
        requestId
      )
    }

    // Verify user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_verified, preferences')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      )
    }

    // Parse form data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid form data or file too large' },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File
    const printingSettings = formData.get('printingSettings') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file
    const validation = ModelProcessor.validateFile(file.name, file.size)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      )
    }

    // File security checks
    const fileBuffer = await file.arrayBuffer()
    const securityCheck = await performSecurityScan(file, fileBuffer)
    if (!securityCheck.safe) {
      return NextResponse.json(
        { error: securityCheck.reason },
        { status: 400 }
      )
    }

    // Generate secure filename and hash
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    const timestamp = Date.now()
    const randomString = crypto.randomBytes(16).toString('hex')
    const secureFilename = `${timestamp}_${randomString}${fileExt}`
    const filePath = `uploads/${userId}/${secureFilename}`
    const fileHash = crypto.createHash('sha256').update(new Uint8Array(fileBuffer)).digest('hex')

    // Check for duplicate files
    const { data: existingFile } = await supabase
      .from('files')
      .select('id, original_filename, analysis')
      .eq('user_id', userId)
      .eq('checksum', fileHash)
      .single()

    if (existingFile) {
      return NextResponse.json({
        success: true,
        data: {
          file: existingFile,
          analysisStatus: 'exists',
          message: 'File already exists in your library'
        },
      })
    }

    // Parse printing settings
    let parsedPrintingSettings: PrintingSettings = {
      material: 'PLA',
      quality: 'standard',
      nozzle: '0.4'
    }

    try {
      if (printingSettings) {
        const parsed = JSON.parse(printingSettings)
        const validated = PrintingSettingsSchema.parse(parsed)
        parsedPrintingSettings = { ...parsedPrintingSettings, ...validated }
      } else if (profile.preferences?.defaultPrintingSettings) {
        parsedPrintingSettings = { ...parsedPrintingSettings, ...profile.preferences.defaultPrintingSettings }
      }
    } catch (error) {
      console.warn('Invalid printing settings, using defaults:', error)
    }

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('model-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        metadata: {
          originalName: file.name,
          uploadedBy: userId,
          contentType: file.type,
          checksum: fileHash,
          printingSettings: JSON.stringify(parsedPrintingSettings),
        },
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage. Please try again.' },
        { status: 500 }
      )
    }

    // Save file metadata to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        original_filename: sanitizeInput(file.name),
        filename: secureFilename,
        file_path: filePath,
        file_size: file.size,
        file_type: fileExt,
        mime_type: file.type,
        checksum: fileHash,
        is_analyzed: false,
        analysis: null,
        thumbnail_url: null,
        printing_settings: parsedPrintingSettings,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Cleanup uploaded file
      await supabase.storage.from('model-files').remove([filePath]).catch(console.error)
      return NextResponse.json(
        { error: 'Failed to save file metadata. Please try again.' },
        { status: 500 }
      )
    }

    // Start background analysis
    startBackgroundAnalysis(fileRecord.id, filePath, fileExt, fileBuffer, userId, parsedPrintingSettings)
      .catch(error => console.error('Background analysis error:', error))

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action: 'file_upload',
        resource_type: 'file',
        resource_id: fileRecord.id,
        metadata: {
          filename: file.name,
          fileSize: file.size,
          fileType: fileExt,
          checksum: fileHash,
          printingSettings: parsedPrintingSettings,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })

    return NextResponse.json({
      success: true,
      data: {
        file: fileRecord,
        analysisStatus: 'pending',
        printingSettings: parsedPrintingSettings,
        message: 'File uploaded successfully. Analysis in progress...'
      },
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '10',
        'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '0',
      }
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}

async function startBackgroundAnalysis(
  fileId: string,
  filePath: string,
  fileType: string,
  fileBuffer: ArrayBuffer,
  userId: string,
  printingSettings: PrintingSettings
) {
  const supabase = await createServerClient()

  try {
    let analysis: ModelAnalysis

    // Analyze based on file type
    switch (fileType) {
      case '.stl':
        analysis = await ModelProcessor.analyzeSTL(fileBuffer, printingSettings)
        break
      case '.obj':
        const text = new TextDecoder().decode(fileBuffer)
        analysis = await ModelProcessor.analyzeOBJ(text, printingSettings)
        break
      case '.3mf':
        analysis = await analyze3MF(fileBuffer, printingSettings)
        break
      case '.ply':
        analysis = await analyzePLY(fileBuffer, printingSettings)
        break
      default:
        throw new Error(`Unsupported file format: ${fileType}`)
    }

    // Generate thumbnail
    const thumbnailUrl = await generateThumbnail(filePath, analysis, fileType, fileBuffer, printingSettings)

    // Update file with analysis
    const { error: updateError } = await supabase
      .from('files')
      .update({
        analysis: analysis,
        is_analyzed: true,
        thumbnail_url: thumbnailUrl,
      })
      .eq('id', fileId)

    if (updateError) {
      throw updateError
    }

    // Log successful analysis
    await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action: 'file_analyzed',
        resource_type: 'file',
        resource_id: fileId,
        metadata: {
          volume: analysis.volume,
          triangleCount: analysis.triangleCount,
          complexity: analysis.complexity,
          printTimeMinutes: analysis.printTime?.total,
        },
      })

  } catch (error) {
    console.error(`Analysis error for file ${fileId}:`, error)
    
    // Update file with error status
    await supabase
      .from('files')
      .update({
        is_analyzed: true,
        analysis: {
          error: 'Analysis failed',
          errorDetails: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      })
      .eq('id', fileId)
  }
}

async function performSecurityScan(file: File, fileBuffer: ArrayBuffer): Promise<{ safe: boolean; reason?: string }> {
  const fileSignature = await checkFileSignature(file.name, fileBuffer)
  if (!fileSignature.valid) {
    return { safe: false, reason: 'Invalid file format or corrupted file' }
  }

  // Check for suspicious patterns in OBJ files
  if (file.name.toLowerCase().endsWith('.obj')) {
    const fileContent = new TextDecoder('utf-8', { fatal: false }).decode(fileBuffer)
    const suspiciousPatterns = [
      /script/gi,
      /javascript/gi,
      /<\?php/gi,
      /eval\(/gi,
      /exec\(/gi,
    ]
    
    if (suspiciousPatterns.some(pattern => pattern.test(fileContent))) {
      return { safe: false, reason: 'File contains potentially malicious content' }
    }
  }

  return { safe: true }
}

async function checkFileSignature(filename: string, buffer: ArrayBuffer): Promise<{ valid: boolean }> {
  const bytes = new Uint8Array(buffer, 0, Math.min(100, buffer.byteLength))
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))

  switch (ext) {
    case '.stl':
      const header = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 5))
      if (header.toLowerCase().startsWith('solid')) return { valid: true }
      
      if (buffer.byteLength > 84) {
        const dataView = new DataView(buffer)
        const triangleCount = dataView.getUint32(80, true)
        const expectedSize = 84 + (triangleCount * 50)
        return { valid: Math.abs(buffer.byteLength - expectedSize) < 100 }
      }
      return { valid: false }
    
    case '.obj':
      const content = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
      return { valid: /^[#v f\s\d.\-+e\n\r]+/i.test(content.slice(0, 50)) }
    
    case '.3mf':
      return { valid: bytes[0] === 0x50 && bytes[1] === 0x4B }
    
    case '.ply':
      const plyHeader = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 3))
      return { valid: plyHeader.toLowerCase() === 'ply' }
    
    default:
      return { valid: false }
  }
}

// Placeholder implementations
async function analyze3MF(buffer: ArrayBuffer, settings: PrintingSettings): Promise<ModelAnalysis> {
  // Basic implementation - replace with actual 3MF parser
  return {
    volume: '1000.000000',
    surfaceArea: '600.000000',
    dimensions: { x: 10, y: 10, z: 10 },
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } },
    triangleCount: 100,
    vertexCount: 300,
    complexity: 3,
    supportRequired: false,
    printTime: { total: 120 }
  } as ModelAnalysis
}

async function analyzePLY(buffer: ArrayBuffer, settings: PrintingSettings): Promise<ModelAnalysis> {
  // Basic implementation - replace with actual PLY parser
  return analyze3MF(buffer, settings)
}

async function generateThumbnail(
  filePath: string, 
  analysis: ModelAnalysis, 
  fileType: string,
  fileBuffer: ArrayBuffer,
  printingSettings: PrintingSettings
): Promise<string | null> {
  try {
    const thumbnailService = new ThumbnailService()
    
    const result = await thumbnailService.generateThumbnail(
      filePath,
      fileType,
      fileBuffer,
      analysis,
      printingSettings,
      {
        material: printingSettings.material as any,
        quality: printingSettings.quality as any,
        showSupports: analysis.supportRequired,
        lighting: 'studio',
        background: 'gradient',
        cameraAngle: 'auto'
      }
    )

    if (!result) return null

    // Upload thumbnail
    const thumbnailPath = `thumbnails/${filePath.replace(/^uploads\//, '').replace(/\.[^.]+$/, '.jpg')}`
    const supabase = await createServerClient()
    
    const { error: uploadError } = await supabase
      .storage
      .from('model-files')
      .upload(thumbnailPath, result.buffer, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
      })

    if (uploadError) {
      console.error('Thumbnail upload error:', uploadError)
      return null
    }

    const { data: { publicUrl } } = supabase
      .storage
      .from('model-files')
      .getPublicUrl(thumbnailPath)

    return publicUrl

  } catch (error) {
    console.error('Thumbnail generation error:', error)
    return null
  }
}

export const runtime = 'nodejs'
export const maxDuration = 60
