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
  Printer,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { Database } from '@/lib/types/database'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

type Quote = Database['public']['Tables']['quotes']['Row']
type PrintJob = Database['public']['Tables']['print_jobs']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type UploadedFile = Database['public']['Tables']['uploaded_files']['Row']

interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  activePrintJobs: number
  pendingQuotes: number
  completedOrders: number
  errorJobs: number
  monthlyRevenue: number
  weeklyOrders: number
}

interface RecentActivity {
  id: string
  type: 'order' | 'quote' | 'print_job' | 'user'
  description: string
  timestamp: string
  status?: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalUsers: 0,
    activePrintJobs: 0,
    pendingQuotes: 0,
    completedOrders: 0,
    errorJobs: 0,
    monthlyRevenue: 0,
    weeklyOrders: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const supabaseClient = supabase()
      
      // Get basic stats
      const [
        quotesResponse,
        printJobsResponse,
        usersResponse,
        filesResponse
      ] = await Promise.all([
        supabaseClient.from('quotes').select('*'),
        supabaseClient.from('print_jobs').select('*'),
        supabaseClient.from('profiles').select('*'),
        supabaseClient.from('uploaded_files').select('*')
      ])

      const quotes = (quotesResponse.data || []) as Quote[]
      const printJobs = (printJobsResponse.data || []) as PrintJob[]
      const users = (usersResponse.data || []) as Profile[]
      const files = (filesResponse.data || []) as UploadedFile[]

      // Calculate revenue
      const totalRevenue = quotes
        .filter(q => q.status === 'accepted')
        .reduce((sum, q) => sum + (q.total_cost || 0), 0)

      const monthlyRevenue = quotes
        .filter(q => {
          const quoteDate = new Date(q.created_at)
          const now = new Date()
          return quoteDate.getMonth() === now.getMonth() && 
                 quoteDate.getFullYear() === now.getFullYear() &&
                 q.status === 'accepted'
        })
        .reduce((sum, q) => sum + (q.total_cost || 0), 0)

      const weeklyOrders = printJobs.filter(job => {
        const jobDate = new Date(job.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return jobDate >= weekAgo
      }).length

      setStats({
        totalRevenue,
        totalOrders: printJobs.length,
        totalUsers: users.length,
        activePrintJobs: printJobs.filter(j => j.status === 'printing').length,
        pendingQuotes: quotes.filter(q => q.status === 'pending').length,
        completedOrders: printJobs.filter(j => j.status === 'completed').length,
        errorJobs: printJobs.filter(j => j.status === 'failed').length,
        monthlyRevenue,
        weeklyOrders
      })

      // Generate recent activity
      const activities: RecentActivity[] = []
      
      // Recent quotes
      quotes.slice(0, 3).forEach(quote => {
        activities.push({
          id: quote.id,
          type: 'quote',
          description: `New quote generated for $${quote.total_cost?.toFixed(2) || '0'}`,
          timestamp: quote.created_at,
          status: quote.status
        })
      })

      // Recent print jobs
      printJobs.slice(0, 3).forEach(job => {
        activities.push({
          id: job.id,
          type: 'print_job',
          description: `Print job ${job.status}`,
          timestamp: job.updated_at,
          status: job.status
        })
      })

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivity(activities.slice(0, 5))

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
      change: `$${stats.monthlyRevenue.toFixed(2)} this month`,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toString(),
      change: `${stats.weeklyOrders} this week`,
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Active Users',
      value: stats.totalUsers.toString(),
      change: 'Registered users',
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'Active Print Jobs',
      value: stats.activePrintJobs.toString(),
      change: `${stats.completedOrders} completed`,
      icon: Printer,
      color: 'text-orange-600'
    }
  ]

  const quickActions = [
    {
      title: 'Pending Quotes',
      count: stats.pendingQuotes,
      href: '/admin/quotes?status=pending',
      icon: FileText,
      color: 'bg-yellow-500'
    },
    {
      title: 'Print Queue',
      count: stats.activePrintJobs,
      href: '/admin/print-jobs?status=printing',
      icon: Printer,
      color: 'bg-blue-500'
    },
    {
      title: 'Failed Jobs',
      count: stats.errorJobs,
      href: '/admin/print-jobs?status=failed',
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
                      {activity.type === 'quote' && <FileText className="h-5 w-5 text-blue-500" />}
                      {activity.type === 'print_job' && <Printer className="h-5 w-5 text-green-500" />}
                      {activity.type === 'order' && <Package className="h-5 w-5 text-purple-500" />}
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
                          activity.status === 'completed' ? 'default' :
                          activity.status === 'pending' ? 'secondary' :
                          activity.status === 'failed' ? 'destructive' : 'outline'
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
              <span className="text-sm">Upload System: Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">File Analysis: Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Quote Generation: Operational</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
