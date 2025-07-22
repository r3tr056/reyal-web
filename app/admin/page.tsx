'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign, 
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShoppingCart,
  CreditCard
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  totalPayments: number
  outstandingInvoices: number
  overdueInvoices: number
  averageOrderValue: number
}

interface RecentOrder {
  id: string
  status: string
  total_amount: number
  created_at: string
  profiles: {
    full_name: string | null
    email: string
  }
  order_items: {
    quantity: number
  }[]
}

interface RecentActivity {
  id: string
  type: 'order' | 'payment' | 'invoice' | 'user'
  description: string
  timestamp: string
  status?: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalPayments: 0,
    outstandingInvoices: 0,
    overdueInvoices: 0,
    averageOrderValue: 0
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to load dashboard data')
      }

      const { summary, recentOrders: orders } = result.data
      
      setStats({
        totalRevenue: summary.totalRevenue,
        totalOrders: summary.totalOrders,
        completedOrders: summary.completedOrders,
        pendingOrders: summary.pendingOrders,
        totalPayments: summary.totalPayments,
        outstandingInvoices: summary.outstandingInvoices,
        overdueInvoices: summary.overdueinvoices,
        averageOrderValue: summary.averageOrderValue
      })

      setRecentOrders(orders || [])

      // Generate recent activity from orders
      const activities: RecentActivity[] = []
      orders?.slice(0, 5).forEach((order: RecentOrder) => {
        activities.push({
          id: order.id,
          type: 'order',
          description: `Order ${order.status} - $${order.total_amount.toFixed(2)}`,
          timestamp: order.created_at,
          status: order.status
        })
      })

      setRecentActivity(activities)

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      change: `$${stats.averageOrderValue.toFixed(2)} avg order`,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toString(),
      change: `${stats.completedOrders} completed`,
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders.toString(),
      change: 'Need attention',
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      title: 'Outstanding Invoices',
      value: stats.outstandingInvoices.toString(),
      change: `${stats.overdueInvoices} overdue`,
      icon: CreditCard,
      color: 'text-red-600'
    }
  ]

  const quickActions = [
    {
      title: 'Pending Orders',
      count: stats.pendingOrders,
      href: '/admin/orders?status=pending',
      icon: Package,
      color: 'bg-yellow-500'
    },
    {
      title: 'Outstanding Invoices',
      count: stats.outstandingInvoices,
      href: '/admin/orders?tab=invoices',
      icon: FileText,
      color: 'bg-blue-500'
    },
    {
      title: 'Overdue Invoices',
      count: stats.overdueInvoices,
      href: '/admin/orders?tab=invoices&status=overdue',
      icon: AlertCircle,
      color: 'bg-red-500'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className={`text-xs ${stat.color}`}>
                    {stat.change}
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${action.color} text-white`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{action.title}</span>
                  </div>
                  <Badge variant={action.count > 0 ? "destructive" : "secondary"}>
                    {action.count}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="flex-shrink-0">
                      {activity.type === 'order' && <Package className="h-5 w-5 text-blue-500" />}
                      {activity.type === 'payment' && <CreditCard className="h-5 w-5 text-green-500" />}
                      {activity.type === 'invoice' && <FileText className="h-5 w-5 text-purple-500" />}
                      {activity.type === 'user' && <Users className="h-5 w-5 text-orange-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {activity.status && (
                      <Badge 
                        variant={
                          ['completed', 'delivered'].includes(activity.status) ? 'default' :
                          ['pending', 'confirmed'].includes(activity.status) ? 'secondary' :
                          ['cancelled', 'failed'].includes(activity.status) ? 'destructive' : 'outline'
                        }
                      >
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Order System: Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Payment Processing: Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Invoice Generation: Operational</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
