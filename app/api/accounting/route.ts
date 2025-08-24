import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface AccountingEntry {
  id: string
  entry_number: string
  reference_type: 'invoice' | 'payment' | 'refund' | 'expense' | 'adjustment'
  reference_id: string
  entry_date: string
  description: string
  fiscal_year: number
  fiscal_period: number
  status: 'draft' | 'posted' | 'cancelled'
  entry_lines: AccountingEntryLine[]
  created_at: string
  created_by: string
  posted_at?: string
  posted_by?: string
}

interface AccountingEntryLine {
  id: string
  entry_id: string
  account_code: string
  account_name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  debit_amount: number
  credit_amount: number
  description?: string
}

interface RevenueMetrics {
  total_revenue: number
  recognized_revenue: number
  deferred_revenue: number
  recurring_revenue: number
  one_time_revenue: number
  revenue_by_product: Record<string, number>
  revenue_by_customer: Array<{
    customer_id: string
    revenue: number
    percentage: number
  }>
  monthly_trends: Array<{
    month: string
    revenue: number
    growth_rate: number
  }>
}

interface FinancialStatement {
  period: string
  income_statement: {
    revenue: {
      printing_services: number
      design_services: number
      material_sales: number
      shipping: number
      total: number
    }
    cost_of_goods_sold: {
      materials: number
      labor: number
      machine_depreciation: number
      utilities: number
      total: number
    }
    gross_profit: number
    operating_expenses: {
      marketing: number
      administrative: number
      rent: number
      insurance: number
      other: number
      total: number
    }
    operating_income: number
    other_income: number
    net_income: number
  }
  balance_sheet: {
    assets: {
      current_assets: {
        cash: number
        accounts_receivable: number
        inventory: number
        prepaid_expenses: number
        total: number
      }
      fixed_assets: {
        equipment: number
        accumulated_depreciation: number
        net_equipment: number
        total: number
      }
      total_assets: number
    }
    liabilities: {
      current_liabilities: {
        accounts_payable: number
        accrued_expenses: number
        short_term_debt: number
        total: number
      }
      long_term_liabilities: {
        long_term_debt: number
        total: number
      }
      total_liabilities: number
    }
    equity: {
      capital: number
      retained_earnings: number
      total: number
    }
    total_liabilities_equity: number
  }
}

