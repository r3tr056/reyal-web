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
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  RefreshCw,
  FileText,
  DollarSign,
  Download,
  Send,
  AlertCircle
} from 'lucide-react'

interface Quote {
  id: string
  quote_number: string
  customer_name: string
  customer_email: string
  file_name: string
  material: string
  color: string
  quantity: number
  urgency: string
  status: string
  estimated_cost: number
  final_cost: number | null
  estimated_delivery: string
  notes: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  file_analysis: any
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [finalCost, setFinalCost] = useState('')

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/quotes')
      
      if (!response.ok) {
        throw new Error('Failed to fetch quotes')
      }
      
      const data = await response.json()
      setQuotes(data.quotes || [])
      setFilteredQuotes(data.quotes || [])
    } catch (error) {
      console.error('Error fetching quotes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
  }, [])

  useEffect(() => {
    let filtered = quotes

    if (searchTerm) {
      filtered = filtered.filter(quote => 
        quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(quote => quote.status === statusFilter)
    }

    setFilteredQuotes(filtered)
  }, [quotes, searchTerm, statusFilter])

  const updateQuoteStatus = async (quoteId: string, status: string, finalCost?: number, notes?: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status, 
          final_cost: finalCost,
          admin_notes: notes 
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update quote')
      }

      await fetchQuotes()
      setSelectedQuote(null)
      setAdminNotes('')
      setFinalCost('')
    } catch (error) {
      console.error('Error updating quote:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const sendQuoteToCustomer = async (quoteId: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/admin/quotes/${quoteId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Failed to send quote')
      }

      await fetchQuotes()
    } catch (error) {
      console.error('Error sending quote:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-orange-400' },
      reviewing: { variant: 'default' as const, icon: Eye, color: 'text-blue-400' },
      quoted: { variant: 'default' as const, icon: FileText, color: 'text-purple-400' },
      accepted: { variant: 'default' as const, icon: CheckCircle, color: 'text-emerald-400' },
      rejected: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-400' },
      expired: { variant: 'outline' as const, icon: AlertCircle, color: 'text-gray-400' }
    }
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap = {
      standard: { variant: 'outline' as const, color: 'text-gray-400' },
      express: { variant: 'secondary' as const, color: 'text-orange-400' },
      rush: { variant: 'destructive' as const, color: 'text-red-400' }
    }
    
    const config = urgencyMap[urgency as keyof typeof urgencyMap] || urgencyMap.standard
    
    return (
      <Badge variant={config.variant}>
        {urgency}
      </Badge>
    )
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

  const exportQuotes = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Quote #,Customer,Email,File,Material,Color,Quantity,Urgency,Status,Estimated Cost,Final Cost,Created\n" +
      filteredQuotes.map(quote => 
        `${quote.quote_number},${quote.customer_name},${quote.customer_email},${quote.file_name},${quote.material},${quote.color},${quote.quantity},${quote.urgency},${quote.status},${quote.estimated_cost},${quote.final_cost || ''},${quote.created_at}`
      ).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "quotes.csv")
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
          <h1 className="text-3xl font-bold text-white">Quote Management</h1>
          <p className="text-gray-400 mt-1">Review and manage customer quote requests</p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={exportQuotes} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchQuotes} variant="outline" size="sm">
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
                  placeholder="Search by quote number, customer, or file name..."
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
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
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
                  <TableHead className="text-gray-300">Quote #</TableHead>
                  <TableHead className="text-gray-300">Customer</TableHead>
                  <TableHead className="text-gray-300">File</TableHead>
                  <TableHead className="text-gray-300">Material</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Urgency</TableHead>
                  <TableHead className="text-gray-300">Cost</TableHead>
                  <TableHead className="text-gray-300">Created</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.length > 0 ? (
                  filteredQuotes.map((quote) => (
                    <TableRow key={quote.id} className="border-gray-800">
                      <TableCell className="font-medium text-white">
                        {quote.quote_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{quote.customer_name}</p>
                          <p className="text-sm text-gray-400">{quote.customer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-white">{quote.file_name}</p>
                          <p className="text-sm text-gray-400">Qty: {quote.quantity}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-white">{quote.material}</p>
                          <p className="text-sm text-gray-400">{quote.color}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(quote.status)}
                      </TableCell>
                      <TableCell>
                        {getUrgencyBadge(quote.urgency)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-emerald-400 font-medium">
                            {formatCurrency(quote.final_cost || quote.estimated_cost)}
                          </p>
                          {quote.final_cost && quote.final_cost !== quote.estimated_cost && (
                            <p className="text-xs text-gray-400 line-through">
                              {formatCurrency(quote.estimated_cost)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatDate(quote.created_at)}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedQuote(quote)
                                setAdminNotes(quote.admin_notes || '')
                                setFinalCost(quote.final_cost?.toString() || quote.estimated_cost.toString())
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl bg-gray-900 border-gray-800">
                            <DialogHeader>
                              <DialogTitle className="text-white">
                                Quote Details - {selectedQuote?.quote_number}
                              </DialogTitle>
                            </DialogHeader>
                            {selectedQuote && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                  <div>
                                    <Label className="text-gray-300">Customer Information</Label>
                                    <div className="mt-2 p-3 bg-gray-800 rounded-lg">
                                      <p className="font-medium text-white">{selectedQuote.customer_name}</p>
                                      <p className="text-gray-400">{selectedQuote.customer_email}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-gray-300">Quote Information</Label>
                                    <div className="mt-2 p-3 bg-gray-800 rounded-lg">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-400">Status:</span>
                                        {getStatusBadge(selectedQuote.status)}
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Urgency:</span>
                                        {getUrgencyBadge(selectedQuote.urgency)}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-gray-300">File Details</Label>
                                  <div className="mt-2 p-3 bg-gray-800 rounded-lg">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-white font-medium">{selectedQuote.file_name}</p>
                                        <p className="text-sm text-gray-400">Quantity: {selectedQuote.quantity}</p>
                                      </div>
                                      <div>
                                        <p className="text-white">{selectedQuote.material} - {selectedQuote.color}</p>
                                        <p className="text-sm text-gray-400">Delivery: {formatDate(selectedQuote.estimated_delivery)}</p>
                                      </div>
                                    </div>
                                    {selectedQuote.file_analysis && (
                                      <div className="mt-3 pt-3 border-t border-gray-700">
                                        <h4 className="text-sm font-medium text-gray-300 mb-2">File Analysis</h4>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                          <div>
                                            <span className="text-gray-400">Volume:</span>
                                            <span className="text-white ml-1">
                                              {selectedQuote.file_analysis.volume?.toFixed(2)} cm³
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray-400">Print Time:</span>
                                            <span className="text-white ml-1">
                                              {Math.round(selectedQuote.file_analysis.printTime / 60)}h
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray-400">Support:</span>
                                            <span className="text-white ml-1">
                                              {selectedQuote.file_analysis.supportRequired ? 'Yes' : 'No'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {selectedQuote.notes && (
                                  <div>
                                    <Label className="text-gray-300">Customer Notes</Label>
                                    <div className="mt-2 p-3 bg-gray-800 rounded-lg">
                                      <p className="text-white">{selectedQuote.notes}</p>
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-gray-300">Final Cost ($)</Label>
                                    <Input
                                      type="number"
                                      value={finalCost}
                                      onChange={(e) => setFinalCost(e.target.value)}
                                      className="mt-2 bg-gray-800 border-gray-700 text-white"
                                      placeholder="Enter final cost"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                      Estimated: {formatCurrency(selectedQuote.estimated_cost)}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-gray-300">Admin Notes</Label>
                                    <Textarea
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      className="mt-2 bg-gray-800 border-gray-700 text-white"
                                      placeholder="Add internal notes..."
                                      rows={3}
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                                  <div className="flex gap-2">
                                    {selectedQuote.status === 'pending' && (
                                      <Button
                                        onClick={() => updateQuoteStatus(selectedQuote.id, 'reviewing')}
                                        disabled={isUpdating}
                                        size="sm"
                                      >
                                        Start Review
                                      </Button>
                                    )}
                                    {(selectedQuote.status === 'reviewing' || selectedQuote.status === 'pending') && (
                                      <>
                                        <Button
                                          onClick={() => updateQuoteStatus(
                                            selectedQuote.id, 
                                            'quoted', 
                                            parseFloat(finalCost), 
                                            adminNotes
                                          )}
                                          disabled={isUpdating || !finalCost}
                                          size="sm"
                                        >
                                          <Send className="h-4 w-4 mr-1" />
                                          Send Quote
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          onClick={() => updateQuoteStatus(selectedQuote.id, 'rejected', undefined, adminNotes)}
                                          disabled={isUpdating}
                                          size="sm"
                                        >
                                          Reject
                                        </Button>
                                      </>
                                    )}
                                    {selectedQuote.status === 'quoted' && (
                                      <Button
                                        onClick={() => sendQuoteToCustomer(selectedQuote.id)}
                                        disabled={isUpdating}
                                        size="sm"
                                        variant="outline"
                                      >
                                        <Send className="h-4 w-4 mr-1" />
                                        Resend Quote
                                      </Button>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    Created: {formatDate(selectedQuote.created_at)}
                                  </div>
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
                    <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                      No quotes found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{quotes.length}</div>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">
              {quotes.filter(q => q.status === 'pending').length}
            </div>
            <p className="text-xs text-gray-400 mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Quoted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {quotes.filter(q => q.status === 'quoted').length}
            </div>
            <p className="text-xs text-gray-400 mt-1">Sent to customers</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {quotes.filter(q => q.status === 'accepted').length}
            </div>
            <p className="text-xs text-gray-400 mt-1">Customer approved</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Rush Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {quotes.filter(q => q.urgency === 'rush').length}
            </div>
            <p className="text-xs text-gray-400 mt-1">High priority</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
