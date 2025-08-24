import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { UploadedFile, FileAnalysis, PrintSettings, Quote, CostBreakdown } from '@/lib/types'

export interface SimpleEstimate {
  price: number
  printTime: number
  readyTime: number
  deliveryTime: number
  breakdown?: {
    materialCost: number
    laborCost: number
    machineCost: number
    baseCost: number
    profitMargin: number
    taxes: number
    total: number
  }
  material?: string
  location?: string
  printer?: string
  settings?: any
}

export interface HomepageEstimateData {
  material: string
  quality: 'draft' | 'standard' | 'high' | 'ultra'
  infill: number
  quantity: number
  location: string
  printerModel: string
  urgency: 'standard' | 'express' | 'rush'
}

export interface UploadState {
  // Current upload session
  currentFiles: File[]
  uploadedFile: UploadedFile | null
  fileAnalysis: FileAnalysis | null
  printSettings: PrintSettings
  costBreakdown: CostBreakdown | null
  currentQuote: Quote | null
  estimatedDays: number
  
  // Homepage integration
  homepageEstimate: SimpleEstimate | null
  homepageEstimateData: HomepageEstimateData
  isHomepageSession: boolean
  
  // Upload workflow state
  uploadStep: number
  uploadProgress: number
  analysisProgress: number
  
  // Loading states
  uploading: boolean
  analyzing: boolean
  calculating: boolean
  generatingQuote: boolean
  
  // All user files and quotes
  userFiles: UploadedFile[]
  userQuotes: Quote[]
  recentUploads: UploadedFile[]
  
  // UI state
  showUploadModal: boolean
  uploadMethod: 'device' | 'url'
  fileUrl: string
  dragActive: boolean
  
  // Error handling
  error: string | null
  
  // Configuration
  supportedFormats: string[]
  maxFileSize: number
}

const initialState: UploadState = {
  // Current upload session
  currentFiles: [],
  uploadedFile: null,
  fileAnalysis: null,
  printSettings: {
    material: '',
    color: '',
    quality: 'standard',
    infill: 20,
    supports: false,
    postProcessing: false,
    urgency: 'standard',
    printerModel: ''
  },
  costBreakdown: null,
  currentQuote: null,
  estimatedDays: 0,
  
  // Homepage integration
  homepageEstimate: null,
  homepageEstimateData: {
    material: '',
    quality: 'standard',
    infill: 20,
    quantity: 1,
    location: '',
    printerModel: '',
    urgency: 'standard'
  },
  isHomepageSession: false,
  
  // Upload workflow state
  uploadStep: 1,
  uploadProgress: 0,
  analysisProgress: 0,
  
  // Loading states
  uploading: false,
  analyzing: false,
  calculating: false,
  generatingQuote: false,
  
  // All user files and quotes
  userFiles: [],
  userQuotes: [],
  recentUploads: [],
  
  // UI state
  showUploadModal: false,
  uploadMethod: 'device',
  fileUrl: '',
  dragActive: false,
  
  // Error handling
  error: null,
  
  // Configuration
  supportedFormats: ['.stl', '.obj', '.3mf', '.ply'],
  maxFileSize: 50 * 1024 * 1024
}

