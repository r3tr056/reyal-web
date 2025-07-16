"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ShoppingCart, User, Package, Edit, Save, Camera, CreditCard, Shield, Bell, ArrowLeft } from "lucide-react"
import { PageTransition } from "@/components/page-transition"
import { motion } from "framer-motion"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    bio: "",
  })

  useEffect(() => {
    // Load user data (in real app, this would come from API)
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setFormData({
        firstName: userData.name?.split(" ")[0] || "",
        lastName: userData.name?.split(" ")[1] || "",
        email: userData.email || "",
        phone: userData.phone || "+91 98765 43210",
        address: userData.address || "123 Tech Street",
        city: userData.city || "Mumbai",
        state: userData.state || "Maharashtra",
        pincode: userData.pincode || "400001",
        bio: userData.bio || "3D printing enthusiast and designer",
      })
    }
  }, [])

  const handleSave = () => {
    const updatedUser = {
      ...user,
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      bio: formData.bio,
    }
    localStorage.setItem("user", JSON.stringify(updatedUser))
    setUser(updatedUser)
    setIsEditing(false)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-32">
        <Card className="w-96 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">Please Sign In</h2>
            <p className="text-gray-400 mb-6">You need to be logged in to view your profile.</p>
            <Button asChild className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700">
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Button variant="ghost" size="sm" className="mb-4 text-gray-300 hover:text-white" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <Avatar className="w-24 h-24 mx-auto mb-4">
                      <AvatarImage src="/placeholder.svg?height=96&width=96" />
                      <AvatarFallback className="text-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white">
                        {user.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-gray-700/50 border-gray-600 hover:bg-gray-600/50"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <h2 className="text-xl font-bold text-white">{user.name}</h2>
                  <p className="text-gray-400">{user.email}</p>
                </div>

                <nav className="space-y-2">
                  <Link
                    href="/profile"
                    className="flex items-center w-full p-3 text-left bg-emerald-500/20 text-emerald-400 rounded-lg font-medium border border-emerald-500/30"
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </Link>
                  <Link
                    href="/orders"
                    className="flex items-center w-full p-3 text-left text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <Package className="h-4 w-4 mr-3" />
                    My Orders
                  </Link>
                  <Button
                    variant="ghost"
                    className="flex items-center w-full p-3 text-left text-gray-300 hover:bg-gray-700/50 rounded-lg justify-start"
                  >
                    <CreditCard className="h-4 w-4 mr-3" />
                    Payment Methods
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex items-center w-full p-3 text-left text-gray-300 hover:bg-gray-700/50 rounded-lg justify-start"
                  >
                    <Bell className="h-4 w-4 mr-3" />
                    Notifications
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex items-center w-full p-3 text-left text-gray-300 hover:bg-gray-700/50 rounded-lg justify-start"
                  >
                    <Shield className="h-4 w-4 mr-3" />
                    Security
                  </Button>
                </nav>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3"
          >
            <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                    Profile Information
                  </CardTitle>
                  <CardDescription className="text-gray-400">Manage your account details and preferences</CardDescription>
                </div>
                <Button
                  onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                >
                  {isEditing ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-700/50">
                    <TabsTrigger value="personal" className="data-[state=active]:bg-emerald-600">Personal Info</TabsTrigger>
                    <TabsTrigger value="address" className="data-[state=active]:bg-emerald-600">Address</TabsTrigger>
                    <TabsTrigger value="preferences" className="data-[state=active]:bg-emerald-600">Preferences</TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="mt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-700/50 border-gray-600 text-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-700/50 border-gray-600 text-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-700/50 border-gray-600 text-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-gray-300">Phone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-700/50 border-gray-600 text-gray-300"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="bio" className="text-gray-300">Bio</Label>
                        <Textarea
                          id="bio"
                          value={formData.bio}
                          onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                          disabled={!isEditing}
                          rows={3}
                          className="bg-gray-700/50 border-gray-600 text-gray-300"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="address" className="mt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address" className="text-gray-300">Street Address</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-700/50 border-gray-600 text-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-gray-300">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-700/50 border-gray-600 text-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-gray-300">State</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-700/50 border-gray-600 text-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode" className="text-gray-300">PIN Code</Label>
                        <Input
                          id="pincode"
                          value={formData.pincode}
                          onChange={(e) => setFormData((prev) => ({ ...prev, pincode: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-700/50 border-gray-600 text-gray-300"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="preferences" className="mt-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-700/30">
                        <div>
                          <h4 className="font-medium text-white">Email Notifications</h4>
                          <p className="text-sm text-gray-400">Receive updates about your orders</p>
                        </div>
                        <input type="checkbox" defaultChecked className="toggle" />
                      </div>
                      <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-700/30">
                        <div>
                          <h4 className="font-medium text-white">SMS Notifications</h4>
                          <p className="text-sm text-gray-400">Get SMS updates for order status</p>
                        </div>
                        <input type="checkbox" defaultChecked className="toggle" />
                      </div>
                      <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-700/30">
                        <div>
                          <h4 className="font-medium text-white">Marketing Emails</h4>
                          <p className="text-sm text-gray-400">Receive promotional offers and news</p>
                        </div>
                        <input type="checkbox" className="toggle" />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid md:grid-cols-3 gap-6 mt-8"
            >
              <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-400">12</h3>
                  <p className="text-gray-400">Total Orders</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-400">₹8,450</h3>
                  <p className="text-gray-400">Total Spent</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-teal-400">Gold</h3>
                  <p className="text-gray-400">Member Status</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}
