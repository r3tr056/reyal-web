'use client'

import Link from 'next/link'
import { Layers, Mail, Phone, MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 mt-auto">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-xl">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-white">REYAL</span>
                <div className="text-xs text-emerald-400 font-medium tracking-wider">3D PRINTING</div>
              </div>
            </div>
            <p className="text-gray-400 leading-relaxed mb-6">
              Professional 3D printing services for engineers, designers, and manufacturers. Precision manufacturing
              with industrial-grade quality and reliability.
            </p>
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                <span className="text-xs text-gray-300">Li</span>
              </div>
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                <span className="text-xs text-gray-300">Tw</span>
              </div>
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                <span className="text-xs text-gray-300">Yt</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-bold mb-6 text-lg text-white">Services</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="/?upload=true" className="hover:text-emerald-400 transition-colors">
                  Rapid Prototyping
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-emerald-400 transition-colors">
                  Production Runs
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                  Design Consultation
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                  Material Selection
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold mb-6 text-lg text-white">Quick Links</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="/" className="hover:text-emerald-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-emerald-400 transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-emerald-400 transition-colors">
                  Track Orders
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold mb-6 text-lg text-white">Contact</h3>
            <div className="space-y-4 text-gray-400">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-emerald-400" />
                <span>engineering@reyal.in</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-emerald-400" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <span>Mumbai, Maharashtra</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500">
          <p>© 2024 REYAL 3D Printing. All rights reserved. Professional manufacturing solutions.</p>
        </div>
      </div>
    </footer>
  )
}