// GET /api/accounting - Get accounting data, entries, and financial reports
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin - accounting data requires admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required for accounting data' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'entries', 'revenue', 'expenses', 'statements', 'metrics'
    const period = searchParams.get('period') // 'current_month', 'current_quarter', 'current_year'
    const status = searchParams.get('status')
    const account_type = searchParams.get('account_type')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')

    switch (type) {
      case 'entries':
        return handleGetAccountingEntries(request, user.id)
      case 'revenue':
        return handleGetRevenueAnalysis(request, user.id)
      case 'expenses':
        return handleGetExpenseAnalysis(request, user.id)
      case 'statements':
        return handleGetFinancialStatements(request, user.id)
      case 'metrics':
        return handleGetBusinessMetrics(request, user.id)
      default:
        return handleGetAccountingSummary(request, user.id)
    }

  } catch (error) {
    console.error('Accounting GET error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

async function handleGetAccountingEntries(request: NextRequest, userId: string) {
  // Mock accounting entries data
  const entries: AccountingEntry[] = [
    {
      id: 'entry_001',
      entry_number: 'JE-2024-000001',
      reference_type: 'invoice',
      reference_id: 'inv_001',
      entry_date: '2024-01-15T00:00:00Z',
      description: 'Revenue recognition for INV-2024-000001',
      fiscal_year: 2024,
      fiscal_period: 1,
      status: 'posted',
      entry_lines: [
        {
          id: 'line_001',
          entry_id: 'entry_001',
          account_code: '1200',
          account_name: 'Accounts Receivable',
          account_type: 'asset',
          debit_amount: 1525.00,
          credit_amount: 0.00,
          description: 'Customer invoice INV-2024-000001'
        },
        {
          id: 'line_002',
          entry_id: 'entry_001',
          account_code: '4000',
          account_name: '3D Printing Services Revenue',
          account_type: 'revenue',
          debit_amount: 0.00,
          credit_amount: 1300.00,
          description: 'Printing services revenue'
        },
        {
          id: 'line_003',
          entry_id: 'entry_001',
          account_code: '2200',
          account_name: 'Sales Tax Payable',
          account_type: 'liability',
          debit_amount: 0.00,
          credit_amount: 225.00,
          description: 'GST collected on sale'
        }
      ],
      created_at: '2024-01-15T10:00:00Z',
      created_by: userId,
      posted_at: '2024-01-15T10:30:00Z',
      posted_by: userId
    },
    {
      id: 'entry_002',
      entry_number: 'JE-2024-000002',
      reference_type: 'payment',
      reference_id: 'pay_001',
      entry_date: '2024-01-20T00:00:00Z',
      description: 'Payment received for INV-2024-000001',
      fiscal_year: 2024,
      fiscal_period: 1,
      status: 'posted',
      entry_lines: [
        {
          id: 'line_004',
          entry_id: 'entry_002',
          account_code: '1000',
          account_name: 'Cash - Operating Account',
          account_type: 'asset',
          debit_amount: 1525.00,
          credit_amount: 0.00,
          description: 'Cash received from customer'
        },
        {
          id: 'line_005',
          entry_id: 'entry_002',
          account_code: '1200',
          account_name: 'Accounts Receivable',
          account_type: 'asset',
          debit_amount: 0.00,
          credit_amount: 1525.00,
          description: 'Collection of outstanding receivable'
        }
      ],
      created_at: '2024-01-20T11:00:00Z',
      created_by: userId,
      posted_at: '2024-01-20T11:15:00Z',
      posted_by: userId
    }
  ]

  return NextResponse.json({
    success: true,
    entries,
    summary: {
      total_entries: entries.length,
      posted_entries: entries.filter(e => e.status === 'posted').length,
      draft_entries: entries.filter(e => e.status === 'draft').length,
      total_debits: entries.reduce((sum, e) => sum + e.entry_lines.reduce((s, l) => s + l.debit_amount, 0), 0),
      total_credits: entries.reduce((sum, e) => sum + e.entry_lines.reduce((s, l) => s + l.credit_amount, 0), 0)
    }
  })
}

async function handleGetRevenueAnalysis(request: NextRequest, userId: string) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'current_month'

  const revenueMetrics: RevenueMetrics = {
    total_revenue: 125430.75,
    recognized_revenue: 118250.50,
    deferred_revenue: 7180.25,
    recurring_revenue: 0, // No subscriptions yet
    one_time_revenue: 125430.75,
    revenue_by_product: {
      '3d_printing_services': 98420.50,
      'design_services': 15680.25,
      'material_sales': 8230.00,
      'shipping': 3100.00
    },
    revenue_by_customer: [
      { customer_id: 'user_001', revenue: 12580.50, percentage: 10.0 },
      { customer_id: 'user_002', revenue: 9875.25, percentage: 7.9 },
      { customer_id: 'user_003', revenue: 8420.75, percentage: 6.7 },
      { customer_id: 'user_004', revenue: 7250.00, percentage: 5.8 }
    ],
    monthly_trends: [
      { month: '2024-01', revenue: 125430.75, growth_rate: 12.5 },
      { month: '2023-12', revenue: 111450.25, growth_rate: 8.2 },
      { month: '2023-11', revenue: 103025.50, growth_rate: 15.1 },
      { month: '2023-10', revenue: 89480.25, growth_rate: 6.8 }
    ]
  }

  const revenueRecognition = {
    recognition_schedule: [
      {
        invoice_id: 'inv_001',
        total_amount: 1525.00,
        recognized_amount: 1525.00,
        deferred_amount: 0.00,
        recognition_date: '2024-01-15',
        method: 'immediate'
      },
      {
        invoice_id: 'inv_005',
        total_amount: 2500.00,
        recognized_amount: 1250.00,
        deferred_amount: 1250.00,
        recognition_date: '2024-02-15',
        method: 'milestone_based'
      }
    ],
    upcoming_recognition: [
      {
        date: '2024-02-15',
        amount: 1250.00,
        description: 'Milestone-based recognition for large custom order'
      },
      {
        date: '2024-02-28',
        amount: 850.00,
        description: 'Completion-based recognition for prototype series'
      }
    ]
  }

  return NextResponse.json({
    success: true,
    revenue_metrics: revenueMetrics,
    revenue_recognition: revenueRecognition,
    period
  })
}

async function handleGetExpenseAnalysis(request: NextRequest, userId: string) {
  const expenseAnalysis = {
    total_expenses: 45230.25,
    expense_categories: {
      materials: {
        amount: 18420.50,
        percentage: 40.7,
        breakdown: {
          pla_filament: 8230.25,
          petg_filament: 4580.75,
          support_materials: 2450.50,
          post_processing: 3159.00
        }
      },
      labor: {
        amount: 12850.75,
        percentage: 28.4,
        breakdown: {
          direct_labor: 9420.50,
          setup_time: 2150.25,
          quality_control: 1280.00
        }
      },
      overhead: {
        amount: 8750.25,
        percentage: 19.4,
        breakdown: {
          electricity: 3420.50,
          rent: 2850.75,
          insurance: 1250.00,
          maintenance: 1229.00
        }
      },
      equipment: {
        amount: 3850.50,
        percentage: 8.5,
        breakdown: {
          depreciation: 2850.50,
          repairs: 650.00,
          upgrades: 350.00
        }
      },
      administrative: {
        amount: 1358.25,
        percentage: 3.0,
        breakdown: {
          software_licenses: 580.00,
          marketing: 450.25,
          legal_professional: 328.00
        }
      }
    },
    cost_per_unit_trends: [
      { month: '2024-01', cost_per_gram: 0.045, total_units: 285420 },
      { month: '2023-12', cost_per_gram: 0.048, total_units: 265850 },
      { month: '2023-11', cost_per_gram: 0.046, total_units: 278950 }
    ],
    efficiency_metrics: {
      material_utilization: 87.5, // percentage
      labor_efficiency: 92.3,
      machine_utilization: 78.9,
      waste_percentage: 4.2
    }
  }

  return NextResponse.json({
    success: true,
    expense_analysis: expenseAnalysis
  })
}

async function handleGetFinancialStatements(request: NextRequest, userId: string) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'current_month'

  const financialStatement: FinancialStatement = {
    period: 'January 2024',
    income_statement: {
      revenue: {
        printing_services: 98420.50,
        design_services: 15680.25,
        material_sales: 8230.00,
        shipping: 3100.00,
        total: 125430.75
      },
      cost_of_goods_sold: {
        materials: 18420.50,
        labor: 12850.75,
        machine_depreciation: 2850.50,
        utilities: 3420.50,
        total: 37542.25
      },
      gross_profit: 87888.50,
      operating_expenses: {
        marketing: 2450.00,
        administrative: 3250.75,
        rent: 8500.00,
        insurance: 1850.00,
        other: 1750.25,
        total: 17801.00
      },
      operating_income: 70087.50,
      other_income: 250.00,
      net_income: 70337.50
    },
    balance_sheet: {
      assets: {
        current_assets: {
          cash: 45230.75,
          accounts_receivable: 18650.25,
          inventory: 12420.50,
          prepaid_expenses: 2850.00,
          total: 79151.50
        },
        fixed_assets: {
          equipment: 185000.00,
          accumulated_depreciation: -45250.00,
          net_equipment: 139750.00,
          total: 139750.00
        },
        total_assets: 218901.50
      },
      liabilities: {
        current_liabilities: {
          accounts_payable: 8450.25,
          accrued_expenses: 3250.50,
          short_term_debt: 5000.00,
          total: 16700.75
        },
        long_term_liabilities: {
          long_term_debt: 45000.00,
          total: 45000.00
        },
        total_liabilities: 61700.75
      },
      equity: {
        capital: 100000.00,
        retained_earnings: 57200.75,
        total: 157200.75
      },
      total_liabilities_equity: 218901.50
    }
  }

  const ratios = {
    profitability: {
      gross_margin: (financialStatement.income_statement.gross_profit / financialStatement.income_statement.revenue.total) * 100,
      operating_margin: (financialStatement.income_statement.operating_income / financialStatement.income_statement.revenue.total) * 100,
      net_margin: (financialStatement.income_statement.net_income / financialStatement.income_statement.revenue.total) * 100,
      return_on_assets: (financialStatement.income_statement.net_income / financialStatement.balance_sheet.assets.total_assets) * 100
    },
    liquidity: {
      current_ratio: financialStatement.balance_sheet.assets.current_assets.total / financialStatement.balance_sheet.liabilities.current_liabilities.total,
      quick_ratio: (financialStatement.balance_sheet.assets.current_assets.cash + financialStatement.balance_sheet.assets.current_assets.accounts_receivable) / financialStatement.balance_sheet.liabilities.current_liabilities.total
    },
    efficiency: {
      asset_turnover: financialStatement.income_statement.revenue.total / financialStatement.balance_sheet.assets.total_assets,
      inventory_turnover: financialStatement.income_statement.cost_of_goods_sold.total / financialStatement.balance_sheet.assets.current_assets.inventory
    }
  }

  return NextResponse.json({
    success: true,
    financial_statement: financialStatement,
    financial_ratios: ratios,
    period
  })
}

