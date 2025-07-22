import { Printer, ServiceableLocation, Color, Material } from "@/lib/types";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface AppConfigState {
  printers: Printer[]
  colors: Color[]
  locations: ServiceableLocation[]
  materials: Material[]
  loading: {
    printers: boolean
    colors: boolean
    locations: boolean
    materials: boolean
    all: boolean
  }
  error: string | null
  lastFetched: number | null
  initialized: boolean
}

const initialState: AppConfigState = {
  printers: [],
  colors: [],
  locations: [],
  materials: [],
  loading: {
    printers: false,
    colors: false,
    locations: false,
    materials: false,
    all: false
  },
  error: null,
  lastFetched: null,
  initialized: false
}

export const fetchAllAppConfig = createAsyncThunk(
  'appConfig/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const [printersRes, colorsRes, locationsRes, materialsRes] = await Promise.all([
        fetch('/api/printers'),
        fetch('/api/colors'),
        fetch('/api/locations'),
        fetch('/api/materials')
      ])

      const [printersData, colorsData, locationsData, materialsData] = await Promise.all([
        printersRes.json(),
        colorsRes.json(),
        locationsRes.json(),
        materialsRes.json()
      ])

      // Check for any failed requests
      if (!printersRes.ok || !colorsRes.ok || !locationsRes.ok || !materialsRes.ok) {
        throw new Error('Failed to fetch some configuration data')
      }

      return {
        printers: printersData.success ? printersData.data : [],
        colors: colorsData.success ? colorsData.data : [],
        locations: locationsData.success ? locationsData.data : [],
        materials: materialsData.success ? materialsData.data : []
      }
    } catch (error: any) {
      console.error('Failed to fetch app configuration:', error)
      return rejectWithValue(error.message || 'Failed to load application data')
    }
  }
)

export const fetchPrinters = createAsyncThunk(
  'appConfig/fetchPrinters',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/printers')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch printers')
      }

      return data.success ? data.data : []
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchMaterials = createAsyncThunk(
  'appConfig/fetchMaterials',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/materials')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch materials')
      }

      return data.success ? data.data : []
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchColors = createAsyncThunk(
  'appConfig/fetchColors',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/colors')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch colors')
      }

      return data.success ? data.data : []
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchLocations = createAsyncThunk(
  'appConfig/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/locations')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch locations')
      }

      return data.success ? data.data : []
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

const appConfigSlice = createSlice({
  name: 'appConfig',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    updatePrinter: (state, action: PayloadAction<Printer>) => {
      const index = state.printers.findIndex(p => p.id === action.payload.id)
      if (index >= 0) {
        state.printers[index] = action.payload
      }
    },
    updateMaterial: (state, action: PayloadAction<Material>) => {
      const index = state.materials.findIndex(m => m.id === action.payload.id)
      if (index >= 0) {
        state.materials[index] = action.payload
      }
    }
  },
  extraReducers: (builder) => {
    // Fetch All App Config
    builder
      .addCase(fetchAllAppConfig.pending, (state) => {
        state.loading.all = true
        state.error = null
      })
      .addCase(fetchAllAppConfig.fulfilled, (state, action) => {
        state.loading.all = false
        state.printers = action.payload.printers
        state.colors = action.payload.colors
        state.locations = action.payload.locations
        state.materials = action.payload.materials
        state.lastFetched = Date.now()
        state.initialized = true
        state.error = null
      })
      .addCase(fetchAllAppConfig.rejected, (state, action) => {
        state.loading.all = false
        state.error = action.payload as string
      })

    // Individual resource fetching
    builder
      .addCase(fetchPrinters.pending, (state) => {
        state.loading.printers = true
      })
      .addCase(fetchPrinters.fulfilled, (state, action) => {
        state.loading.printers = false
        state.printers = action.payload
      })
      .addCase(fetchPrinters.rejected, (state, action) => {
        state.loading.printers = false
        state.error = action.payload as string
      })

    builder
      .addCase(fetchMaterials.pending, (state) => {
        state.loading.materials = true
      })
      .addCase(fetchMaterials.fulfilled, (state, action) => {
        state.loading.materials = false
        state.materials = action.payload
      })
      .addCase(fetchMaterials.rejected, (state, action) => {
        state.loading.materials = false
        state.error = action.payload as string
      })

    builder
      .addCase(fetchColors.pending, (state) => {
        state.loading.colors = true
      })
      .addCase(fetchColors.fulfilled, (state, action) => {
        state.loading.colors = false
        state.colors = action.payload
      })
      .addCase(fetchColors.rejected, (state, action) => {
        state.loading.colors = false
        state.error = action.payload as string
      })

    builder
      .addCase(fetchLocations.pending, (state) => {
        state.loading.locations = true
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading.locations = false
        state.locations = action.payload
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading.locations = false
        state.error = action.payload as string
      })
  }
})

export const { clearError, updatePrinter, updateMaterial } = appConfigSlice.actions
export default appConfigSlice.reducer

// Selectors
export const selectAllPrinters = (state: { appConfig: AppConfigState }) => state.appConfig.printers
export const selectActivePrinters = (state: { appConfig: AppConfigState }) => 
  state.appConfig.printers.filter(p => p.is_active)
export const selectAvailableMaterials = (state: { appConfig: AppConfigState }) => 
  state.appConfig.materials.filter(m => m.available)
export const selectAvailableColors = (state: { appConfig: AppConfigState }) => 
  state.appConfig.colors.filter(c => c.is_available)
export const selectActiveLocations = (state: { appConfig: AppConfigState }) => 
  state.appConfig.locations.filter(l => l.is_active)
export const selectAppConfigLoading = (state: { appConfig: AppConfigState }) => state.appConfig.loading.all
export const selectAppConfigError = (state: { appConfig: AppConfigState }) => state.appConfig.error
export const selectAppConfigInitialized = (state: { appConfig: AppConfigState }) => state.appConfig.initialized