export const uploadFile = createAsyncThunk(
  'upload/uploadFile',
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || `Upload failed (${response.status})`)
      }

      return result.data.file as UploadedFile
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const analyzeFile = createAsyncThunk(
  'upload/analyzeFile',
  async (fileId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/files/${fileId}/analysis`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }

      return result.data.analysis as FileAnalysis
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const calculateEstimate = createAsyncThunk(
  'upload/calculateEstimate',
  async (estimateData: HomepageEstimateData, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimateData)
      })
      
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error)
      }

      return result.data as SimpleEstimate
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const calculateCost = createAsyncThunk(
  'upload/calculateCost',
  async ({ fileId, settings }: { fileId: string; settings: PrintSettings }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/calculate-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, settings })
      })
      
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error)
      }

      return {
        costBreakdown: result.data.costBreakdown as CostBreakdown,
        estimatedDays: result.data.estimatedDays as number
      }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const generateQuote = createAsyncThunk(
  'upload/generateQuote',
  async ({ fileId, settings }: { fileId: string; settings: PrintSettings }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, settings })
      })
      
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error)
      }

      return result.data as Quote
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchUserFiles = createAsyncThunk(
  'upload/fetchUserFiles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/files')
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }

      return result.data as UploadedFile[]
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    // UI Actions
    setShowUploadModal: (state, action: PayloadAction<boolean>) => {
      state.showUploadModal = action.payload
    },
    setUploadMethod: (state, action: PayloadAction<'device' | 'url'>) => {
      state.uploadMethod = action.payload
    },
    setFileUrl: (state, action: PayloadAction<string>) => {
      state.fileUrl = action.payload
    },
    setDragActive: (state, action: PayloadAction<boolean>) => {
      state.dragActive = action.payload
    },
    setCurrentFiles: (state, action: PayloadAction<File[]>) => {
      state.currentFiles = action.payload
    },
    
    // Workflow Actions
    setUploadStep: (state, action: PayloadAction<number>) => {
      state.uploadStep = action.payload
    },
    nextStep: (state) => {
      if (state.uploadStep < 5) {
        state.uploadStep += 1
      }
    },
    prevStep: (state) => {
      if (state.uploadStep > 1) {
        state.uploadStep -= 1
      }
    },
    resetUploadFlow: (state) => {
      state.uploadStep = 1
      state.currentFiles = []
      state.uploadedFile = null
      state.fileAnalysis = null
      state.costBreakdown = null
      state.currentQuote = null
      state.uploadProgress = 0
      state.analysisProgress = 0
      state.error = null
      state.fileUrl = ''
    },
    
    // Settings Actions
    updatePrintSettings: (state, action: PayloadAction<Partial<PrintSettings>>) => {
      state.printSettings = { ...state.printSettings, ...action.payload }
    },
    resetPrintSettings: (state) => {
      state.printSettings = {
        material: '',
        color: '',
        quality: 'standard',
        infill: 20,
        supports: false,
        postProcessing: false,
        urgency: 'standard',
        printerModel: ''
      }
    },
    
    // Progress Actions
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = Math.max(0, Math.min(100, action.payload))
    },
    setAnalysisProgress: (state, action: PayloadAction<number>) => {
      state.analysisProgress = Math.max(0, Math.min(100, action.payload))
    },
    
    // Error Actions
    clearError: (state) => {
      state.error = null
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
    
    // File Management
    addToRecentUploads: (state, action: PayloadAction<UploadedFile>) => {
      state.recentUploads.unshift(action.payload)
      if (state.recentUploads.length > 10) {
        state.recentUploads = state.recentUploads.slice(0, 10)
      }
    },
    
    // Homepage Integration Actions
    updateHomepageEstimateData: (state, action: PayloadAction<Partial<HomepageEstimateData>>) => {
      state.homepageEstimateData = { ...state.homepageEstimateData, ...action.payload }
    },
    setIsHomepageSession: (state, action: PayloadAction<boolean>) => {
      state.isHomepageSession = action.payload
    },
    transferHomepageToWorkflow: (state) => {
      // Transfer homepage settings to print settings
      state.printSettings = {
        ...state.printSettings,
        material: state.homepageEstimateData.material,
        quality: state.homepageEstimateData.quality,
        infill: state.homepageEstimateData.infill,
        urgency: state.homepageEstimateData.urgency,
        printerModel: state.homepageEstimateData.printerModel
      }
      state.isHomepageSession = true
      
      // If we have an uploaded file and estimate, move to appropriate step
      if (state.uploadedFile && state.homepageEstimate) {
        state.uploadStep = state.fileAnalysis ? 3 : 2
      }
    },
    resetHomepageSession: (state) => {
      state.homepageEstimate = null
      state.homepageEstimateData = {
        material: '',
        quality: 'standard',
        infill: 20,
        quantity: 1,
        location: '',
        printerModel: '',
        urgency: 'standard'
      }
      state.isHomepageSession = false
    }
  },
  extraReducers: (builder) => {
    // Calculate Estimate (Homepage)
    builder
      .addCase(calculateEstimate.pending, (state) => {
        state.calculating = true
        state.error = null
      })
      .addCase(calculateEstimate.fulfilled, (state, action) => {
        state.calculating = false
        state.homepageEstimate = action.payload
        state.error = null
      })
      .addCase(calculateEstimate.rejected, (state, action) => {
        state.calculating = false
        state.error = action.payload as string
      })

    // Upload File
    builder
      .addCase(uploadFile.pending, (state) => {
        state.uploading = true
        state.error = null
        state.uploadProgress = 0
      })
      .addCase(uploadFile.fulfilled, (state, action) => {
        state.uploading = false
        state.uploadedFile = action.payload
        state.uploadProgress = 100
        state.userFiles.unshift(action.payload)
        state.recentUploads.unshift(action.payload)
        if (state.recentUploads.length > 10) {
          state.recentUploads = state.recentUploads.slice(0, 10)
        }
        state.uploadStep = 2
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
        state.analysisProgress = 0
        state.error = null
      })
      .addCase(analyzeFile.fulfilled, (state, action) => {
        state.analyzing = false
        state.fileAnalysis = action.payload
        state.analysisProgress = 100
        state.uploadStep = 3
        state.error = null
      })
      .addCase(analyzeFile.rejected, (state, action) => {
        state.analyzing = false
        state.analysisProgress = 0
        state.error = action.payload as string
      })

    // Calculate Cost
    builder
      .addCase(calculateCost.pending, (state) => {
        state.calculating = true
        state.error = null
      })
      .addCase(calculateCost.fulfilled, (state, action) => {
        state.calculating = false
        state.costBreakdown = action.payload.costBreakdown
        state.estimatedDays = action.payload.estimatedDays
        state.uploadStep = 4
        state.error = null
      })
      .addCase(calculateCost.rejected, (state, action) => {
        state.calculating = false
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
        state.currentQuote = action.payload
        state.userQuotes.unshift(action.payload)
        state.uploadStep = 5
        state.error = null
      })
      .addCase(generateQuote.rejected, (state, action) => {
        state.generatingQuote = false
        state.error = action.payload as string
      })

    // Fetch User Files
    builder
      .addCase(fetchUserFiles.fulfilled, (state, action) => {
        state.userFiles = action.payload
      })
      .addCase(fetchUserFiles.rejected, (state, action) => {
        state.error = action.payload as string
      })
  }
})

export const {
  setShowUploadModal,
  setUploadMethod,
  setFileUrl,
  setDragActive,
  setCurrentFiles,
  setUploadStep,
  nextStep,
  prevStep,
  resetUploadFlow,
  updatePrintSettings,
  resetPrintSettings,
  setUploadProgress,
  setAnalysisProgress,
  clearError,
  setError,
  addToRecentUploads,
  updateHomepageEstimateData,
  setIsHomepageSession,
  transferHomepageToWorkflow,
  resetHomepageSession
} = uploadSlice.actions

export default uploadSlice.reducer

// Selectors
export const selectCurrentUploadSession = (state: { upload: UploadState }) => ({
  uploadedFile: state.upload.uploadedFile,
  fileAnalysis: state.upload.fileAnalysis,
  printSettings: state.upload.printSettings,
  costBreakdown: state.upload.costBreakdown,
  currentQuote: state.upload.currentQuote,
  uploadStep: state.upload.uploadStep
})

export const selectUploadProgress = (state: { upload: UploadState }) => ({
  uploading: state.upload.uploading,
  analyzing: state.upload.analyzing,
  calculating: state.upload.calculating,
  generatingQuote: state.upload.generatingQuote,
  uploadProgress: state.upload.uploadProgress,
  analysisProgress: state.upload.analysisProgress
})

export const selectUploadUI = (state: { upload: UploadState }) => ({
  showUploadModal: state.upload.showUploadModal,
  uploadMethod: state.upload.uploadMethod,
  fileUrl: state.upload.fileUrl,
  dragActive: state.upload.dragActive,
  currentFiles: state.upload.currentFiles
})

export const selectHomepageSession = (state: { upload: UploadState }) => ({
  homepageEstimate: state.upload.homepageEstimate,
  homepageEstimateData: state.upload.homepageEstimateData,
  isHomepageSession: state.upload.isHomepageSession,
  calculating: state.upload.calculating
})

export const selectHomepageEstimateData = (state: { upload: UploadState }) => state.upload.homepageEstimateData
export const selectHomepageEstimate = (state: { upload: UploadState }) => state.upload.homepageEstimate
export const selectIsCalculatingEstimate = (state: { upload: UploadState }) => state.upload.calculating