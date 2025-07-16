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
import { 
  Users, 
  Eye, 
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Shield,
  Mail,
  Package,
  FileText,
  UserCheck,
  UserX
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Quote = Database['public']['Tables']['quotes']['Row']
type PrintJob = Database['public']['Tables']['print_jobs']['Row']

interface UserWithStats extends Profile {
  total_orders: number
  total_spent: number
  quotes_count: number
  last_order_date?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter])

  const loadUsers = async () => {
    try {
      const supabaseClient = supabase()
      
      // Get all users
      const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Get quotes and print jobs for stats
      const [quotesResponse, printJobsResponse] = await Promise.all([
        supabaseClient.from('quotes').select('*'),
        supabaseClient.from('print_jobs').select('*')
      ])

      const quotes = (quotesResponse.data || []) as Quote[]
      const printJobs = (printJobsResponse.data || []) as PrintJob[]

      // Calculate stats for each user
      const usersWithStats = (profiles || []).map((profile: any) => {
        const userQuotes = quotes.filter(q => q.user_id === profile.id)
        const userPrintJobs = printJobs.filter(j => j.user_id === profile.id)
        
        const acceptedQuotes = userQuotes.filter(q => q.status === 'accepted')
        const totalSpent = acceptedQuotes.reduce((sum, q) => sum + q.total_cost, 0)
        
        const lastOrderDate = userPrintJobs.length > 0 ? 
          userPrintJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at :
          undefined

        return {
          ...profile,
          total_orders: userPrintJobs.length,
          total_spent: totalSpent,
          quotes_count: userQuotes.length,
          last_order_date: lastOrderDate
        } as UserWithStats
      })

      setUsers(usersWithStats)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    setIsUpdating(true)
    try {
      const supabaseClient = supabase()
      
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      await loadUsers()
      
    } catch (error) {
      console.error('Failed to update user role:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Users className="h-3 w-3" />
        User
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalUsers = users.length
  const adminUsers = users.filter(u => u.role === 'admin').length
  const activeUsers = users.filter(u => u.total_orders > 0).length
  const newUsersThisMonth = users.filter(u => {
    const userDate = new Date(u.created_at)
    const now = new Date()
    return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage customer accounts and permissions
          </p>
        </div>
        <Button onClick={loadUsers} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Active Users</p>
                <p className="text-2xl font-bold">{activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Admins</p>
                <p className="text-2xl font-bold">{adminUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">New This Month</p>
                <p className="text-2xl font-bold">{newUsersThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email, name, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Quotes</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {(user.full_name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      {user.total_orders}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{formatCurrency(user.total_spent)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      {user.quotes_count}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.last_order_date ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(user.last_order_date).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>User Details</DialogTitle>
                          </DialogHeader>
                          {selectedUser && (
                            <UserDetailsDialog 
                              user={selectedUser}
                              onRoleUpdate={updateUserRole}
                              isUpdating={isUpdating}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      {/* Quick role toggle */}
                      {user.role === 'user' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateUserRole(user.id, 'admin')}
                          disabled={isUpdating}
                          title="Make Admin"
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateUserRole(user.id, 'user')}
                          disabled={isUpdating}
                          title="Remove Admin"
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface UserDetailsDialogProps {
  user: UserWithStats
  onRoleUpdate: (userId: string, role: 'user' | 'admin') => Promise<void>
  isUpdating: boolean
}

function UserDetailsDialog({ user, onRoleUpdate, isUpdating }: UserDetailsDialogProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* User Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">User ID</Label>
          <p className="font-mono text-sm">{user.id}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Role</Label>
          <div className="mt-1">
            {getRoleBadge(user.role)}
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Full Name</Label>
          <p>{user.full_name || 'Not provided'}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Email</Label>
          <p>{user.email}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Member Since</Label>
          <p>{new Date(user.created_at).toLocaleDateString()}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Last Updated</Label>
          <p>{new Date(user.updated_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Activity Stats */}
      <div>
        <Label className="text-sm font-medium">Activity Summary</Label>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Orders</span>
            </div>
            <p className="text-xl font-bold mt-1">{user.total_orders}</p>
          </div>
          
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Total Quotes</span>
            </div>
            <p className="text-xl font-bold mt-1">{user.quotes_count}</p>
          </div>
          
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Total Spent</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(user.total_spent)}</p>
          </div>
          
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Last Order</span>
            </div>
            <p className="text-sm mt-1">
              {user.last_order_date ? 
                new Date(user.last_order_date).toLocaleDateString() : 
                'Never'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Role Management */}
      <div>
        <Label className="text-sm font-medium">Role Management</Label>
        <div className="mt-2 p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Role: {user.role}</p>
              <p className="text-sm text-muted-foreground">
                {user.role === 'admin' ? 
                  'Has full access to admin panel and all features' : 
                  'Standard user with access to upload and order features'
                }
              </p>
            </div>
            <div className="flex gap-2">
              {user.role === 'user' ? (
                <Button
                  onClick={() => onRoleUpdate(user.id, 'admin')}
                  disabled={isUpdating}
                  size="sm"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Make Admin
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => onRoleUpdate(user.id, 'user')}
                  disabled={isUpdating}
                  size="sm"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Remove Admin
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  function getRoleBadge(role: string) {
    if (role === 'admin') {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Users className="h-3 w-3" />
        User
      </Badge>
    )
  }
}
