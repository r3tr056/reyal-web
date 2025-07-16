"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingCart,
  User,
  Mail,
  Phone,
  Clock,
  Send,
  MessageCircle,
  Headphones,
  FileText,
  Zap,
  Layers,
  MapPin,
  Building,
  Users,
  Award,
  ArrowRight,
} from "lucide-react"

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    category: "",
    message: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsLoading(false)
    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      subject: "",
      category: "",
      message: "",
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950">
      {/* Header */}


      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%2310b981' fillOpacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-3 bg-gray-800/80 backdrop-blur-sm px-6 py-3 rounded-full mb-8 border border-gray-700/50">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-300">Professional Manufacturing Support</span>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">24/7 Available</Badge>
            </div>

            <h1 className="text-6xl font-bold text-white mb-8 leading-tight">
              Expert Manufacturing
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
                Support Team
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-4xl mx-auto leading-relaxed mb-12">
              Connect with our engineering experts for technical consultation, project planning, and manufacturing
              solutions. From prototype to production, we're here to bring your vision to life.
            </p>

            {/* Quick Contact Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mb-16">
              {[
                { icon: Clock, label: "Response Time", value: "< 2 Hours", color: "text-emerald-400" },
                { icon: Users, label: "Expert Engineers", value: "15+", color: "text-green-400" },
                { icon: Award, label: "Project Success", value: "99.8%", color: "text-teal-400" },
                { icon: Building, label: "Enterprise Clients", value: "500+", color: "text-blue-400" },
              ].map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="w-12 h-12 bg-gray-800/50 border border-gray-700/50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:border-emerald-500/50 transition-all duration-300">
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Contact Methods */}
            <div className="lg:col-span-1 space-y-6">
              {/* Phone Contact */}
              <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1 text-white">Direct Engineering Line</h3>
                      <p className="text-gray-400 text-sm mb-2">Speak with technical experts</p>
                      <a
                        href="tel:+919876543210"
                        className="text-lg font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        +91 98765 43210
                      </a>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Mon-Sat: 9 AM - 8 PM
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email Contact */}
              <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1 text-white">Technical Support</h3>
                      <p className="text-gray-400 text-sm mb-2">Detailed project consultation</p>
                      <a
                        href="mailto:engineering@reyal.in"
                        className="text-lg font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        engineering@reyal.in
                      </a>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Zap className="h-3 w-3 mr-1" />
                        Response within 2 hours
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1 text-white">Manufacturing Facility</h3>
                      <p className="text-gray-400 text-sm mb-2">Visit our production center</p>
                      <div className="text-emerald-400 font-medium">Mumbai, Maharashtra</div>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Building className="h-3 w-3 mr-1" />
                        Tours available by appointment
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Support Options */}
              <Card className="bg-gradient-to-br from-emerald-600 to-green-700 text-white border-0 shadow-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center">
                    <Headphones className="h-5 w-5 mr-2" />
                    Instant Support
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Project Status</span>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        Track Online
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Technical Help</span>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        Live Chat
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Enterprise Solutions</span>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        Call Direct
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-white">Start Your Project</CardTitle>
                      <CardDescription className="text-gray-400">
                        Tell us about your manufacturing requirements and we'll provide expert guidance
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-300">
                          Full Name *
                        </Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          required
                          className="bg-gray-700/50 border-gray-600 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300">
                          Email Address *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          required
                          className="bg-gray-700/50 border-gray-600 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-gray-300">
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          className="bg-gray-700/50 border-gray-600 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-gray-300">
                          Company/Organization
                        </Label>
                        <Input
                          id="company"
                          placeholder="Your company name"
                          value={formData.company}
                          onChange={(e) => handleInputChange("company", e.target.value)}
                          className="bg-gray-700/50 border-gray-600 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-gray-300">
                        Project Type *
                      </Label>
                      <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                        <SelectTrigger className="bg-gray-700/50 border-gray-600 text-gray-300 hover:border-emerald-500/50 focus:border-emerald-500 transition-colors">
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="prototyping" className="text-gray-300 hover:bg-gray-700 focus:bg-gray-700">
                            Rapid Prototyping
                          </SelectItem>
                          <SelectItem value="production" className="text-gray-300 hover:bg-gray-700 focus:bg-gray-700">
                            Production Run
                          </SelectItem>
                          <SelectItem
                            value="consultation"
                            className="text-gray-300 hover:bg-gray-700 focus:bg-gray-700"
                          >
                            Design Consultation
                          </SelectItem>
                          <SelectItem value="materials" className="text-gray-300 hover:bg-gray-700 focus:bg-gray-700">
                            Material Selection
                          </SelectItem>
                          <SelectItem value="enterprise" className="text-gray-300 hover:bg-gray-700 focus:bg-gray-700">
                            Enterprise Solutions
                          </SelectItem>
                          <SelectItem value="other" className="text-gray-300 hover:bg-gray-700 focus:bg-gray-700">
                            Other
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-gray-300">
                        Project Title *
                      </Label>
                      <Input
                        id="subject"
                        placeholder="Brief description of your project"
                        value={formData.subject}
                        onChange={(e) => handleInputChange("subject", e.target.value)}
                        required
                        className="bg-gray-700/50 border-gray-600 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-gray-300">
                        Project Details *
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Please provide detailed information about your project requirements, timeline, quantities, materials, tolerances, and any specific technical requirements..."
                        value={formData.message}
                        onChange={(e) => handleInputChange("message", e.target.value)}
                        required
                        rows={6}
                        className="bg-gray-700/50 border-gray-600 text-gray-300 placeholder:text-gray-500 hover:border-emerald-500/50 focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg flex-1 md:flex-none text-white font-semibold"
                      >
                        {isLoading ? (
                          "Sending..."
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Message
                          </>
                        )}
                      </Button>
                      <div className="hidden md:flex items-center text-sm text-gray-500">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Expert response within 2 hours
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-4">Technical FAQ</h2>
            <p className="text-gray-400 mb-8 text-lg">Common questions about our manufacturing capabilities</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                question: "What file formats do you accept?",
                answer:
                  "We accept STL, OBJ, 3MF, STEP, and IGES files. Our engineering team can also work with native CAD files for design optimization.",
              },
              {
                question: "What are your tolerance capabilities?",
                answer:
                  "We achieve ±0.1mm tolerances on most geometries, with tighter tolerances available for critical features using post-processing.",
              },
              {
                question: "Do you offer material certifications?",
                answer:
                  "Yes, we provide material certificates and can source certified materials for aerospace, medical, and automotive applications.",
              },
              {
                question: "What's your production capacity?",
                answer:
                  "Our facility operates 24/7 with multiple industrial-grade printers, capable of handling both prototypes and production runs up to 10,000 units.",
              },
              {
                question: "Can you help with design optimization?",
                answer:
                  "Our engineering team provides DfAM (Design for Additive Manufacturing) consultation to optimize your designs for 3D printing.",
              },
              {
                question: "What quality assurance do you provide?",
                answer:
                  "Every part undergoes dimensional inspection, visual quality checks, and material verification with detailed quality reports.",
              },
            ].map((faq, index) => (
              <Card
                key={index}
                className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-lg hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 group"
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 group-hover:scale-110 transition-transform duration-300">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">{faq.question}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center mt-16">
            <Card className="bg-gradient-to-br from-emerald-600/20 to-green-600/20 backdrop-blur-xl border border-emerald-500/30 shadow-2xl">
              <CardContent className="p-12">
                <h3 className="text-3xl font-bold text-white mb-4">Ready to Start Manufacturing?</h3>
                <p className="text-gray-300 mb-8 text-lg max-w-2xl mx-auto">
                  Join industry leaders who trust REYAL for precision 3D printing. From concept to production, we
                  deliver professional results with guaranteed quality.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg text-white font-semibold"
                    asChild
                  >
                    <Link href="/?upload=true">
                      <ArrowRight className="mr-2 h-5 w-5" />
                      Start Your Project
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-emerald-500/50 bg-transparent font-semibold"
                    asChild
                  >
                    <Link href="/marketplace">Browse Catalog</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 border-t border-gray-800/50 py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-green-500/5"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold text-white">REYAL</span>
                  <div className="text-xs text-emerald-400 font-medium tracking-wider">3D PRINTING</div>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Professional 3D printing services for engineers, designers, and manufacturers. Precision manufacturing
                with industrial-grade quality and reliability.
              </p>
            </div>
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
                  <Link href="#" className="hover:text-emerald-400 transition-colors">
                    Design Optimization
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400 transition-colors">
                    Material Consulting
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-lg text-white">Industries</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-emerald-400 transition-colors">
                    Automotive
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400 transition-colors">
                    Aerospace
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400 transition-colors">
                    Medical Devices
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                    Consumer Products
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-lg text-white">Contact</h3>
              <div className="space-y-3 text-gray-400">
                <p>engineering@reyal.in</p>
                <p>+91 98765 43210</p>
                <p>Mumbai, Maharashtra</p>
                <div className="flex space-x-4 mt-4">
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                    <span className="text-xs">Li</span>
                  </div>
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                    <span className="text-xs">Tw</span>
                  </div>
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                    <span className="text-xs">Yt</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-500">
            <p>© 2024 REYAL 3D Printing. All rights reserved. Professional manufacturing solutions.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
