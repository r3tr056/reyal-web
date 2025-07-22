import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface EstimateData {
  material: string
  quality: 'draft' | 'standard' | 'high' | 'ultra'
  infill: number[]
  dimensions: string
  quantity: number
  location: string
  printerModel: string
}

export interface UserPreferences {
  defaultPrintSettings: {
    material: string
    color: string
    quality: 'draft' | 'standard' | 'high' | 'ultra'
    infill: number
    supports: boolean
    postProcessing: boolean
    urgency: 'standard' | 'express' | 'rush'
    printerModel: string
  }
  defaultLocation: string
  preferredUnits: 'metric' | 'imperial'
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
  }
  theme: 'light' | 'dark' | 'system'
}

export interface SettingsState {
  estimateData: EstimateData
  userPreferences: UserPreferences
  initialized: boolean
}

const initialState: SettingsState = {
  estimateData: {
    material: '',
    quality: 'standard',
    infill: [20],
    dimensions: '',
    quantity: 1,
    location: '',
    printerModel: ''
  },
  userPreferences: {
    defaultPrintSettings: {
      material: '',
      color: '',
      quality: 'standard',
      infill: 20,
      supports: false,
      postProcessing: false,
      urgency: 'standard',
      printerModel: ''
    },
    defaultLocation: '',
    preferredUnits: 'metric',
    notifications: {
      email: true,
      sms: false,
      push: true
    },
    theme: 'system'
  },
  initialized: false
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateEstimateData: (state, action: PayloadAction<Partial<EstimateData>>) => {
      state.estimateData = { ...state.estimateData, ...action.payload }
    },
    resetEstimateData: (state) => {
      state.estimateData = {
        material: '',
        quality: 'standard',
        infill: [20],
        dimensions: '',
        quantity: 1,
        location: '',
        printerModel: ''
      }
    },
    updateUserPreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.userPreferences = { ...state.userPreferences, ...action.payload }
    },
    updateDefaultPrintSettings: (state, action: PayloadAction<Partial<UserPreferences['defaultPrintSettings']>>) => {
      state.userPreferences.defaultPrintSettings = {
        ...state.userPreferences.defaultPrintSettings,
        ...action.payload
      }
    },
    updateNotificationSettings: (state, action: PayloadAction<Partial<UserPreferences['notifications']>>) => {
      state.userPreferences.notifications = {
        ...state.userPreferences.notifications,
        ...action.payload
      }
    },
    initializeDefaults: (state, action: PayloadAction<{
      defaultMaterial?: string
      defaultColor?: string
      defaultLocation?: string
      defaultPrinter?: string
    }>) => {
      const { defaultMaterial, defaultColor, defaultLocation, defaultPrinter } = action.payload
      
      if (defaultMaterial && !state.estimateData.material) {
        state.estimateData.material = defaultMaterial
        state.userPreferences.defaultPrintSettings.material = defaultMaterial
      }
      
      if (defaultColor && !state.userPreferences.defaultPrintSettings.color) {
        state.userPreferences.defaultPrintSettings.color = defaultColor
      }
      
      if (defaultLocation && !state.estimateData.location) {
        state.estimateData.location = defaultLocation
        state.userPreferences.defaultLocation = defaultLocation
      }
      
      if (defaultPrinter && !state.estimateData.printerModel) {
        state.estimateData.printerModel = defaultPrinter
        state.userPreferences.defaultPrintSettings.printerModel = defaultPrinter
      }
      
      state.initialized = true
    }
  }
})

export const {
  updateEstimateData,
  resetEstimateData,
  updateUserPreferences,
  updateDefaultPrintSettings,
  updateNotificationSettings,
  initializeDefaults
} = settingsSlice.actions

export default settingsSlice.reducer

// Selectors
export const selectEstimateData = (state: { settings: SettingsState }) => state.settings.estimateData
export const selectUserPreferences = (state: { settings: SettingsState }) => state.settings.userPreferences
export const selectDefaultPrintSettings = (state: { settings: SettingsState }) => state.settings.userPreferences.defaultPrintSettings
export const selectSettingsInitialized = (state: { settings: SettingsState }) => state.settings.initialized
