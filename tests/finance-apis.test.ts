import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test data
let testUserId: string
let testAdminId: string
let testOrderId: string
let testInvoiceId: string
let testMaterialId: string

describe('Business Finance APIs', () => {
  beforeAll(async () => {
    // Create test users
    const { data: testUser } = await supabase.auth.admin.createUser({
      email: 'test-user@example.com',
      password: 'testpassword123',
      email_confirm: true
    })
    testUserId = testUser.user!.id

    const { data: testAdmin } = await supabase.auth.admin.createUser({
      email: 'test-admin@example.com',
      password: 'adminpassword123',
      email_confirm: true
    })
    testAdminId = testAdmin.user!.id

    // Create test profiles
    await supabase.from('profiles').insert([
      {
        id: testUserId,
        email: 'test-user@example.com',
        full_name: 'Test User',
        is_admin: false,
        is_verified: true
      },
      {
        id: testAdminId,
        email: 'test-admin@example.com',
        full_name: 'Test Admin',
        is_admin: true,
        is_verified: true
      }
    ])

    // Create test order
    const { data: order } = await supabase
      .from('orders')
      .insert({
        user_id: testUserId,
        order_number: 'TEST-ORDER-001',
        total_amount: 100.00,
        status: 'pending',
        payment_status: 'pending'
      })
      .select()
      .single()
    testOrderId = order.id
  })

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('invoice_line_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('refunds').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('accounting_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('materials').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    // Delete test users
    await supabase.auth.admin.deleteUser(testUserId)
    await supabase.auth.admin.deleteUser(testAdminId)
  })

  describe('Materials Management API', () => {
    test('should create a new material (admin only)', async () => {
      const response = await fetch('http://localhost:3000/api/materials/management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testAdminId}` // Mock auth
        },
        body: JSON.stringify({
          name: 'Test PLA Filament',
          type: 'filament',
          color: 'Red',
          supplier: 'Test Supplier',
          cost_per_unit: 25.00,
          current_stock: 50,
          minimum_stock: 10,
          unit: 'kg'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.material.name).toBe('Test PLA Filament')
      testMaterialId = data.material.id
    })

    test('should get materials list with pagination', async () => {
      const response = await fetch('http://localhost:3000/api/materials/management?page=1&limit=10')
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.materials)).toBe(true)
    })

    test('should update material stock', async () => {
      const response = await fetch('http://localhost:3000/api/materials/management', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testAdminId}`
        },
        body: JSON.stringify({
          id: testMaterialId,
          current_stock: 75,
          notes: 'Stock replenishment'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.material.current_stock).toBe(75)
    })

    test('should get low stock alerts', async () => {
      const response = await fetch('http://localhost:3000/api/materials/management?action=alerts')
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.alerts)).toBe(true)
    })
  })

  describe('Invoicing API', () => {
    test('should create invoice for order (admin only)', async () => {
      const response = await fetch('http://localhost:3000/api/invoicing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testAdminId}`
        },
        body: JSON.stringify({
          order_id: testOrderId,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Test invoice'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.invoice.order_id).toBe(testOrderId)
      testInvoiceId = data.invoice.id
    })

    test('should get user invoices', async () => {
      const response = await fetch(`http://localhost:3000/api/invoicing?user_id=${testUserId}`)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.invoices)).toBe(true)
    })

    test('should generate PDF for invoice', async () => {
      const response = await fetch(`http://localhost:3000/api/invoicing?action=pdf&invoice_id=${testInvoiceId}`)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/pdf')
    })

    test('should update invoice status (admin only)', async () => {
      const response = await fetch('http://localhost:3000/api/invoicing', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testAdminId}`
        },
        body: JSON.stringify({
          invoice_id: testInvoiceId,
          status: 'sent'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.invoice.status).toBe('sent')
    })
  })

  describe('Billing and Payments API', () => {
    test('should process payment for order', async () => {
      const response = await fetch('http://localhost:3000/api/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUserId}`
        },
        body: JSON.stringify({
          action: 'process_payment',
          order_id: testOrderId,
          amount: 100.00,
          method: 'credit_card',
          payment_details: {
            card_last_four: '1234',
            transaction_id: 'test_transaction_123'
          }
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.payment.status).toBe('completed')
    })

    test('should get payment history for user', async () => {
      const response = await fetch(`http://localhost:3000/api/billing?user_id=${testUserId}`)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.payments)).toBe(true)
    })

    test('should process refund (admin only)', async () => {
      const response = await fetch('http://localhost:3000/api/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testAdminId}`
        },
        body: JSON.stringify({
          action: 'process_refund',
          order_id: testOrderId,
          amount: 50.00,
          reason: 'Customer request'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.refund.status).toBe('completed')
    })

    test('should generate payment receipt', async () => {
      const response = await fetch(`http://localhost:3000/api/billing?action=receipt&order_id=${testOrderId}`)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/pdf')
    })
  })

  describe('Accounting and Revenue API', () => {
    test('should get financial statements (admin only)', async () => {
      const response = await fetch('http://localhost:3000/api/accounting?action=statements&period=30d', {
        headers: {
          'Authorization': `Bearer ${testAdminId}`
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.statements).toHaveProperty('income_statement')
      expect(data.statements).toHaveProperty('balance_sheet')
    })

    test('should get business metrics', async () => {
      const response = await fetch('http://localhost:3000/api/accounting?action=metrics&period=30d', {
        headers: {
          'Authorization': `Bearer ${testAdminId}`
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.metrics).toHaveProperty('total_revenue')
      expect(data.metrics).toHaveProperty('total_orders')
    })

    test('should create manual accounting entry (admin only)', async () => {
      const response = await fetch('http://localhost:3000/api/accounting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testAdminId}`
        },
        body: JSON.stringify({
          action: 'manual_entry',
          entries: [
            {
              account_code: '6000',
              account_name: 'Office Expenses',
              debit_amount: 50.00,
              credit_amount: 0,
              description: 'Office supplies purchase'
            },
            {
              account_code: '1100',
              account_name: 'Cash',
              debit_amount: 0,
              credit_amount: 50.00,
              description: 'Office supplies purchase'
            }
          ]
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.entries).toHaveLength(2)
    })

    test('should perform period closing (admin only)', async () => {
      const response = await fetch('http://localhost:3000/api/accounting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testAdminId}`
        },
        body: JSON.stringify({
          action: 'close_period',
          period_end: new Date().toISOString()
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.closing_entry).toBeDefined()
    })
  })

  describe('Order Management Integration', () => {
    test('should get order with financial data', async () => {
      const response = await fetch(`http://localhost:3000/api/orders/${testOrderId}`, {
        headers: {
          'Authorization': `Bearer ${testUserId}`
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.order).toHaveProperty('invoices')
      expect(data.order).toHaveProperty('payments')
    })

    test('should update order status and trigger finance events (admin only)', async () => {
      const response = await fetch(`http://localhost:3000/api/orders/${testOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testAdminId}`
        },
        body: JSON.stringify({
          status: 'confirmed',
          notes: 'Order confirmed for production'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.order.status).toBe('confirmed')
    })
  })

  describe('Admin Dashboard API', () => {
    test('should get dashboard data (admin only)', async () => {
      const response = await fetch('http://localhost:3000/api/admin/dashboard?period=30d', {
        headers: {
          'Authorization': `Bearer ${testAdminId}`
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('summary')
      expect(data.data).toHaveProperty('charts')
      expect(data.data).toHaveProperty('recentOrders')
    })

    test('should perform bulk order operations (admin only)', async () => {
      const response = await fetch('http://localhost:3000/api/admin/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testAdminId}`
        },
        body: JSON.stringify({
          action: 'updateStatus',
          orderIds: [testOrderId],
          status: 'in_production',
          notes: 'Bulk update test'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.results).toHaveLength(1)
      expect(data.results[0].success).toBe(true)
    })
  })

  describe('Error Handling and Validation', () => {
    test('should reject unauthorized access', async () => {
      const response = await fetch('http://localhost:3000/api/admin/dashboard')
      expect(response.status).toBe(401)
    })

    test('should reject non-admin access to admin endpoints', async () => {
      const response = await fetch('http://localhost:3000/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${testUserId}`
        }
      })
      expect(response.status).toBe(403)
    })

    test('should validate required fields', async () => {
      const response = await fetch('http://localhost:3000/api/materials/management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testAdminId}`
        },
        body: JSON.stringify({
          name: '', // Invalid: empty name
          type: 'filament'
        })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('validation')
    })

    test('should handle invalid IDs gracefully', async () => {
      const response = await fetch('http://localhost:3000/api/orders/invalid-id')
      expect(response.status).toBe(404)
    })
  })
})
