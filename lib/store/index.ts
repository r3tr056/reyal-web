import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

import authSlice from './slices/authSlice'
import cartSlice from './slices/cartSlice'
import orderSlice from './slices/orderSlice'
import marketplaceSlice from './slices/marketplaceSlice'
import uploadSlice from './slices/uploadSlice'
import appConfigSlice from './slices/appConfigSlice'
import settingsSlice from './slices/settingsSlice'

// Create a noop storage for server-side rendering
const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null)
    },
    setItem(_key: string, value: any) {
      return Promise.resolve(value)
    },
    removeItem(_key: string) {
      return Promise.resolve()
    },
  }
}

// Use noop storage on server
const createPersistStorage = () => {
  if (typeof window === 'undefined') {
    return createNoopStorage()
  }
  return storage
}

const rootReducer = combineReducers({
  auth: authSlice,
  cart: cartSlice,
  orders: orderSlice,
  marketplace: marketplaceSlice,
  upload: uploadSlice,
  appConfig: appConfigSlice,
  settings: settingsSlice
})

const persistConfig = {
  key: 'root',
  storage: createPersistStorage(),
  whitelist: ['auth', 'cart', 'settings'],
  blacklist: ['marketplace', 'upload', 'orders']
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER'
        ],
        ignoredPaths: ['_persist'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch
