"use client"

import { Layers, Package, Zap } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="flex flex-col items-center space-y-8">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full border-4 border-emerald-500/30"></div>
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/40">
            <div className="relative">
              <Package className="h-10 w-10 text-emerald-400 animate-pulse" />
              <div className="absolute -top-2 -right-2">
                <Zap className="h-5 w-5 text-emerald-300 animate-bounce" />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-white">Tracking Your Order</h2>
          <p className="text-gray-400 max-w-md">
            Please wait while we fetch the latest updates on your 3D printing order...
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce"></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
            <Layers className="h-6 w-6 text-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-400">Slicing</span>
          </div>
          <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
            <div className="relative">
              <Package className="h-6 w-6 text-emerald-400" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-500"></div>
            </div>
            <span className="text-xs text-gray-400">Printing</span>
          </div>
          <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
            <Zap className="h-6 w-6 text-emerald-400 animate-bounce" />
            <span className="text-xs text-gray-400">Processing</span>
          </div>
        </div>

        <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
