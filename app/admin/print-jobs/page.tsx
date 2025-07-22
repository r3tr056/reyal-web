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
  Timer,
  AlertTriangle,
  Eye,
  MoreHorizontal
} from 'lucide-react'

interface PrintJob {
  id: string
  status: string
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  user_id: string
  quote_id: string
  printer_name: string | null
  estimated_duration: number | null
  actual_duration: number | null
}

interface PrintJobWithDetails extends PrintJob {
  user?: {
    email: string
    full_name: string | null
  }
  quote?: {
    id: string
    total_cost: number
    file_id: string
  }
  file?: {
    original_filename: string
    file_size: number
  }
  progress?: number
  estimatedTimeRemaining?: number
}

export default function PrintJobsPage() {
  const [printJobs, setPrintJobs] = useState<PrintJobWithDetails[]>([])
  const [filteredJobs, setFilteredJobs] = useState<PrintJobWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedJob, setSelectedJob] = useState<PrintJobWithDetails | null>(null)
  const [updateNotes, setUpdateNotes] = useState('')

  useEffect(() => {
    loadPrintJobs()
    // Refresh every 30 seconds for active jobs
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
      // Since there's no dedicated print jobs API, we'll fetch from analytics
      const response = await fetch('/api/admin/analytics?period=30')
      
      if (!response.ok) {
        throw new Error('Failed to fetch print jobs')
      }

      const data = await response.json()
      
      if (data.success && data.data.printJobs) {
        // Simulate additional details for each job
        const jobsWithDetails = data.data.printJobs.map((job: PrintJob) => {
          let progress = 0
          let estimatedTimeRemaining = 0

          // Calculate progress for active jobs
          if (job.status === 'printing' && job.started_at) {
            const startTime = new Date(job.started_at).getTime()
            const now = Date.now()
            const elapsed = now - startTime
            const estimatedDuration = (job.estimated_duration || 120) * 60 * 1000 // minutes to ms
            
            progress = Math.min((elapsed / estimatedDuration) * 100, 95)
            estimatedTimeRemaining = Math.max(estimatedDuration - elapsed, 0)
          } else if (job.status === 'completed') {
            progress = 100
          }

          return {
            ...job,
            progress,
            estimatedTimeRemaining,
            user: {
              email: `user-${job.user_id.slice(0, 8)}@example.com`,
              full_name: `User ${job.user_id.slice(0, 8)}`
            },
            quote: {
              id: job.quote_id,
              total_cost: Math.random() * 500 + 50,
              file_id: `file-${job.id}`
            },
            file: {
              original_filename: `print-job-${job.id.slice(0, 8)}.stl`,
              file_size: Math.floor(Math.random() * 10000000) + 1000000
            }
          }
        })

        setPrintJobs(jobsWithDetails)
      } else {
        setPrintJobs([])
      }
    } catch (error) {
      console.error('Failed to load print jobs:', error)
      setPrintJobs([])
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
        job.file?.original_filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.printer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter)
    }

    setFilteredJobs(filtered)
  }

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    setUpdating(jobId)
    try {
      // Simulate API call - in real app this would be a PATCH to /api/print-jobs/{id}
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update local state
      setPrintJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: newStatus,
              started_at: newStatus === 'printing' ? new Date().toISOString() : job.started_at,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : job.completed_at,
              updated_at: new Date().toISOString()
            }
          : job
      ))
      
    } catch (error) {
      console.error('Failed to update job status:', error)
    } finally {
      setUpdating(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
      queued: { variant: 'default' as const, label: 'Queued', icon: Timer },
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

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Print Jobs</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Print Jobs</h1>
        <Button onClick={loadPrintJobs} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">
                  {printJobs.filter(j => j.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Printer className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Printing</p>
                <p className="text-2xl font-bold">
                  {printJobs.filter(j => j.status === 'printing').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">
                  {printJobs.filter(j => j.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Total Jobs</p>
                <p className="text-2xl font-bold">{printJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs by ID, user, filename..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
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
          <CardTitle>Print Jobs ({filteredJobs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Printer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Total Cost</TableHead>
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
                      <div>
                        <div className="font-medium">
                          {job.file?.original_filename}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {job.file && formatFileSize(job.file.file_size)}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {job.user?.full_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {job.user?.email}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {job.printer_name || 'Unassigned'}
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(job.status)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="w-24">
                        {job.status === 'printing' && job.progress !== undefined ? (
                          <div className="space-y-1">
                            <Progress value={job.progress} className="h-2" />
                            <div className="text-xs text-muted-foreground">
                              {job.progress?.toFixed(0)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {job.status === 'completed' ? '100%' : '-'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {job.estimated_duration ? (
                          <div>
                            <div>Est: {job.estimated_duration}min</div>
                            {job.actual_duration && (
                              <div className="text-muted-foreground">
                                Actual: {job.actual_duration}min
                              </div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {job.quote && formatCurrency(job.quote.total_cost)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
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
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Job ID</Label>
                                    <p className="font-mono text-sm">{selectedJob.id}</p>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <div className="mt-1">
                                      {getStatusBadge(selectedJob.status)}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Customer</Label>
                                    <p>{selectedJob.user?.email}</p>
                                  </div>
                                  <div>
                                    <Label>Created</Label>
                                    <p>{new Date(selectedJob.created_at).toLocaleString()}</p>
                                  </div>
                                </div>

                                {selectedJob.status !== 'completed' && selectedJob.status !== 'cancelled' && (
                                  <div className="space-y-4">
                                    <Label>Update Status</Label>
                                    <div className="flex gap-2">
                                      {selectedJob.status === 'pending' && (
                                        <Button
                                          onClick={() => updateJobStatus(selectedJob.id, 'printing')}
                                          disabled={updating === selectedJob.id}
                                          size="sm"
                                        >
                                          <Play className="h-4 w-4 mr-2" />
                                          Start Printing
                                        </Button>
                                      )}
                                      
                                      {selectedJob.status === 'printing' && (
                                        <>
                                          <Button
                                            onClick={() => updateJobStatus(selectedJob.id, 'completed')}
                                            disabled={updating === selectedJob.id}
                                            size="sm"
                                          >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Mark Complete
                                          </Button>
                                          <Button
                                            onClick={() => updateJobStatus(selectedJob.id, 'failed')}
                                            disabled={updating === selectedJob.id}
                                            variant="destructive"
                                            size="sm"
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Mark Failed
                                          </Button>
                                        </>
                                      )}
                                      
                                      <Button
                                        onClick={() => updateJobStatus(selectedJob.id, 'cancelled')}
                                        disabled={updating === selectedJob.id}
                                        variant="outline"
                                        size="sm"
                                      >
                                        <Square className="h-4 w-4 mr-2" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        {job.status === 'pending' && (
                          <Button
                            onClick={() => updateJobStatus(job.id, 'printing')}
                            disabled={updating === job.id}
                            size="sm"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredJobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No print jobs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

