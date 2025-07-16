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
import { Textarea } from '@/components/ui/textarea'
import { 
  Download, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Package,
  FileText,
  User
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type Quote = Database['public']['Tables']['quotes']['Row']
type PrintJob = Database['public']['Tables']['print_jobs']['Row']
type UploadedFile = Database['public']['Tables']['uploaded_files']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface OrderWithDetails extends PrintJob {
  quote: Quote
  file: UploadedFile
  user: Profile
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [filteredOrders, setFilteredOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter])

  const loadOrders = async () => {
    try {
      const supabaseClient = supabase()
      
      // Get print jobs with related quote, file, and user data
      const { data: printJobs, error } = await supabaseClient
        .from('print_jobs')
        .select(`
          *,
          quote:quotes(*),
          user:profiles(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get file data for each order
      const ordersWithFiles = await Promise.all(
        (printJobs || []).map(async (job: any) => {
          const { data: file } = await supabaseClient
            .from('uploaded_files')
            .select('*')
            .eq('id', job.quote.file_id)
            .single()

          return {
            ...job,
            file: file || {}
          }
        })
      )

      setOrders(ordersWithFiles as OrderWithDetails[])
    } catch (error) {
      console.error('Failed to load orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = orders

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.file?.original_filename?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }

  const updateOrderStatus = async (orderId: string, newStatus: string, notes?: string) => {
    setIsUpdating(true)
    try {
      const supabaseClient = supabase()
      
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (notes) {
        updateData.notes = notes
      }

      if (newStatus === 'in_progress') {
        updateData.started_at = new Date().toISOString()
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { error } = await supabaseClient
        .from('print_jobs')
        .update(updateData)
        .eq('id', orderId)

      if (error) throw error

      // Refresh orders
      await loadOrders()
      
    } catch (error) {
      console.error('Failed to update order status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const downloadFile = async (order: OrderWithDetails) => {
    try {
      const supabaseClient = supabase()
      
      const { data, error } = await supabaseClient.storage
        .from('uploads')
        .download(order.file.storage_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = order.file.original_filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Failed to download file:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      in_progress: { variant: 'default' as const, label: 'In Progress' },
      printing: { variant: 'default' as const, label: 'Printing' },
      completed: { variant: 'default' as const, label: 'Completed' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
      failed: { variant: 'destructive' as const, label: 'Failed' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground">
            Manage print jobs and download files
          </p>
        </div>
        <Button onClick={loadOrders} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders by ID, user email, or filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="printing">Printing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Orders ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{order.user?.email || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-32">
                        {order.file?.original_filename || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.status)}
                  </TableCell>
                  <TableCell>
                    ${order.quote?.total_cost?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Order Details</DialogTitle>
                          </DialogHeader>
                          {selectedOrder && (
                            <OrderDetailsDialog 
                              order={selectedOrder}
                              onStatusUpdate={updateOrderStatus}
                              onDownload={downloadFile}
                              isUpdating={isUpdating}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(order)}
                        title="Download File"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No orders found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface OrderDetailsDialogProps {
  order: OrderWithDetails
  onStatusUpdate: (orderId: string, status: string, notes?: string) => Promise<void>
  onDownload: (order: OrderWithDetails) => void
  isUpdating: boolean
}

function OrderDetailsDialog({ order, onStatusUpdate, onDownload, isUpdating }: OrderDetailsDialogProps) {
  const [newStatus, setNewStatus] = useState(order.status)
  const [notes, setNotes] = useState(order.notes || '')

  const handleStatusUpdate = async () => {
    if (newStatus !== order.status) {
      await onStatusUpdate(order.id, newStatus, notes)
    }
  }

  return (
    <div className="space-y-6">
      {/* Order Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Order ID</Label>
          <p className="font-mono text-sm">{order.id}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <div className="mt-1">
            {getStatusBadge(order.status)}
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Customer</Label>
          <p>{order.user?.email}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Total Cost</Label>
          <p className="font-semibold">${order.quote?.total_cost?.toFixed(2)}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Created</Label>
          <p>{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Estimated Days</Label>
          <p>{order.quote?.estimated_days} days</p>
        </div>
      </div>

      {/* File Info */}
      <div>
        <Label className="text-sm font-medium">File Details</Label>
        <div className="mt-2 p-3 border rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">{order.file?.original_filename}</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDownload(order)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Size: {((order.file?.file_size || 0) / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      </div>

      {/* Status Update */}
      <div className="space-y-4">
        <div>
          <Label>Update Status</Label>
          <Select value={newStatus} onValueChange={(value) => setNewStatus(value as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="printing">Printing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this order..."
            rows={3}
          />
        </div>

        <Button 
          onClick={handleStatusUpdate}
          disabled={isUpdating || newStatus === order.status}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Order'
          )}
        </Button>
      </div>
    </div>
  )

  function getStatusBadge(status: string) {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      in_progress: { variant: 'default' as const, label: 'In Progress' },
      printing: { variant: 'default' as const, label: 'Printing' },
      completed: { variant: 'default' as const, label: 'Completed' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
      failed: { variant: 'destructive' as const, label: 'Failed' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
  }
}
