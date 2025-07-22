'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Eye, 
  Search,
  Filter,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Download
} from 'lucide-react'

interface User {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  company: string | null
  address: string | null
  city: string | null
  country: string
  is_admin: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
  orders_count?: number
  total_spent?: number
  last_login?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      
      const data = await response.json()
      setUsers(data.users || [])
      setFilteredUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.company?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'admin') {
        filtered = filtered.filter(user => user.is_admin)
      } else if (statusFilter === 'verified') {
        filtered = filtered.filter(user => user.is_verified)
      } else if (statusFilter === 'unverified') {
        filtered = filtered.filter(user => !user.is_verified)
      }
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, statusFilter])

  const toggleUserStatus = async (userId: string, field: 'is_admin' | 'is_verified', value: boolean) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value })
      })

      if (!response.ok) {
        throw new Error('Failed to update user')
      }

      await fetchUsers()
    } catch (error) {
      console.error('Error updating user:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportUsers = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Email,Name,Company,Phone,Country,Admin,Verified,Created,Orders,Total Spent\n" +
      filteredUsers.map(user => 
        `${user.email},${user.full_name || ''},${user.company || ''},${user.phone || ''},${user.country},${user.is_admin},${user.is_verified},${user.created_at},${user.orders_count || 0},${user.total_spent || 0}`
      ).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "users.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">Manage customer accounts and permissions</p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={exportUsers} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by email, name, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-gray-800 border-gray-700">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-800">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Contact</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Orders</TableHead>
                  <TableHead className="text-gray-300">Total Spent</TableHead>
                  <TableHead className="text-gray-300">Joined</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-gray-800">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || ''} />
                            <AvatarFallback className="bg-emerald-600 text-white">
                              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">
                              {user.full_name || 'No name'}
                              {user.is_admin && (
                                <Shield className="inline h-3 w-3 ml-1 text-emerald-400" />
                              )}
                            </p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                            {user.company && (
                              <p className="text-xs text-gray-500">{user.company}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.phone && (
                            <div className="flex items-center gap-1 text-sm text-gray-300">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-sm text-gray-300">
                            <MapPin className="h-3 w-3" />
                            {user.city ? `${user.city}, ${user.country}` : user.country}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge 
                            variant={user.is_verified ? "default" : "secondary"}
                            className={user.is_verified ? "bg-emerald-600" : ""}
                          >
                            {user.is_verified ? (
                              <>
                                <UserCheck className="h-3 w-3 mr-1" />
                                Verified
                              </>
                            ) : (
                              <>
                                <UserX className="h-3 w-3 mr-1" />
                                Unverified
                              </>
                            )}
                          </Badge>
                          {user.is_admin && (
                            <Badge variant="outline" className="border-emerald-600 text-emerald-400">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        {user.orders_count || 0}
                      </TableCell>
                      <TableCell className="font-medium text-emerald-400">
                        {formatCurrency(user.total_spent || 0)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl bg-gray-900 border-gray-800">
                            <DialogHeader>
                              <DialogTitle className="text-white">
                                User Details - {selectedUser?.full_name || selectedUser?.email}
                              </DialogTitle>
                            </DialogHeader>
                            {selectedUser && (
                              <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                  <Avatar className="h-16 w-16">
                                    <AvatarImage src={selectedUser.avatar_url || ''} />
                                    <AvatarFallback className="bg-emerald-600 text-white text-lg">
                                      {selectedUser.full_name?.charAt(0) || selectedUser.email.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white">
                                      {selectedUser.full_name || 'No name provided'}
                                    </h3>
                                    <p className="text-gray-400">{selectedUser.email}</p>
                                    {selectedUser.company && (
                                      <p className="text-sm text-gray-300 mt-1">{selectedUser.company}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-gray-300">Contact Information</Label>
                                    <div className="mt-2 space-y-2">
                                      <div className="flex items-center gap-2 text-sm text-gray-300">
                                        <Mail className="h-4 w-4" />
                                        {selectedUser.email}
                                      </div>
                                      {selectedUser.phone && (
                                        <div className="flex items-center gap-2 text-sm text-gray-300">
                                          <Phone className="h-4 w-4" />
                                          {selectedUser.phone}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 text-sm text-gray-300">
                                        <MapPin className="h-4 w-4" />
                                        {selectedUser.address ? 
                                          `${selectedUser.address}, ${selectedUser.city}, ${selectedUser.country}` :
                                          `${selectedUser.city || selectedUser.country}`
                                        }
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-gray-300">Account Statistics</Label>
                                    <div className="mt-2 space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Total Orders:</span>
                                        <span className="text-white">{selectedUser.orders_count || 0}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Total Spent:</span>
                                        <span className="text-emerald-400">{formatCurrency(selectedUser.total_spent || 0)}</span>
                                      </div>
                                      {selectedUser.last_login && (
                                        <div className="flex justify-between text-sm">
                                          <span className="text-gray-400">Last Login:</span>
                                          <span className="text-white">{formatDate(selectedUser.last_login)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-gray-300">Account Permissions</Label>
                                  <div className="mt-2 space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                      <div>
                                        <p className="text-white font-medium">Email Verified</p>
                                        <p className="text-sm text-gray-400">User has verified their email address</p>
                                      </div>
                                      <Button
                                        variant={selectedUser.is_verified ? "destructive" : "default"}
                                        size="sm"
                                        onClick={() => toggleUserStatus(selectedUser.id, 'is_verified', !selectedUser.is_verified)}
                                        disabled={isUpdating}
                                      >
                                        {selectedUser.is_verified ? 'Unverify' : 'Verify'}
                                      </Button>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                      <div>
                                        <p className="text-white font-medium">Admin Access</p>
                                        <p className="text-sm text-gray-400">Grant admin privileges to this user</p>
                                      </div>
                                      <Button
                                        variant={selectedUser.is_admin ? "destructive" : "default"}
                                        size="sm"
                                        onClick={() => toggleUserStatus(selectedUser.id, 'is_admin', !selectedUser.is_admin)}
                                        disabled={isUpdating}
                                      >
                                        {selectedUser.is_admin ? 'Remove Admin' : 'Make Admin'}
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex justify-between text-sm text-gray-400 pt-4 border-t border-gray-800">
                                  <span>Created: {formatDate(selectedUser.created_at)}</span>
                                  <span>Updated: {formatDate(selectedUser.updated_at)}</span>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{users.length}</div>
            <p className="text-xs text-gray-400 mt-1">Registered accounts</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Verified Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {users.filter(u => u.is_verified).length}
            </div>
            <p className="text-xs text-gray-400 mt-1">Email verified</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Admin Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {users.filter(u => u.is_admin).length}
            </div>
            <p className="text-xs text-gray-400 mt-1">With admin access</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {users.filter(u => (u.orders_count || 0) > 0).length}
            </div>
            <p className="text-xs text-gray-400 mt-1">With orders</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