async function handleGetBusinessMetrics(request: NextRequest, userId: string) {
  const businessMetrics = {
    kpis: {
      customer_acquisition_cost: 125.50,
      customer_lifetime_value: 1650.42,
      monthly_recurring_revenue: 0, // No subscriptions yet
      annual_recurring_revenue: 0,
      churn_rate: 0, // No subscriptions
      net_revenue_retention: 115.2,
      gross_revenue_retention: 98.5
    },
    operational_metrics: {
      order_fulfillment_time: 3.2, // days
      customer_satisfaction_score: 4.7, // out of 5
      first_time_right_percentage: 96.8,
      capacity_utilization: 78.9,
      on_time_delivery_rate: 94.2
    },
    growth_metrics: {
      month_over_month_growth: 12.5,
      year_over_year_growth: 145.8,
      customer_growth_rate: 8.7,
      market_penetration: 2.3 // percentage in target market
    },
    cash_flow: {
      operating_cash_flow: 68250.75,
      free_cash_flow: 52180.50,
      cash_conversion_cycle: 18.5, // days
      days_sales_outstanding: 12.8,
      days_payable_outstanding: 25.3
    }
  }

  return NextResponse.json({
    success: true,
    business_metrics: businessMetrics,
    generated_at: new Date().toISOString()
  })
}

