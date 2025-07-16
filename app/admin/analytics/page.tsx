'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Clock,
  RefreshCw,
  Calendar,
  Printer
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type Quote = Database['public']['Tables']['quotes']['Row']
type PrintJob = Database['public']['Tables']['print_jobs']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface AnalyticsData {
  revenue: {
    total: number
    monthly: number
    daily: number
    trend: number
  }
  orders: {
    total: number
    monthly: number
    daily: number
    trend: number
  }
  customers: {
    total: number
    new_monthly: number
    returning: number
  }
  efficiency: {
    avg_quote_time: number
    avg_print_time: number
    completion_rate: number
  }
  monthly_data: Array<{
    month: string
    revenue: number
    orders: number
    customers: number
  }>
  top_materials: Array<{
    material: string
    count: number
    revenue: number
  }>
  printer_utilization: Array<{
    printer: string
    jobs: number
    hours: number
  }>
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    revenue: { total: 0, monthly: 0, daily: 0, trend: 0 },
    orders: { total: 0, monthly: 0, daily: 0, trend: 0 },
    customers: { total: 0, new_monthly: 0, returning: 0 },
    efficiency: { avg_quote_time: 0, avg_print_time: 0, completion_rate: 0 },
    monthly_data: [],
    top_materials: [],
    printer_utilization: []
  })
  
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      const supabaseClient = supabase()
      
      // Get all data
      const [
        quotesResponse,
        printJobsResponse,
        usersResponse
      ] = await Promise.all([
        supabaseClient.from('quotes').select('*'),
        supabaseClient.from('print_jobs').select('*'),
        supabaseClient.from('profiles').select('*')
      ])

      const quotes = (quotesResponse.data || []) as Quote[]
      const printJobs = (printJobsResponse.data || []) as PrintJob[]
      const users = (usersResponse.data || []) as Profile[]

      // Calculate time periods
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

      // Revenue calculations
      const acceptedQuotes = quotes.filter(q => q.status === 'accepted')
      const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + q.total_cost, 0)
      
      const monthlyRevenue = acceptedQuotes
        .filter(q => new Date(q.created_at) >= startOfMonth)
        .reduce((sum, q) => sum + q.total_cost, 0)
      
      const lastMonthRevenue = acceptedQuotes
        .filter(q => {
          const date = new Date(q.created_at)
          return date >= startOfLastMonth && date <= endOfLastMonth
        })
        .reduce((sum, q) => sum + q.total_cost, 0)
      
      const dailyRevenue = acceptedQuotes
        .filter(q => new Date(q.created_at) >= startOfToday)
        .reduce((sum, q) => sum + q.total_cost, 0)
      
      const revenueTrend = lastMonthRevenue > 0 ? 
        ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

      // Orders calculations
      const totalOrders = printJobs.length
      const monthlyOrders = printJobs.filter(j => new Date(j.created_at) >= startOfMonth).length
      const lastMonthOrders = printJobs.filter(j => {
        const date = new Date(j.created_at)
        return date >= startOfLastMonth && date <= endOfLastMonth
      }).length
      const dailyOrders = printJobs.filter(j => new Date(j.created_at) >= startOfToday).length
      const ordersTrend = lastMonthOrders > 0 ? 
        ((monthlyOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0

      // Customer calculations
      const totalCustomers = users.length
      const newMonthlyCustomers = users.filter(u => new Date(u.created_at) >= startOfMonth).length
      const returningCustomers = users.filter(u => {
        const userOrders = printJobs.filter(j => j.user_id === u.id)
        return userOrders.length > 1
      }).length

      // Efficiency calculations
      const completedJobs = printJobs.filter(j => j.status === 'completed')
      const avgPrintTime = completedJobs.length > 0 ? 
        completedJobs.reduce((sum, j) => {
          if (j.started_at && j.completed_at) {
            return sum + (new Date(j.completed_at).getTime() - new Date(j.started_at).getTime())
          }
          return sum
        }, 0) / completedJobs.length / (1000 * 60 * 60) : 0 // in hours

      const completionRate = printJobs.length > 0 ? 
        (completedJobs.length / printJobs.length) * 100 : 0

      // Monthly data for charts
      const monthlyData = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        
        const monthRevenue = acceptedQuotes
          .filter(q => {
            const date = new Date(q.created_at)
            return date >= monthStart && date <= monthEnd
          })
          .reduce((sum, q) => sum + q.total_cost, 0)
        
        const monthOrders = printJobs
          .filter(j => {
            const date = new Date(j.created_at)
            return date >= monthStart && date <= monthEnd
          }).length
        
        const monthCustomers = users
          .filter(u => {
            const date = new Date(u.created_at)
            return date >= monthStart && date <= monthEnd
          }).length

        monthlyData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          revenue: monthRevenue,
          orders: monthOrders,
          customers: monthCustomers
        })
      }

      // Top materials (simulated data based on settings)
      const materialCounts: { [key: string]: { count: number, revenue: number } } = {}
      acceptedQuotes.forEach(quote => {
        const settings = quote.settings as any || {}
        const material = settings.material || 'PLA'
        if (!materialCounts[material]) {
          materialCounts[material] = { count: 0, revenue: 0 }
        }
        materialCounts[material].count++
        materialCounts[material].revenue += quote.total_cost
      })

      const topMaterials = Object.entries(materialCounts)
        .map(([material, data]) => ({ material, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Printer utilization (simulated data)
      const printerUtilization = [
        { printer: 'Bambu Lab A1 Mini', jobs: Math.floor(totalOrders * 0.6), hours: avgPrintTime * 0.6 },
        { printer: 'Bambu Lab X1 Carbon', jobs: Math.floor(totalOrders * 0.4), hours: avgPrintTime * 0.4 }
      ]

      setAnalytics({
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue,
          daily: dailyRevenue,
          trend: revenueTrend
        },
        orders: {
          total: totalOrders,
          monthly: monthlyOrders,
          daily: dailyOrders,
          trend: ordersTrend
        },
        customers: {
          total: totalCustomers,
          new_monthly: newMonthlyCustomers,
          returning: returningCustomers
        },
        efficiency: {
          avg_quote_time: 2.5, // Simulated
          avg_print_time: avgPrintTime,
          completion_rate: completionRate
        },
        monthly_data: monthlyData,
        top_materials: topMaterials,
        printer_utilization: printerUtilization
      })
      
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
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
          <h1 className="text-2xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">
            Business insights and performance metrics
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAnalytics} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.revenue.total)}</p>
                <div className="flex items-center mt-1">
                  {analytics.revenue.trend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${analytics.revenue.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(analytics.revenue.trend)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">vs last month</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{analytics.orders.total}</p>
                <div className="flex items-center mt-1">
                  {analytics.orders.trend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${analytics.orders.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(analytics.orders.trend)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">vs last month</span>
                </div>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{analytics.customers.total}</p>
                <p className="text-sm text-muted-foreground">
                  {analytics.customers.new_monthly} new this month
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{analytics.efficiency.completion_rate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">
                  Avg: {analytics.efficiency.avg_print_time.toFixed(1)}h per job
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.monthly_data.map((month, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{month.month}</span>
                    <span>{formatCurrency(month.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min((month.revenue / Math.max(...analytics.monthly_data.map(m => m.revenue))) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{month.orders} orders</span>
                    <span>{month.customers} new customers</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Materials */}
        <Card>
          <CardHeader>
            <CardTitle>Top Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.top_materials.map((material, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{material.material}</p>
                      <p className="text-sm text-muted-foreground">{material.count} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(material.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Printer Utilization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Printer Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.printer_utilization.map((printer, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{printer.printer}</span>
                    <span className="text-sm text-muted-foreground">
                      {printer.jobs} jobs
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min((printer.jobs / Math.max(...analytics.printer_utilization.map(p => p.jobs))) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ~{printer.hours.toFixed(1)} hours print time
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Average Order Value</span>
                <span className="font-semibold">
                  {formatCurrency(analytics.orders.total > 0 ? analytics.revenue.total / analytics.orders.total : 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Returning Customers</span>
                <span className="font-semibold">
                  {analytics.customers.returning} ({((analytics.customers.returning / Math.max(analytics.customers.total, 1)) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">This Month Revenue</span>
                <span className="font-semibold">{formatCurrency(analytics.revenue.monthly)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Today Revenue</span>
                <span className="font-semibold">{formatCurrency(analytics.revenue.daily)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">Average Quote Response</span>
                <span className="font-semibold">{analytics.efficiency.avg_quote_time}h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
