import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { Header } from '@/components/layout/header'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'REYAL - 3D Printing Services',
  description: 'Professional 3D printing and manufacturing services',
  generator: 'Next.js',
  keywords: '3D printing, manufacturing, prototyping, precision printing, design services',
  authors: [{ name: 'REYAL' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="min-h-screen bg-page">
              <Header />
              <main className="relative">
                {children}
              </main>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
