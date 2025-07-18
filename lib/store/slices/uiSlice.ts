import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface UIState {
  sidebarOpen: boolean
  mobileMenuOpen: boolean
  theme: 'light' | 'dark'
  loadingStates: { [key: string]: boolean }
  notifications: Notification[]
  modals: {
    loginModal: boolean
    signupModal: boolean
    uploadModal: boolean
    profileModal: boolean
    confirmationModal: {
      open: boolean
      title?: string
      message?: string
      onConfirm?: () => void
      onCancel?: () => void
    }
  }
  toasts: Toast[]
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: number
  read: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  timestamp: number
}

const initialState: UIState = {
  sidebarOpen: false,
  mobileMenuOpen: false,
  theme: 'dark',
  loadingStates: {},
  notifications: [],
  modals: {
    loginModal: false,
    signupModal: false,
    uploadModal: false,
    profileModal: false,
    confirmationModal: {
      open: false,
    },
  },
  toasts: [],
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
    },
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      state.loadingStates[action.payload.key] = action.payload.loading
    },
    clearLoading: (state, action: PayloadAction<string>) => {
      delete state.loadingStates[action.payload]
    },
    clearAllLoading: (state) => {
      state.loadingStates = {}
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
      }
      state.notifications.unshift(notification)
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50)
      }
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload)
      if (notification) {
        notification.read = true
      }
    },
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true
      })
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    clearNotifications: (state) => {
      state.notifications = []
    },
    openModal: (state, action: PayloadAction<keyof typeof initialState.modals>) => {
      if (action.payload === 'confirmationModal') return // Handle separately
      state.modals[action.payload] = true
    },
    closeModal: (state, action: PayloadAction<keyof typeof initialState.modals>) => {
      if (action.payload === 'confirmationModal') {
        state.modals.confirmationModal = { open: false }
      } else {
        state.modals[action.payload] = false
      }
    },
    closeAllModals: (state) => {
      state.modals = initialState.modals
    },
    openConfirmationModal: (state, action: PayloadAction<{
      title?: string
      message?: string
      onConfirm?: () => void
      onCancel?: () => void
    }>) => {
      state.modals.confirmationModal = {
        open: true,
        ...action.payload,
      }
    },
    addToast: (state, action: PayloadAction<Omit<Toast, 'id' | 'timestamp'>>) => {
      const toast: Toast = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
        duration: action.payload.duration || 5000,
      }
      state.toasts.push(toast)
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload)
    },
    clearToasts: (state) => {
      state.toasts = []
    },
  },
})

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleMobileMenu,
  setMobileMenuOpen,
  setTheme,
  setLoading,
  clearLoading,
  clearAllLoading,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
  clearNotifications,
  openModal,
  closeModal,
  closeAllModals,
  openConfirmationModal,
  addToast,
  removeToast,
  clearToasts,
} = uiSlice.actions

export default uiSlice.reducer
