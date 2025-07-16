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
  FileText, 
  Eye, 
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  User,
  Calendar,
  DollarSign
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type Quote = Database['public']['Tables']['quotes']['Row']
type UploadedFile = Database['public']['Tables']['uploaded_files']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface QuoteWithDetails extends Quote {
  file: UploadedFile
  user: Profile
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteWithDetails[]>([])
  const [filteredQuotes, setFilteredQuotes] = useState<QuoteWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithDetails | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadQuotes()
  }, [])

  useEffect(() => {
    filterQuotes()
  }, [quotes, searchTerm, statusFilter])

  const loadQuotes = async () => {
    try {
      const supabaseClient = supabase()
      
      // Get quotes with related data
      const { data: quotesData, error } = await supabaseClient
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get related data separately
      const quotesWithDetails = await Promise.all(
        (quotesData || []).map(async (quote: any) => {
          const typedQuote = quote as Quote
          const [userResponse, fileResponse] = await Promise.all([
            supabaseClient
              .from('profiles')
              .select('*')
              .eq('id', typedQuote.user_id)
              .single(),
            supabaseClient
              .from('uploaded_files')
              .select('*')
              .eq('id', typedQuote.file_id)
              .single()
          ])

          return {
            ...typedQuote,
            user: userResponse.data || {} as Profile,
            file: fileResponse.data || {} as UploadedFile
          }
        })
      )

      setQuotes(quotesWithDetails as QuoteWithDetails[])
    } catch (error) {
      console.error('Failed to load quotes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterQuotes = () => {
    let filtered = quotes

    if (searchTerm) {
      filtered = filtered.filter(quote => 
        quote.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.file?.original_filename?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(quote => quote.status === statusFilter)
    }

    setFilteredQuotes(filtered)
  }

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    setIsUpdating(true)
    try {
      const supabaseClient = supabase()
      
      const { error } = await supabaseClient
        .from('quotes')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId)

      if (error) throw error

      // If quote is accepted, create a print job
      if (newStatus === 'accepted') {
        const quote = quotes.find(q => q.id === quoteId)
        if (quote) {
          await supabaseClient
            .from('print_jobs')
            .insert({
              quote_id: quoteId,
              user_id: quote.user_id,
              status: 'pending'
            })
        }
      }

      await loadQuotes()
      
    } catch (error) {
      console.error('Failed to update quote status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
      accepted: { variant: 'default' as const, label: 'Accepted', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, label: 'Rejected', icon: XCircle },
      expired: { variant: 'outline' as const, label: 'Expired', icon: Clock }
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

  const isQuoteExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date()
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

  const totalQuotes = quotes.length
  const pendingQuotes = quotes.filter(q => q.status === 'pending').length
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length
  const totalValue = quotes
    .filter(q => q.status === 'accepted')
    .reduce((sum, q) => sum + q.total_cost, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Quotes Management</h1>
          <p className="text-muted-foreground">
            Review and manage customer quotes
          </p>
        </div>
        <Button onClick={loadQuotes} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quote Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Quotes</p>
                <p className="text-2xl font-bold">{totalQuotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{pendingQuotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Accepted</p>
                <p className="text-2xl font-bold">{acceptedQuotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Total Value</p>
                <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
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
                placeholder="Search quotes by ID, user, or filename..."
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
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Quotes ({filteredQuotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.map((quote) => (
                <TableRow key={quote.id} className={isQuoteExpired(quote.valid_until) && quote.status === 'pending' ? 'opacity-60' : ''}>
                  <TableCell className="font-mono text-sm">
                    {quote.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-32">
                        {quote.user?.email || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-32">
                        {quote.file?.original_filename || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">${quote.total_cost.toFixed(2)}</span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(quote.status)}
                    {isQuoteExpired(quote.valid_until) && quote.status === 'pending' && (
                      <div className="text-xs text-red-600 mt-1">Expired</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {new Date(quote.valid_until).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(quote.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedQuote(quote)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Quote Details</DialogTitle>
                          </DialogHeader>
                          {selectedQuote && (
                            <QuoteDetailsDialog 
                              quote={selectedQuote}
                              onStatusUpdate={updateQuoteStatus}
                              isUpdating={isUpdating}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      {/* Quick action buttons based on status */}
                      {quote.status === 'pending' && !isQuoteExpired(quote.valid_until) && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuoteStatus(quote.id, 'accepted')}
                            className="text-green-600 hover:text-green-700"
                            title="Accept Quote"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuoteStatus(quote.id, 'rejected')}
                            className="text-red-600 hover:text-red-700"
                            title="Reject Quote"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredQuotes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No quotes found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface QuoteDetailsDialogProps {
  quote: QuoteWithDetails
  onStatusUpdate: (quoteId: string, status: string) => Promise<void>
  isUpdating: boolean
}

function QuoteDetailsDialog({ quote, onStatusUpdate, isUpdating }: QuoteDetailsDialogProps) {
  const costBreakdown = quote.cost_breakdown as any || {}
  const settings = quote.settings as any || {}

  return (
    <div className="space-y-6">
      {/* Quote Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Quote ID</Label>
          <p className="font-mono text-sm">{quote.id}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <div className="mt-1">
            {getStatusBadge(quote.status)}
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Customer</Label>
          <p>{quote.user?.email}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Total Cost</Label>
          <p className="font-semibold text-lg">${quote.total_cost.toFixed(2)}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Created</Label>
          <p>{new Date(quote.created_at).toLocaleString()}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Valid Until</Label>
          <p>{new Date(quote.valid_until).toLocaleString()}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Estimated Days</Label>
          <p>{quote.estimated_days} days</p>
        </div>
      </div>

      {/* File Info */}
      <div>
        <Label className="text-sm font-medium">File Details</Label>
        <div className="mt-2 p-3 border rounded-lg space-y-2">
          <div className="font-medium">{quote.file?.original_filename}</div>
          <div className="text-sm text-muted-foreground">
            Size: {((quote.file?.file_size || 0) / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      </div>

      {/* Print Settings */}
      <div>
        <Label className="text-sm font-medium">Print Configuration</Label>
        <div className="mt-2 p-3 border rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Material:</span> {settings.material || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Quality:</span> {settings.quality || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Infill:</span> {settings.infill || 'N/A'}%
            </div>
            <div>
              <span className="font-medium">Supports:</span> {settings.supports ? 'Yes' : 'No'}
            </div>
            <div>
              <span className="font-medium">Printer:</span> {settings.printer || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Copies:</span> {settings.copies || 1}
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div>
        <Label className="text-sm font-medium">Cost Breakdown</Label>
        <div className="mt-2 p-3 border rounded-lg space-y-2">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Material Cost:</span>
              <span>${(costBreakdown.materialCost || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Labor Cost:</span>
              <span>${(costBreakdown.laborCost || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Base Cost:</span>
              <span>${(costBreakdown.baseCost || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Profit Margin:</span>
              <span>+${(costBreakdown.profit || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${(costBreakdown.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>+${(costBreakdown.tax || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1">
              <span>Total:</span>
              <span>${quote.total_cost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {quote.status === 'pending' && !isQuoteExpired(quote.valid_until) && (
        <div className="flex gap-4">
          <Button 
            onClick={() => onStatusUpdate(quote.id, 'accepted')}
            disabled={isUpdating}
            className="flex-1"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Quote
              </>
            )}
          </Button>
          <Button 
            variant="destructive"
            onClick={() => onStatusUpdate(quote.id, 'rejected')}
            disabled={isUpdating}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject Quote
          </Button>
        </div>
      )}

      {isQuoteExpired(quote.valid_until) && quote.status === 'pending' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">
            This quote has expired and can no longer be accepted.
          </p>
        </div>
      )}
    </div>
  )

  function getStatusBadge(status: string) {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
      accepted: { variant: 'default' as const, label: 'Accepted', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, label: 'Rejected', icon: XCircle },
      expired: { variant: 'outline' as const, label: 'Expired', icon: Clock }
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

  function isQuoteExpired(validUntil: string) {
    return new Date(validUntil) < new Date()
  }
}
