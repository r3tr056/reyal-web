import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import createWebStorage from 'redux-persist/lib/storage/createWebStorage'

import authSlice from './slices/authSlice'
import cartSlice from './slices/cartSlice'
import orderSlice from './slices/orderSlice'
import marketplaceSlice from './slices/marketplaceSlice'
import uiSlice from './slices/uiSlice'
import uploadSlice from './slices/uploadSlice'

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

// Use appropriate storage based on environment
const persistStorage = typeof window !== 'undefined' 
  ? createWebStorage('local') 
  : createNoopStorage()

const rootReducer = combineReducers({
  auth: authSlice,
  cart: cartSlice,
  orders: orderSlice,
  marketplace: marketplaceSlice,
  ui: uiSlice,
  upload: uploadSlice,
})

const persistConfig = {
  key: 'root',
  storage: persistStorage,
  whitelist: ['auth', 'cart'], // Only persist auth and cart
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['marketplace.likedProducts'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch
