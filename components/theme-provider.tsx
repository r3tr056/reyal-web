'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
  useTheme
} from 'next-themes'
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks'
import { setTheme, selectTheme } from '@/lib/store/slices/settingsSlice'

function ThemeSync() {
  const { theme, setTheme: setNextTheme } = useTheme()
  const dispatch = useAppDispatch()
  const reduxTheme = useAppSelector(selectTheme)

  React.useEffect(() => {
    if (reduxTheme !== theme) {
      setNextTheme(reduxTheme)
    }
  }, [reduxTheme, theme, setNextTheme])

  React.useEffect(() => {
    if (theme && theme !== reduxTheme) {
      dispatch(setTheme(theme as 'light' | 'dark' | 'system'))
    }
  }, [theme, reduxTheme, dispatch])

  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const reduxTheme = useAppSelector(selectTheme)

  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme={reduxTheme}
      enableSystem={true}
      disableTransitionOnChange={false}
    >
      <ThemeSync />
      {children}
    </NextThemesProvider>
  )
}
