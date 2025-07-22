'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Eye, 
  Download, 
  Search,
  Filter,
  RefreshCw,
  FileText,
  File,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2
} from 'lucide-react'

interface UploadedFile {
  id: string
  user_id: string
  original_filename: string
  filename: string
  file_path: string
  file_size: number
  file_type: string
  mime_type: string | null
  analysis: any
  is_analyzed: boolean
  thumbnail_url: string | null
  created_at: string
  user_name?: string
  user_email?: string
}

export default function FilesPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [filteredFiles, setFilteredFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/files')
      
      if (!response.ok) {
        throw new Error('Failed to fetch files')
      }
      
      const data = await response.json()
      setFiles(data.files || [])
      setFilteredFiles(data.files || [])
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  useEffect(() => {
    let filtered = files

    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(file => file.file_type === typeFilter)
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'analyzed') {
        filtered = filtered.filter(file => file.is_analyzed)
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(file => !file.is_analyzed)
      }
    }

    setFilteredFiles(filtered)
  }, [files, searchTerm, typeFilter, statusFilter])

  const deleteFile = async (fileId: string) => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      await fetchFiles()
      setSelectedFile(null)
    } catch (error) {
      console.error('Error deleting file:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const downloadFile = async (filePath: string, filename: string) => {
    try {
      const response = await fetch(`/api/files/download?path=${encodeURIComponent(filePath)}`)
      
      if (!response.ok) {
        throw new Error('Failed to download file')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const getStatusBadge = (isAnalyzed: boolean, analysis: any) => {
    if (isAnalyzed && analysis) {
      return (
        <Badge variant="default" className="bg-emerald-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Analyzed
        </Badge>
      )
    } else if (isAnalyzed && !analysis) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType === 'stl' || fileType === 'obj' || fileType === 'ply') {
      return <FileText className="h-4 w-4 text-blue-400" />
    }
    return <File className="h-4 w-4 text-gray-400" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
          <h1 className="text-3xl font-bold text-white">File Management</h1>
          <p className="text-gray-400 mt-1">Monitor and manage uploaded 3D model files</p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={fetchFiles} variant="outline" size="sm">
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
                  placeholder="Search by filename, user name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 bg-gray-800 border-gray-700">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="stl">STL</SelectItem>
                  <SelectItem value="obj">OBJ</SelectItem>
                  <SelectItem value="ply">PLY</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="analyzed">Analyzed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
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
                  <TableHead className="text-gray-300">File</TableHead>
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Type</TableHead>
                  <TableHead className="text-gray-300">Size</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Uploaded</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.length > 0 ? (
                  filteredFiles.map((file) => (
                    <TableRow key={file.id} className="border-gray-800">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.file_type)}
                          <div>
                            <p className="font-medium text-white">{file.original_filename}</p>
                            <p className="text-sm text-gray-400">{file.filename}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-white">{file.user_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-400">{file.user_email || 'No email'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
                          {file.file_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatFileSize(file.file_size)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(file.is_analyzed, file.analysis)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatDate(file.created_at)}
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
                            <DialogContent className="max-w-3xl bg-gray-900 border-gray-800">
                              <DialogHeader>
                                <DialogTitle className="text-white">
                                  File Details - {selectedFile?.original_filename}
                                </DialogTitle>
                              </DialogHeader>
                              {selectedFile && (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-6">
                                    <div>
                                      <h3 className="text-lg font-semibold text-white mb-3">File Information</h3>
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Original Name:</span>
                                          <span className="text-white">{selectedFile.original_filename}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">File Type:</span>
                                          <Badge variant="outline">{selectedFile.file_type.toUpperCase()}</Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">File Size:</span>
                                          <span className="text-white">{formatFileSize(selectedFile.file_size)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">MIME Type:</span>
                                          <span className="text-white">{selectedFile.mime_type || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Status:</span>
                                          {getStatusBadge(selectedFile.is_analyzed, selectedFile.analysis)}
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <h3 className="text-lg font-semibold text-white mb-3">User Information</h3>
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Name:</span>
                                          <span className="text-white">{selectedFile.user_name || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Email:</span>
                                          <span className="text-white">{selectedFile.user_email || 'No email'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Uploaded:</span>
                                          <span className="text-white">{formatDate(selectedFile.created_at)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {selectedFile.analysis && (
                                    <div>
                                      <h3 className="text-lg font-semibold text-white mb-3">Analysis Results</h3>
                                      <div className="p-4 bg-gray-800 rounded-lg">
                                        <div className="grid grid-cols-3 gap-4">
                                          <div>
                                            <p className="text-gray-400">Volume</p>
                                            <p className="text-white font-medium">
                                              {selectedFile.analysis.volume?.toFixed(2)} cm³
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-gray-400">Surface Area</p>
                                            <p className="text-white font-medium">
                                              {selectedFile.analysis.surfaceArea?.toFixed(2)} cm²
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-gray-400">Print Time</p>
                                            <p className="text-white font-medium">
                                              {Math.round(selectedFile.analysis.printTime / 60)}h {selectedFile.analysis.printTime % 60}m
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-gray-400">Complexity</p>
                                            <p className="text-white font-medium">
                                              {selectedFile.analysis.complexity?.toFixed(1)}/10
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-gray-400">Support Required</p>
                                            <p className="text-white font-medium">
                                              {selectedFile.analysis.supportRequired ? 'Yes' : 'No'}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-gray-400">Triangles</p>
                                            <p className="text-white font-medium">
                                              {selectedFile.analysis.triangleCount?.toLocaleString()}
                                            </p>
                                          </div>
                                        </div>
                                        {selectedFile.analysis.dimensions && (
                                          <div className="mt-4 pt-4 border-t border-gray-700">
                                            <p className="text-gray-400 mb-2">Dimensions (mm)</p>
                                            <div className="grid grid-cols-3 gap-4">
                                              <div>
                                                <span className="text-gray-400">X: </span>
                                                <span className="text-white">{selectedFile.analysis.dimensions.x?.toFixed(2)}</span>
                                              </div>
                                              <div>
                                                <span className="text-gray-400">Y: </span>
                                                <span className="text-white">{selectedFile.analysis.dimensions.y?.toFixed(2)}</span>
                                              </div>
                                              <div>
                                                <span className="text-gray-400">Z: </span>
                                                <span className="text-white">{selectedFile.analysis.dimensions.z?.toFixed(2)}</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => downloadFile(selectedFile.file_path, selectedFile.original_filename)}
                                        size="sm"
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        Download
                                      </Button>
                                    </div>
                                    <Button
                                      variant="destructive"
                                      onClick={() => deleteFile(selectedFile.id)}
                                      disabled={isDeleting}
                                      size="sm"
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      {isDeleting ? 'Deleting...' : 'Delete'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadFile(file.file_path, file.original_filename)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                      No files found
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
            <CardTitle className="text-sm font-medium text-gray-200">Total Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{files.length}</div>
            <p className="text-xs text-gray-400 mt-1">Uploaded files</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {files.filter(f => f.is_analyzed && f.analysis).length}
            </div>
            <p className="text-xs text-gray-400 mt-1">Successfully analyzed</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">
              {files.filter(f => !f.is_analyzed).length}
            </div>
            <p className="text-xs text-gray-400 mt-1">Awaiting analysis</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {formatFileSize(files.reduce((total, file) => total + file.file_size, 0))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Used storage</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
