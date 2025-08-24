import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'bars'
  text?: string
  fullScreen?: boolean
  overlay?: boolean
  className?: string
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
}

export function Loading({
  size = 'md',
  variant = 'spinner',
  text,
  fullScreen = false,
  overlay = false,
  className,
}: LoadingProps) {
  const LoadingSpinner = () => (
    <Loader2 className={cn('animate-spin', sizeMap[size])} />
  )

  const LoadingDots = () => (
    <div className="flex space-x-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full bg-current animate-pulse',
            size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1.4s',
          }}
        />
      ))}
    </div>
  )

  const LoadingBars = () => (
    <div className="flex space-x-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'bg-current animate-pulse',
            size === 'sm' ? 'w-0.5 h-4' : size === 'md' ? 'w-1 h-6' : 'w-1.5 h-8'
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1.2s',
          }}
        />
      ))}
    </div>
  )

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return <LoadingDots />
      case 'bars':
        return <LoadingBars />
      default:
        return <LoadingSpinner />
    }
  }

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="text-blue-600 dark:text-blue-400">
        {renderLoader()}
      </div>
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
        {content}
      </div>
    )
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-40">
        {content}
      </div>
    )
  }

  return content
}

// Specialized loading components
export function PageLoading({ text = 'Loading...' }: { text?: string }) {
  return <Loading size="lg" text={text} fullScreen />
}

export function ComponentLoading({ text }: { text?: string }) {
  return <Loading size="md" text={text} overlay />
}

export function ButtonLoading() {
  return <Loading size="sm" variant="spinner" />
}

export function TableLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  )
}
