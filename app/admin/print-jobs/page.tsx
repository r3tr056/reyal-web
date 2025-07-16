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
import { Progress } from '@/components/ui/progress'
import { 
  Printer,
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Timer,
  AlertTriangle
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type PrintJob = Database['public']['Tables']['print_jobs']['Row']
type Quote = Database['public']['Tables']['quotes']['Row']
type UploadedFile = Database['public']['Tables']['uploaded_files']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface PrintJobWithDetails extends PrintJob {
  quote: Quote
  file: UploadedFile
  user: Profile
  progress?: number
  estimatedTimeRemaining?: number
}

export default function PrintJobsPage() {
  const [printJobs, setPrintJobs] = useState<PrintJobWithDetails[]>([])
  const [filteredJobs, setFilteredJobs] = useState<PrintJobWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedJob, setSelectedJob] = useState<PrintJobWithDetails | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadPrintJobs()
    // Set up real-time updates every 30 seconds for active print jobs
    const interval = setInterval(() => {
      loadPrintJobs()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterJobs()
  }, [printJobs, searchTerm, statusFilter])

  const loadPrintJobs = async () => {
    try {
      const supabaseClient = supabase()
      
      // Get print jobs with related data
      const { data: jobs, error } = await supabaseClient
        .from('print_jobs')
        .select(`
          *,
          quote:quotes(*),
          user:profiles(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get file data and simulate progress for each job
      const jobsWithDetails = await Promise.all(
        (jobs || []).map(async (job: any) => {
          const { data: file } = await supabaseClient
            .from('uploaded_files')
            .select('*')
            .eq('id', job.quote.file_id)
            .single()

          // Simulate print progress based on start time and estimated duration
          let progress = 0
          let estimatedTimeRemaining = 0
          
          if (job.status === 'printing' && job.started_at) {
            const startTime = new Date(job.started_at).getTime()
            const now = Date.now()
            const elapsed = now - startTime
            
            // Estimate total print time based on file size and complexity
            const estimatedDuration = ((file?.file_size as number) || 1000000) / 1000 * 60 * 1000 // rough estimate
            progress = Math.min((elapsed / estimatedDuration) * 100, 95) // Cap at 95% until actually complete
            estimatedTimeRemaining = Math.max(estimatedDuration - elapsed, 0)
          } else if (job.status === 'completed') {
            progress = 100
          }

          return {
            ...job,
            file: file || {},
            progress,
            estimatedTimeRemaining
          }
        })
      )

      setPrintJobs(jobsWithDetails as PrintJobWithDetails[])
    } catch (error) {
      console.error('Failed to load print jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterJobs = () => {
    let filtered = printJobs

    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.file?.original_filename?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter)
    }

    setFilteredJobs(filtered)
  }

  const updateJobStatus = async (jobId: string, newStatus: string, notes?: string) => {
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

      if (newStatus === 'printing' || newStatus === 'in_progress') {
        updateData.started_at = new Date().toISOString()
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { error } = await supabaseClient
        .from('print_jobs')
        .update(updateData)
        .eq('id', jobId)

      if (error) throw error

      await loadPrintJobs()
      
    } catch (error) {
      console.error('Failed to update job status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
      in_progress: { variant: 'default' as const, label: 'In Progress', icon: Timer },
      printing: { variant: 'default' as const, label: 'Printing', icon: Printer },
      completed: { variant: 'default' as const, label: 'Completed', icon: CheckCircle },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled', icon: XCircle },
      failed: { variant: 'destructive' as const, label: 'Failed', icon: AlertTriangle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const IconComponent = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatTimeRemaining = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
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

  const activePrintJobs = filteredJobs.filter(job => job.status === 'printing').length
  const queuedJobs = filteredJobs.filter(job => job.status === 'pending' || job.status === 'in_progress').length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Print Jobs</h1>
          <p className="text-muted-foreground">
            Monitor and manage your print queue
          </p>
        </div>
        <Button onClick={loadPrintJobs} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Active Prints</p>
                <p className="text-2xl font-bold">{activePrintJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">In Queue</p>
                <p className="text-2xl font-bold">{queuedJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Completed Today</p>
                <p className="text-2xl font-bold">
                  {filteredJobs.filter(job => 
                    job.status === 'completed' && 
                    job.completed_at &&
                    new Date(job.completed_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
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
                placeholder="Search print jobs by ID, user, or filename..."
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

      {/* Print Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Print Jobs ({filteredJobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-sm">
                    {job.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <span className="truncate max-w-32 block">
                      {job.file?.original_filename || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {job.user?.email || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(job.status)}
                  </TableCell>
                  <TableCell>
                    {job.status === 'printing' ? (
                      <div className="space-y-1">
                        <Progress value={job.progress || 0} className="w-16" />
                        <span className="text-xs text-muted-foreground">
                          {(job.progress || 0).toFixed(0)}%
                        </span>
                      </div>
                    ) : job.status === 'completed' ? (
                      <span className="text-green-600 text-sm">Complete</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {job.status === 'printing' && job.estimatedTimeRemaining ? (
                      <span className="text-sm">
                        {formatTimeRemaining(job.estimatedTimeRemaining)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedJob(job)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Print Job Details</DialogTitle>
                          </DialogHeader>
                          {selectedJob && (
                            <PrintJobDetailsDialog 
                              job={selectedJob}
                              onStatusUpdate={updateJobStatus}
                              isUpdating={isUpdating}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      {/* Quick action buttons based on status */}
                      {job.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateJobStatus(job.id, 'printing')}
                          title="Start Printing"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {job.status === 'printing' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateJobStatus(job.id, 'completed')}
                          title="Mark Complete"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredJobs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No print jobs found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface PrintJobDetailsDialogProps {
  job: PrintJobWithDetails
  onStatusUpdate: (jobId: string, status: string, notes?: string) => Promise<void>
  isUpdating: boolean
}

function PrintJobDetailsDialog({ job, onStatusUpdate, isUpdating }: PrintJobDetailsDialogProps) {
  const [newStatus, setNewStatus] = useState(job.status)
  const [notes, setNotes] = useState(job.notes || '')

  const handleStatusUpdate = async () => {
    if (newStatus !== job.status) {
      await onStatusUpdate(job.id, newStatus, notes)
    }
  }

  const downloadFile = async () => {
    try {
      const supabaseClient = supabase()
      
      const { data, error } = await supabaseClient.storage
        .from('uploads')
        .download(job.file.storage_path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = job.file.original_filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Failed to download file:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Job Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Job ID</Label>
          <p className="font-mono text-sm">{job.id}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Current Status</Label>
          <div className="mt-1">
            {getStatusBadge(job.status)}
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Customer</Label>
          <p>{job.user?.email}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Quote Value</Label>
          <p className="font-semibold">${job.quote?.total_cost?.toFixed(2)}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Created</Label>
          <p>{new Date(job.created_at).toLocaleString()}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Estimated Days</Label>
          <p>{job.quote?.estimated_days} days</p>
        </div>
      </div>

      {/* Print Progress */}
      {job.status === 'printing' && (
        <div>
          <Label className="text-sm font-medium">Print Progress</Label>
          <div className="mt-2 space-y-2">
            <Progress value={job.progress || 0} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{(job.progress || 0).toFixed(1)}% complete</span>
              {job.estimatedTimeRemaining && (
                <span>~{formatTimeRemaining(job.estimatedTimeRemaining)} remaining</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Details */}
      <div>
        <Label className="text-sm font-medium">File Details</Label>
        <div className="mt-2 p-3 border rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">{job.file?.original_filename}</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={downloadFile}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Size: {((job.file?.file_size || 0) / 1024 / 1024).toFixed(2)} MB
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
            placeholder="Add notes about this print job..."
            rows={3}
          />
        </div>

        <Button 
          onClick={handleStatusUpdate}
          disabled={isUpdating || newStatus === job.status}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Job'
          )}
        </Button>
      </div>
    </div>
  )

  function getStatusBadge(status: string) {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
      in_progress: { variant: 'default' as const, label: 'In Progress', icon: Timer },
      printing: { variant: 'default' as const, label: 'Printing', icon: Printer },
      completed: { variant: 'default' as const, label: 'Completed', icon: CheckCircle },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled', icon: XCircle },
      failed: { variant: 'destructive' as const, label: 'Failed', icon: AlertTriangle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const IconComponent = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  function formatTimeRemaining(milliseconds: number) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }
}
