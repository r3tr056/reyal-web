import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from './index'

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Convenience hooks for common selectors
export const useAuth = () => useAppSelector((state) => state.auth)
export const useCart = () => useAppSelector((state) => state.cart)
export const useOrders = () => useAppSelector((state) => state.orders)
export const useMarketplace = () => useAppSelector((state) => state.marketplace)
export const useUI = () => useAppSelector((state) => state.ui)
export const useUpload = () => useAppSelector((state) => state.upload)
