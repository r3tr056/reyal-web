'use client'

import { useState, useEffect, useCallback } from 'react'

interface ProgressItem {
  id: string
  filename: string
  progress: number
  status: 'uploading' | 'analyzing' | 'completed' | 'error'
  error?: string
}

export interface UseUploadProgressReturn {
  items: ProgressItem[]
  addItem: (id: string, filename: string) => void
  updateProgress: (id: string, progress: number) => void
  setStatus: (id: string, status: ProgressItem['status'], error?: string) => void
  removeItem: (id: string) => void
  clearAll: () => void
  totalProgress: number
  hasErrors: boolean
  isComplete: boolean
}

export function useUploadProgress(): UseUploadProgressReturn {
  const [items, setItems] = useState<ProgressItem[]>([])

  const addItem = useCallback((id: string, filename: string) => {
    setItems(prev => [
      ...prev.filter(item => item.id !== id), // Remove existing if present
      {
        id,
        filename,
        progress: 0,
        status: 'uploading'
      }
    ])
  }, [])

  const updateProgress = useCallback((id: string, progress: number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, progress: Math.max(0, Math.min(100, progress)) } : item
    ))
  }, [])

  const setStatus = useCallback((id: string, status: ProgressItem['status'], error?: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { 
        ...item, 
        status, 
        error,
        progress: status === 'completed' ? 100 : item.progress
      } : item
    ))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setItems([])
  }, [])

  // Computed values
  const totalProgress = items.length > 0 
    ? items.reduce((sum, item) => sum + item.progress, 0) / items.length 
    : 0

  const hasErrors = items.some(item => item.status === 'error')
  const isComplete = items.length > 0 && items.every(item => item.status === 'completed')

  return {
    items,
    addItem,
    updateProgress,
    setStatus,
    removeItem,
    clearAll,
    totalProgress,
    hasErrors,
    isComplete
  }
}