async function handleGetAccountingSummary(request: NextRequest, userId: string) {
  const summary = {
    current_period: {
      revenue: 125430.75,
      expenses: 45230.25,
      net_income: 70337.50,
      cash_position: 45230.75,
      accounts_receivable: 18650.25,
      accounts_payable: 8450.25
    },
    year_to_date: {
      revenue: 125430.75, // Same as current since we're in January
      expenses: 45230.25,
      net_income: 70337.50,
      cash_flow_from_operations: 68250.75
    },
    alerts: [
      {
        type: 'warning',
        message: 'Accounts receivable aging: 3 invoices overdue by 30+ days',
        amount: 5230.25,
        action_required: true
      },
      {
        type: 'info',
        message: 'Cash position is healthy at ₹45,230.75',
        amount: 45230.75,
        action_required: false
      }
    ]
  }

  return NextResponse.json({
    success: true,
    summary
  })
}

// POST /api/accounting - Create accounting entries and manage financial operations
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, entry_data, adjustment_data } = body

    switch (action) {
      case 'create_entry':
        return handleCreateAccountingEntry(entry_data, user.id)
      
      case 'post_entry':
        return handlePostEntry(body.entry_id, user.id)
      
      case 'record_revenue':
        return handleRecordRevenue(body.revenue_data, user.id)
      
      case 'create_adjustment':
        return handleCreateAdjustment(adjustment_data, user.id)
      
      case 'close_period':
        return handleClosePeriod(body.period, user.id)
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action. Supported: create_entry, post_entry, record_revenue, create_adjustment, close_period' 
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Accounting POST error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

async function handleCreateAccountingEntry(entryData: any, userId: string) {
  const requiredFields = ['description', 'entry_lines']
  for (const field of requiredFields) {
    if (!entryData[field]) {
      return NextResponse.json({ 
        error: `Missing required field: ${field}` 
      }, { status: 400 })
    }
  }

  // Validate that debits equal credits
  const totalDebits = entryData.entry_lines.reduce((sum: number, line: any) => sum + (line.debit_amount || 0), 0)
  const totalCredits = entryData.entry_lines.reduce((sum: number, line: any) => sum + (line.credit_amount || 0), 0)

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return NextResponse.json({ 
      error: 'Debits must equal credits in accounting entry' 
    }, { status: 400 })
  }

  const entryNumber = `JE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`
  
  const newEntry = {
    id: `entry_${Date.now()}`,
    entry_number: entryNumber,
    reference_type: entryData.reference_type || 'adjustment',
    reference_id: entryData.reference_id || '',
    entry_date: entryData.entry_date || new Date().toISOString(),
    description: entryData.description,
    fiscal_year: new Date().getFullYear(),
    fiscal_period: new Date().getMonth() + 1,
    status: 'draft',
    entry_lines: entryData.entry_lines.map((line: any, index: number) => ({
      id: `line_${Date.now()}_${index}`,
      entry_id: `entry_${Date.now()}`,
      account_code: line.account_code,
      account_name: line.account_name,
      account_type: line.account_type,
      debit_amount: line.debit_amount || 0,
      credit_amount: line.credit_amount || 0,
      description: line.description
    })),
    created_at: new Date().toISOString(),
    created_by: userId
  }

  return NextResponse.json({
    success: true,
    entry: newEntry,
    message: 'Accounting entry created successfully'
  })
}

