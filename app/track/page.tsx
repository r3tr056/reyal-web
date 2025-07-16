"use client"

import { Layers, Package, Zap } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-8">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full border-4 border-primary/20"></div>
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
            <div className="relative">
              <Package className="h-10 w-10 text-primary animate-pulse" />
              <div className="absolute -top-2 -right-2">
                <Zap className="h-5 w-5 text-primary animate-bounce" />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Tracking Your Order</h2>
          <p className="text-muted-foreground max-w-md">
            Please wait while we fetch the latest updates on your 3D printing order...
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce"></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-muted/50">
            <Layers className="h-6 w-6 text-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Slicing</span>
          </div>
          <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-muted/50">
            <div className="relative">
              <Package className="h-6 w-6 text-primary" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary"></div>
            </div>
            <span className="text-xs text-muted-foreground">Printing</span>
          </div>
          <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-muted/50">
            <Zap className="h-6 w-6 text-primary animate-bounce" />
            <span className="text-xs text-muted-foreground">Processing</span>
          </div>
        </div>

        <div className="w-64 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
