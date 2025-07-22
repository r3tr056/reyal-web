import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import createWebStorage from 'redux-persist/lib/storage/createWebStorage'

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
  storage,
  whitelist: ['auth', 'upload', 'appConfig', 'cart', 'settings'],
  blacklist: []
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