async function handlePostEntry(entryId: string, userId: string) {
  if (!entryId) {
    return NextResponse.json({ 
      error: 'entry_id is required' 
    }, { status: 400 })
  }

  // In production, update entry status and create audit trail
  return NextResponse.json({
    success: true,
    entry_id: entryId,
    status: 'posted',
    posted_at: new Date().toISOString(),
    posted_by: userId,
    message: 'Accounting entry posted successfully'
  })
}

async function handleRecordRevenue(revenueData: any, userId: string) {
  const { invoice_id, amount, recognition_method, recognition_date } = revenueData
  
  if (!invoice_id || !amount) {
    return NextResponse.json({ 
      error: 'invoice_id and amount are required' 
    }, { status: 400 })
  }

  const revenueEntry = {
    id: `rev_${Date.now()}`,
    invoice_id,
    amount,
    recognition_method: recognition_method || 'completion',
    recognition_date: recognition_date || new Date().toISOString(),
    status: 'recognized',
    created_at: new Date().toISOString(),
    created_by: userId
  }

  return NextResponse.json({
    success: true,
    revenue_entry: revenueEntry,
    message: 'Revenue recorded successfully'
  })
}

async function handleCreateAdjustment(adjustmentData: any, userId: string) {
  const { description, adjustments, reason } = adjustmentData
  
  if (!description || !adjustments) {
    return NextResponse.json({ 
      error: 'description and adjustments are required' 
    }, { status: 400 })
  }

  const adjustment = {
    id: `adj_${Date.now()}`,
    adjustment_number: `ADJ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
    description,
    reason,
    adjustments,
    status: 'pending_approval',
    created_at: new Date().toISOString(),
    created_by: userId
  }

  return NextResponse.json({
    success: true,
    adjustment,
    message: 'Adjustment created successfully'
  })
}

async function handleClosePeriod(period: string, userId: string) {
  if (!period) {
    return NextResponse.json({ 
      error: 'period is required' 
    }, { status: 400 })
  }

  // In production, perform period closing procedures
  const closingResult = {
    period,
    status: 'closed',
    closing_date: new Date().toISOString(),
    closed_by: userId,
    summary: {
      total_revenue: 125430.75,
      total_expenses: 45230.25,
      net_income: 70337.50,
      entries_processed: 45,
      adjustments_made: 3
    }
  }

  return NextResponse.json({
    success: true,
    closing_result: closingResult,
    message: 'Period closed successfully'
  })
}
