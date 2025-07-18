import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { supabase } from '@/lib/supabase/client'

export interface UploadedFile {
  id: string
  user_id: string
  original_filename: string
  file_type: string
  file_size: number
  file_url: string
  upload_status: 'pending' | 'analyzing' | 'completed' | 'failed'
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed'
  analysis_results?: {
    volume: number
    surface_area: number
    bounding_box: {
      width: number
      height: number
      depth: number
    }
    is_printable: boolean
    issues?: string[]
    material_usage: number
    estimated_print_time: number
  }
  quotes?: Quote[]
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  file_id: string
  user_id: string
  material: string
  quality: string
  infill_percentage: number
  layer_height: number
  color?: string
  estimated_print_time: number
  material_cost: number
  printing_cost: number
  post_processing_cost: number
  total_cost: number
  settings: {
    material: string
    quality: string
    infill_percentage: number
    layer_height: number
    color?: string
    supports: boolean
    rafts: boolean
  }
  status: 'active' | 'expired'
  expires_at: string
  created_at: string
}

export interface UploadState {
  files: UploadedFile[]
  currentFile: UploadedFile | null
  quotes: Quote[]
  currentQuote: Quote | null
  uploading: boolean
  analyzing: boolean
  generatingQuote: boolean
  error: string | null
  uploadProgress: number
  dragActive: boolean
  supportedFormats: string[]
  maxFileSize: number
  recentUploads: UploadedFile[]
}

const initialState: UploadState = {
  files: [],
  currentFile: null,
  quotes: [],
  currentQuote: null,
  uploading: false,
  analyzing: false,
  generatingQuote: false,
  error: null,
  uploadProgress: 0,
  dragActive: false,
  supportedFormats: ['.stl', '.obj', '.3mf', '.ply'],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  recentUploads: [],
}

