'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Package, 
  Users, 
  FileText,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react'

interface AnalyticsData {
  revenue: {
    current: number
    previous: number
    growth: number
    trend: 'up' | 'down'
  }
  orders: {
    current: number
    previous: number
    growth: number
    trend: 'up' | 'down'
  }
  users: {
    current: number
    previous: number
    growth: number
    trend: 'up' | 'down'
  }
  quotes: {
    current: number
    previous: number
    growth: number
    trend: 'up' | 'down'
  }
  topMaterials: Array<{
    name: string
    orders: number
    revenue: number
    percentage: number
  }>
  revenueByMonth: Array<{
    month: string
    revenue: number
    orders: number
  }>
  ordersByStatus: Array<{
    status: string
    count: number
    percentage: number
  }>
  customerMetrics: {
    newCustomers: number
    returningCustomers: number
    averageOrderValue: number
    customerLifetimeValue: number
  }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/analytics?period=${period}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-orange-500',
      confirmed: 'bg-blue-500',
      in_production: 'bg-purple-500',
      shipped: 'bg-cyan-500',
      delivered: 'bg-emerald-500',
      cancelled: 'bg-red-500'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Failed to load analytics data</p>
        <Button onClick={fetchAnalytics} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">Business insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 bg-gray-800 border-gray-700">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(analytics.revenue.current)}
            </div>
            <div className="flex items-center text-xs mt-1">
              {analytics.revenue.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-400" />
              )}
              <span className={`font-medium ${analytics.revenue.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatPercentage(analytics.revenue.growth)}
              </span>
              <span className="text-gray-400 ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Orders</CardTitle>
            <Package className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.orders.current}</div>
            <div className="flex items-center text-xs mt-1">
              {analytics.orders.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-400" />
              )}
              <span className={`font-medium ${analytics.orders.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatPercentage(analytics.orders.growth)}
              </span>
              <span className="text-gray-400 ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Customers</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.users.current}</div>
            <div className="flex items-center text-xs mt-1">
              {analytics.users.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-400" />
              )}
              <span className={`font-medium ${analytics.users.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatPercentage(analytics.users.growth)}
              </span>
              <span className="text-gray-400 ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Quotes</CardTitle>
            <FileText className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.quotes.current}</div>
            <div className="flex items-center text-xs mt-1">
              {analytics.quotes.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-400" />
              )}
              <span className={`font-medium ${analytics.quotes.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatPercentage(analytics.quotes.growth)}
              </span>
              <span className="text-gray-400 ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.revenueByMonth.map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 text-sm text-gray-400">{month.month}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-2 bg-emerald-500 rounded"
                          style={{ 
                            width: `${(month.revenue / Math.max(...analytics.revenueByMonth.map(m => m.revenue))) * 100}%`,
                            minWidth: '4px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {formatCurrency(month.revenue)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {month.orders} orders
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Order Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.ordersByStatus.map((status, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status.status)}`} />
                    <span className="text-gray-300 capitalize">
                      {status.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">{status.count}</div>
                    <div className="text-xs text-gray-400">{status.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Top Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topMaterials.map((material, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-white">{material.name}</p>
                    <p className="text-sm text-gray-400">{material.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-emerald-400">
                      {formatCurrency(material.revenue)}
                    </p>
                    <p className="text-xs text-gray-400">{material.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Customer Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">New Customers</p>
                <p className="text-2xl font-bold text-white">
                  {analytics.customerMetrics.newCustomers}
                </p>
              </div>
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">Returning Customers</p>
                <p className="text-2xl font-bold text-white">
                  {analytics.customerMetrics.returningCustomers}
                </p>
              </div>
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">Avg Order Value</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(analytics.customerMetrics.averageOrderValue)}
                </p>
              </div>
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">Customer LTV</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(analytics.customerMetrics.customerLifetimeValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Key Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Quote Conversion Rate</p>
              <p className="text-2xl font-bold text-emerald-400">
                {analytics.quotes.current > 0 
                  ? ((analytics.orders.current / analytics.quotes.current) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Customer Retention</p>
              <p className="text-2xl font-bold text-blue-400">
                {analytics.customerMetrics.newCustomers + analytics.customerMetrics.returningCustomers > 0
                  ? ((analytics.customerMetrics.returningCustomers / (analytics.customerMetrics.newCustomers + analytics.customerMetrics.returningCustomers)) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Revenue per Customer</p>
              <p className="text-2xl font-bold text-purple-400">
                {analytics.users.current > 0
                  ? formatCurrency(analytics.revenue.current / analytics.users.current)
                  : formatCurrency(0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Orders per Customer</p>
              <p className="text-2xl font-bold text-orange-400">
                {analytics.users.current > 0
                  ? (analytics.orders.current / analytics.users.current).toFixed(1)
                  : '0.0'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
