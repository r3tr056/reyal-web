import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ReduxProvider } from '@/lib/store/ReduxProvider'
import { AuthProvider } from '@/lib/providers/AuthProvider'
import { UploadProvider } from '@/lib/providers/UploadProvider'
import { Header } from '@/components/layout/header'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { GlobalUploadModal } from '@/components/global-upload-modal'

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
        <ReduxProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <AuthProvider>
              <UploadProvider>
                <div className="min-h-screen bg-page">
                  <Header />
                  <main className="relative">
                    {children}
                  </main>
                </div>
                <GlobalUploadModal />
                <Toaster />
              </UploadProvider>
            </AuthProvider>
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  )
}
