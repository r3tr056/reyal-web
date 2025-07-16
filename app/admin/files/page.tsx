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
  Download, 
  Eye, 
  Trash2,
  Search,
  Filter,
  RefreshCw,
  FileText,
  User,
  Calendar,
  HardDrive,
  Archive
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type UploadedFile = Database['public']['Tables']['uploaded_files']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface FileWithUser extends UploadedFile {
  user: Profile
  hasQuote?: boolean
  hasPrintJob?: boolean
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileWithUser[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedFile, setSelectedFile] = useState<FileWithUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [])

  useEffect(() => {
    filterFiles()
  }, [files, searchTerm, statusFilter])

  const loadFiles = async () => {
    try {
      const supabaseClient = supabase()
      
      // Get files with user data
      const { data: filesData, error } = await supabaseClient
        .from('uploaded_files')
        .select(`
          *,
          user:profiles(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Check which files have quotes and print jobs
      const filesWithRelations = await Promise.all(
        (filesData || []).map(async (file: any) => {
          const [quotesResponse, printJobsResponse] = await Promise.all([
            supabaseClient
              .from('quotes')
              .select('id')
              .eq('file_id', file.id)
              .limit(1),
            supabaseClient
              .from('print_jobs')
              .select('id')
              .eq('quote_id', file.id)
              .limit(1)
          ])

          return {
            ...file,
            hasQuote: (quotesResponse.data?.length || 0) > 0,
            hasPrintJob: (printJobsResponse.data?.length || 0) > 0
          }
        })
      )

      setFiles(filesWithRelations as FileWithUser[])
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterFiles = () => {
    let filtered = files

    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(file => file.status === statusFilter)
    }

    setFilteredFiles(filtered)
  }

  const downloadFile = async (file: FileWithUser) => {
    try {
      const supabaseClient = supabase()
      
      const { data, error } = await supabaseClient.storage
        .from('uploads')
        .download(file.storage_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.original_filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Failed to download file:', error)
    }
  }

  const deleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const supabaseClient = supabase()
      
      // First check if file has dependent records
      const [quotesResponse, printJobsResponse] = await Promise.all([
        supabaseClient.from('quotes').select('id').eq('file_id', fileId),
        supabaseClient.from('print_jobs').select('id').eq('quote_id', fileId)
      ])

      if ((quotesResponse.data?.length || 0) > 0 || (printJobsResponse.data?.length || 0) > 0) {
        alert('Cannot delete file: it has associated quotes or print jobs.')
        return
      }

      // Get file info for storage deletion
      const file = files.find(f => f.id === fileId)
      if (!file) return

      // Delete from storage
      const { error: storageError } = await supabaseClient.storage
        .from('uploads')
        .remove([file.storage_path])

      if (storageError) {
        console.warn('Storage deletion failed:', storageError)
      }

      // Delete from database
      const { error: dbError } = await supabaseClient
        .from('uploaded_files')
        .delete()
        .eq('id', fileId)

      if (dbError) throw dbError

      // Refresh files list
      await loadFiles()
      
    } catch (error) {
      console.error('Failed to delete file:', error)
      alert('Failed to delete file. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      uploaded: { variant: 'secondary' as const, label: 'Uploaded' },
      analyzing: { variant: 'default' as const, label: 'Analyzing' },
      analyzed: { variant: 'default' as const, label: 'Analyzed' },
      error: { variant: 'destructive' as const, label: 'Error' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.uploaded

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

  const totalFiles = files.length
  const totalSize = files.reduce((sum, file) => sum + file.file_size, 0)
  const analyzedFiles = files.filter(f => f.status === 'analyzed').length
  const errorFiles = files.filter(f => f.status === 'error').length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">File Management</h1>
          <p className="text-muted-foreground">
            Manage uploaded 3D files and downloads
          </p>
        </div>
        <Button onClick={loadFiles} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Storage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Files</p>
                <p className="text-2xl font-bold">{totalFiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Storage Used</p>
                <p className="text-2xl font-bold">{formatFileSize(totalSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Analyzed</p>
                <p className="text-2xl font-bold">{analyzedFiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Errors</p>
                <p className="text-2xl font-bold">{errorFiles}</p>
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
                placeholder="Search files by name, user, or ID..."
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
                <SelectItem value="uploaded">Uploaded</SelectItem>
                <SelectItem value="analyzing">Analyzing</SelectItem>
                <SelectItem value="analyzed">Analyzed</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Files ({filteredFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Relations</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium truncate max-w-48">
                          {file.original_filename}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase">
                          {file.file_type}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-32">
                        {file.user?.email || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatFileSize(file.file_size)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(file.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {file.hasQuote && (
                        <Badge variant="outline" className="text-xs">Quote</Badge>
                      )}
                      {file.hasPrintJob && (
                        <Badge variant="outline" className="text-xs">Print Job</Badge>
                      )}
                      {!file.hasQuote && !file.hasPrintJob && (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(file.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedFile(file)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>File Details</DialogTitle>
                          </DialogHeader>
                          {selectedFile && (
                            <FileDetailsDialog 
                              file={selectedFile}
                              onDownload={downloadFile}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(file)}
                        title="Download File"
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      {!file.hasQuote && !file.hasPrintJob && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteFile(file.id)}
                          disabled={isDeleting}
                          title="Delete File"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredFiles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No files found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface FileDetailsDialogProps {
  file: FileWithUser
  onDownload: (file: FileWithUser) => void
}

function FileDetailsDialog({ file, onDownload }: FileDetailsDialogProps) {
  return (
    <div className="space-y-6">
      {/* File Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">File ID</Label>
          <p className="font-mono text-sm">{file.id}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <div className="mt-1">
            {getStatusBadge(file.status)}
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Original Filename</Label>
          <p>{file.original_filename}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">File Type</Label>
          <p className="uppercase">{file.file_type}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">File Size</Label>
          <p>{formatFileSize(file.file_size)}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Uploaded By</Label>
          <p>{file.user?.email}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Upload Date</Label>
          <p>{new Date(file.created_at).toLocaleString()}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Last Updated</Label>
          <p>{new Date(file.updated_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Analysis Data */}
      {file.analysis_data && (
        <div>
          <Label className="text-sm font-medium">Analysis Results</Label>
          <div className="mt-2 p-3 border rounded-lg bg-gray-50">
            <pre className="text-xs overflow-auto max-h-32">
              {JSON.stringify(file.analysis_data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Relations */}
      <div>
        <Label className="text-sm font-medium">Related Records</Label>
        <div className="mt-2 space-y-2">
          {file.hasQuote && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">Quote</Badge>
              <span>This file has an associated quote</span>
            </div>
          )}
          {file.hasPrintJob && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">Print Job</Badge>
              <span>This file has an associated print job</span>
            </div>
          )}
          {!file.hasQuote && !file.hasPrintJob && (
            <p className="text-sm text-muted-foreground">No related records</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button 
          onClick={() => onDownload(file)}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    </div>
  )

  function getStatusBadge(status: string) {
    const statusConfig = {
      uploaded: { variant: 'secondary' as const, label: 'Uploaded' },
      analyzing: { variant: 'default' as const, label: 'Analyzing' },
      analyzed: { variant: 'default' as const, label: 'Analyzed' },
      error: { variant: 'destructive' as const, label: 'Error' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.uploaded

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