export const uploadFile = createAsyncThunk(
  'upload/uploadFile',
  async (
    { file, filename }: { file: File; filename: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const { data: { user } } = await supabase().auth.getUser()
      
      if (!user) {
        return rejectWithValue('Please sign in to upload files')
      }

      // Validate file type
      const fileExtension = filename.toLowerCase().split('.').pop()
      const supportedFormats = ['stl', 'obj', '3mf', 'ply']
      
      if (!fileExtension || !supportedFormats.includes(fileExtension)) {
        return rejectWithValue(`Unsupported file format. Please use: ${supportedFormats.join(', ')}`)
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        return rejectWithValue('File size must be less than 50MB')
      }

      dispatch(setUploadProgress(10))

      // Generate unique filename
      const timestamp = Date.now()
      const uniqueFilename = `${user.id}/${timestamp}_${filename}`

      dispatch(setUploadProgress(20))

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase()
        .storage
        .from('3d-files')
        .upload(uniqueFilename, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return rejectWithValue(uploadError.message)
      }

      dispatch(setUploadProgress(60))

      // Get public URL
      const { data: { publicUrl } } = supabase()
        .storage
        .from('3d-files')
        .getPublicUrl(uploadData.path)

      dispatch(setUploadProgress(80))

      // Save file metadata to database
      const { data: fileRecord, error: dbError } = await supabase()
        .from('files')
        .insert({
          user_id: user.id,
          original_filename: filename,
          file_type: fileExtension,
          file_size: file.size,
          file_url: publicUrl,
          upload_status: 'completed',
          analysis_status: 'pending',
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        // Clean up uploaded file
        await supabase().storage.from('3d-files').remove([uploadData.path])
        return rejectWithValue(dbError.message)
      }

      dispatch(setUploadProgress(100))

      // Start file analysis
      dispatch(analyzeFile(fileRecord.id))

      return fileRecord
    } catch (error: any) {
      console.error('Upload error:', error)
      return rejectWithValue('Failed to upload file')
    }
  }
)

export const analyzeFile = createAsyncThunk(
  'upload/analyzeFile',
  async (fileId: string, { rejectWithValue }) => {
    try {
      // Update analysis status
      await supabase()
        .from('files')
        .update({ analysis_status: 'analyzing' })
        .eq('id', fileId)

      // Call analysis API endpoint
      const response = await fetch('/api/files/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return rejectWithValue(errorData.error || 'Analysis failed')
      }

      const result = await response.json()
      return result
    } catch (error: any) {
      console.error('Analysis error:', error)
      return rejectWithValue('Failed to analyze file')
    }
  }
)

export const generateQuote = createAsyncThunk(
  'upload/generateQuote',
  async (
    {
      fileId,
      material,
      quality,
      infill,
      color,
    }: {
      fileId: string
      material: string
      quality: string
      infill: number
      color?: string
    },
    { rejectWithValue }
  ) => {
    try {
      const { data: { user } } = await supabase().auth.getUser()
      
      if (!user) {
        return rejectWithValue('Please sign in to generate quotes')
      }

      // Call quote generation API
      const response = await fetch('/api/quotes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          settings: {
            material,
            quality,
            infill_percentage: infill,
            color,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return rejectWithValue(errorData.error || 'Quote generation failed')
      }

      const quote = await response.json()
      return quote
    } catch (error: any) {
      console.error('Quote generation error:', error)
      return rejectWithValue('Failed to generate quote')
    }
  }
)

export const fetchUserFiles = createAsyncThunk(
  'upload/fetchUserFiles',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase().auth.getUser()
      
      if (!user) {
        return rejectWithValue('User not authenticated')
      }

      const { data, error } = await supabase()
        .from('files')
        .select(`
          *,
          quotes (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user files:', error)
        return rejectWithValue(error.message)
      }

      return data || []
    } catch (error: any) {
      console.error('Error fetching user files:', error)
      return rejectWithValue('Failed to fetch files')
    }
  }
)

export const deleteFile = createAsyncThunk(
  'upload/deleteFile',
  async (fileId: string, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase().auth.getUser()
      
      if (!user) {
        return rejectWithValue('User not authenticated')
      }

      // Get file details first
      const { data: file, error: fetchError } = await supabase()
        .from('files')
        .select('file_url')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        console.error('Error fetching file:', fetchError)
        return rejectWithValue(fetchError.message)
      }

      // Delete from database first
      const { error: dbError } = await supabase()
        .from('files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', user.id)

      if (dbError) {
        console.error('Error deleting file from database:', dbError)
        return rejectWithValue(dbError.message)
      }

      // Extract file path from URL and delete from storage
      if (file.file_url) {
        const urlParts = file.file_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const filePath = `${user.id}/${fileName}`
        
        const { error: storageError } = await supabase()
          .storage
          .from('3d-files')
          .remove([filePath])

        if (storageError) {
          console.warn('Error deleting file from storage:', storageError)
          // Don't fail the operation if storage deletion fails
        }
      }

      return fileId
    } catch (error: any) {
      console.error('Error deleting file:', error)
      return rejectWithValue('Failed to delete file')
    }
  }
)

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload
    },
    resetUploadProgress: (state) => {
      state.uploadProgress = 0
    },
    setDragActive: (state, action: PayloadAction<boolean>) => {
      state.dragActive = action.payload
    },
    setCurrentFile: (state, action: PayloadAction<UploadedFile | null>) => {
      state.currentFile = action.payload
    },
    setCurrentQuote: (state, action: PayloadAction<Quote | null>) => {
      state.currentQuote = action.payload
    },
    clearFiles: (state) => {
      state.files = []
      state.currentFile = null
    },
    clearQuotes: (state) => {
      state.quotes = []
      state.currentQuote = null
    },
    addToRecentUploads: (state, action: PayloadAction<UploadedFile>) => {
      state.recentUploads.unshift(action.payload)
      // Keep only last 10 recent uploads
      if (state.recentUploads.length > 10) {
        state.recentUploads = state.recentUploads.slice(0, 10)
      }
    },
  },
  extraReducers: (builder) => {
    // Upload File
    builder
      .addCase(uploadFile.pending, (state) => {
        state.uploading = true
        state.error = null
        state.uploadProgress = 0
      })
      .addCase(uploadFile.fulfilled, (state, action) => {
        state.uploading = false
        state.files.unshift(action.payload)
        state.currentFile = action.payload
        state.uploadProgress = 100
        state.error = null
      })
      .addCase(uploadFile.rejected, (state, action) => {
        state.uploading = false
        state.uploadProgress = 0
        state.error = action.payload as string
      })

    // Analyze File
    builder
      .addCase(analyzeFile.pending, (state) => {
        state.analyzing = true
        state.error = null
      })
      .addCase(analyzeFile.fulfilled, (state, action) => {
        state.analyzing = false
        const fileIndex = state.files.findIndex(f => f.id === action.payload.id)
        if (fileIndex >= 0) {
          state.files[fileIndex] = action.payload
        }
        if (state.currentFile?.id === action.payload.id) {
          state.currentFile = action.payload
        }
        state.error = null
      })
      .addCase(analyzeFile.rejected, (state, action) => {
        state.analyzing = false
        state.error = action.payload as string
      })

    // Generate Quote
    builder
      .addCase(generateQuote.pending, (state) => {
        state.generatingQuote = true
        state.error = null
      })
      .addCase(generateQuote.fulfilled, (state, action) => {
        state.generatingQuote = false
        state.quotes.push(action.payload)
        state.currentQuote = action.payload
        state.error = null
      })
      .addCase(generateQuote.rejected, (state, action) => {
        state.generatingQuote = false
        state.error = action.payload as string
      })

    // Fetch User Files
    builder
      .addCase(fetchUserFiles.pending, (state) => {
        state.error = null
      })
      .addCase(fetchUserFiles.fulfilled, (state, action) => {
        state.files = action.payload
        state.error = null
      })
      .addCase(fetchUserFiles.rejected, (state, action) => {
        state.error = action.payload as string
      })

    // Delete File
    builder
      .addCase(deleteFile.pending, (state) => {
        state.error = null
      })
      .addCase(deleteFile.fulfilled, (state, action) => {
        state.files = state.files.filter(f => f.id !== action.payload)
        if (state.currentFile?.id === action.payload) {
          state.currentFile = null
        }
        state.error = null
      })
      .addCase(deleteFile.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const {
  clearError,
  setUploadProgress,
  resetUploadProgress,
  setDragActive,
  setCurrentFile,
  setCurrentQuote,
  clearFiles,
  clearQuotes,
  addToRecentUploads,
} = uploadSlice.actions

export default uploadSlice.reducer
