# Business Finance APIs Documentation

This document provides comprehensive documentation for the business finance management APIs in the 3D printing platform.

## Table of Contents

1. [Materials Management API](#materials-management-api)
2. [Invoicing API](#invoicing-api)
3. [Billing and Payments API](#billing-and-payments-api)
4. [Accounting and Revenue API](#accounting-and-revenue-api)
5. [Order Management Integration](#order-management-integration)
6. [Admin Dashboard API](#admin-dashboard-api)
7. [Authentication](#authentication)
8. [Error Handling](#error-handling)

## Authentication

All APIs require authentication. Include the user's session token in the request headers or cookies. Admin-only endpoints require the user to have `is_admin: true` in their profile.

```
Cookie: sb-<project-ref>-auth-token=<token>
```

## Materials Management API

### Endpoint: `/api/materials/management`

Manages 3D printing materials, inventory, and stock tracking.

#### GET - List Materials

```http
GET /api/materials/management?page=1&limit=10&type=filament&search=PLA
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `type` (optional): Filter by material type
- `search` (optional): Search in name, supplier, or color
- `low_stock` (optional): Filter materials with low stock
- `action` (optional): Special actions like "alerts" for low stock alerts

**Response:**
```json
{
  "success": true,
  "materials": [
    {
      "id": "uuid",
      "name": "PLA Filament",
      "type": "filament",
      "color": "Red",
      "supplier": "Supplier Name",
      "cost_per_unit": 25.00,
      "current_stock": 50,
      "minimum_stock": 10,
      "unit": "kg",
      "last_restocked": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "hasMore": true
  }
}
```

#### POST - Create Material (Admin Only)

```http
POST /api/materials/management
Content-Type: application/json

{
  "name": "PLA Filament",
  "type": "filament",
  "color": "Red",
  "supplier": "Supplier Name",
  "cost_per_unit": 25.00,
  "current_stock": 50,
  "minimum_stock": 10,
  "unit": "kg"
}
```

**Response:**
```json
{
  "success": true,
  "material": { /* created material object */ },
  "message": "Material created successfully"
}
```

#### PATCH - Update Material (Admin Only)

```http
PATCH /api/materials/management
Content-Type: application/json

{
  "id": "material-uuid",
  "current_stock": 75,
  "cost_per_unit": 27.50,
  "notes": "Stock replenishment"
}
```

#### DELETE - Delete Material (Admin Only)

```http
DELETE /api/materials/management
Content-Type: application/json

{
  "id": "material-uuid"
}
```

## Invoicing API

### Endpoint: `/api/invoicing`

Manages invoice generation, PDF creation, and invoice tracking.

#### GET - List Invoices

```http
GET /api/invoicing?user_id=uuid&status=pending&page=1&limit=10
```

**Query Parameters:**
- `user_id` (optional): Filter by customer (admin only)
- `status` (optional): Filter by status (pending, sent, paid, overdue, cancelled)
- `overdue` (optional): Filter overdue invoices only
- `page`, `limit`: Pagination
- `action=pdf&invoice_id=uuid`: Generate PDF for specific invoice

**Response:**
```json
{
  "success": true,
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-2024-123456",
      "order_id": "order-uuid",
      "customer_id": "user-uuid",
      "amount": 100.00,
      "tax_amount": 10.00,
      "total_amount": 110.00,
      "status": "pending",
      "due_date": "2024-02-15T00:00:00Z",
      "created_at": "2024-01-15T10:30:00Z",
      "customer": {
        "full_name": "John Doe",
        "email": "john@example.com"
      },
      "line_items": [
        {
          "description": "3D Print Job",
          "quantity": 1,
          "unit_price": 100.00,
          "total_price": 100.00
        }
      ]
    }
  ]
}
```

#### POST - Create Invoice (Admin Only)

```http
POST /api/invoicing
Content-Type: application/json

{
  "order_id": "order-uuid",
  "due_date": "2024-02-15T00:00:00Z",
  "notes": "Payment due within 30 days"
}
```

#### PATCH - Update Invoice (Admin Only)

```http
PATCH /api/invoicing
Content-Type: application/json

{
  "invoice_id": "invoice-uuid",
  "status": "sent",
  "notes": "Invoice sent to customer"
}
```

## Billing and Payments API

### Endpoint: `/api/billing`

Handles payment processing, refunds, and payment tracking.

#### GET - Payment History

```http
GET /api/billing?user_id=uuid&status=completed&page=1&limit=10
```

**Query Parameters:**
- `user_id` (optional): Filter by user (admin only)
- `status` (optional): Filter by payment status
- `action=receipt&order_id=uuid`: Generate payment receipt PDF
- `action=analytics&period=30d`: Get payment analytics (admin only)

#### POST - Process Payment or Refund

**Process Payment:**
```http
POST /api/billing
Content-Type: application/json

{
  "action": "process_payment",
  "order_id": "order-uuid",
  "amount": 110.00,
  "method": "credit_card",
  "payment_details": {
    "card_last_four": "1234",
    "transaction_id": "txn_123456"
  }
}
```

**Process Refund (Admin Only):**
```http
POST /api/billing
Content-Type: application/json

{
  "action": "process_refund",
  "order_id": "order-uuid",
  "amount": 55.00,
  "reason": "Customer request"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "payment-uuid",
    "amount": 110.00,
    "status": "completed",
    "method": "credit_card",
    "transaction_id": "txn_123456"
  },
  "message": "Payment processed successfully"
}
```

## Accounting and Revenue API

### Endpoint: `/api/accounting`

Provides double-entry bookkeeping, financial statements, and business metrics.

#### GET - Financial Data (Admin Only)

**Financial Statements:**
```http
GET /api/accounting?action=statements&period=30d&format=json
```

**Business Metrics:**
```http
GET /api/accounting?action=metrics&period=90d
```

**Chart of Accounts:**
```http
GET /api/accounting?action=accounts
```

**Response (Statements):**
```json
{
  "success": true,
  "statements": {
    "income_statement": {
      "revenue": {
        "sales_revenue": 15000.00,
        "total_revenue": 15000.00
      },
      "expenses": {
        "materials_cost": 5000.00,
        "operating_expenses": 2000.00,
        "total_expenses": 7000.00
      },
      "net_income": 8000.00
    },
    "balance_sheet": {
      "assets": {
        "cash": 10000.00,
        "accounts_receivable": 2000.00,
        "inventory": 3000.00,
        "total_assets": 15000.00
      },
      "liabilities": {
        "accounts_payable": 1000.00,
        "total_liabilities": 1000.00
      },
      "equity": {
        "retained_earnings": 14000.00,
        "total_equity": 14000.00
      }
    }
  },
  "period": "30d"
}
```

#### POST - Accounting Operations (Admin Only)

**Manual Journal Entry:**
```http
POST /api/accounting
Content-Type: application/json

{
  "action": "manual_entry",
  "entries": [
    {
      "account_code": "6000",
      "account_name": "Office Expenses",
      "debit_amount": 100.00,
      "credit_amount": 0,
      "description": "Office supplies"
    },
    {
      "account_code": "1100",
      "account_name": "Cash",
      "debit_amount": 0,
      "credit_amount": 100.00,
      "description": "Office supplies"
    }
  ]
}
```

**Period Closing:**
```http
POST /api/accounting
Content-Type: application/json

{
  "action": "close_period",
  "period_end": "2024-01-31T23:59:59Z"
}
```

## Order Management Integration

### Endpoint: `/api/orders/[id]`

Enhanced order management with financial integration.

#### GET - Order Details with Financial Data

```http
GET /api/orders/order-uuid
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order-uuid",
    "order_number": "ORD20240115-ABC123",
    "status": "confirmed",
    "payment_status": "paid",
    "total_amount": 110.00,
    "order_items": [ /* order items */ ],
    "invoices": [ /* related invoices */ ],
    "payments": [ /* related payments */ ],
    "order_history": [ /* status history */ ]
  }
}
```

#### PATCH - Update Order Status (Admin Only)

```http
PATCH /api/orders/order-uuid
Content-Type: application/json

{
  "status": "confirmed",
  "payment_status": "paid",
  "notes": "Order confirmed for production"
}
```

## Admin Dashboard API

### Endpoint: `/api/admin/dashboard`

Comprehensive business dashboard for admins.

#### GET - Dashboard Data (Admin Only)

```http
GET /api/admin/dashboard?period=30d
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 25000.00,
      "totalOrders": 150,
      "completedOrders": 140,
      "pendingOrders": 10,
      "averageOrderValue": 166.67,
      "outstandingInvoices": 5,
      "overdueinvoices": 2
    },
    "charts": {
      "dailyRevenue": [
        {
          "date": "2024-01-15",
          "revenue": 1500.00,
          "orders": 8
        }
      ],
      "statusDistribution": {
        "pending": 5,
        "confirmed": 3,
        "in_production": 2,
        "shipped": 1,
        "delivered": 139,
        "cancelled": 0
      }
    },
    "recentOrders": [ /* recent orders */ ],
    "lowStockMaterials": [ /* materials needing restock */ ]
  }
}
```

#### POST - Bulk Operations (Admin Only)

**Bulk Status Update:**
```http
POST /api/admin/dashboard
Content-Type: application/json

{
  "action": "updateStatus",
  "orderIds": ["order-1", "order-2"],
  "status": "confirmed",
  "notes": "Bulk confirmation"
}
```

**Bulk Invoice Generation:**
```http
POST /api/admin/dashboard
Content-Type: application/json

{
  "action": "generateInvoices",
  "orderIds": ["order-1", "order-2"]
}
```

## Error Handling

All APIs return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (not logged in)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## Data Types and Enums

### Order Status
- `pending`: Order created, awaiting confirmation
- `confirmed`: Order confirmed, ready for production
- `in_production`: Order being manufactured
- `shipped`: Order shipped to customer
- `delivered`: Order delivered successfully
- `cancelled`: Order cancelled

### Payment Status
- `pending`: Payment not yet processed
- `paid`: Payment completed successfully
- `failed`: Payment failed
- `refunded`: Payment refunded

### Invoice Status
- `pending`: Invoice created, not yet sent
- `sent`: Invoice sent to customer
- `paid`: Invoice paid in full
- `overdue`: Invoice past due date
- `cancelled`: Invoice cancelled

### Material Types
- `filament`: 3D printing filaments
- `resin`: SLA/DLP resins
- `powder`: SLS powders
- `support`: Support materials
- `other`: Other materials

## Rate Limiting

APIs are rate-limited to prevent abuse:
- Standard users: 100 requests per minute
- Admin users: 500 requests per minute
- PDF generation: 10 requests per minute per user

## Webhooks (Future Enhancement)

Planned webhook events for external integrations:
- `order.created`
- `order.status_changed`
- `payment.completed`
- `invoice.generated`
- `material.low_stock`

## SDK and Examples

Example usage with JavaScript fetch:

```javascript
// Create invoice
const createInvoice = async (orderId) => {
  const response = await fetch('/api/invoicing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      order_id: orderId,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
  })
  
  return await response.json()
}

// Process payment
const processPayment = async (orderId, amount) => {
  const response = await fetch('/api/billing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'process_payment',
      order_id: orderId,
      amount: amount,
      method: 'credit_card'
    })
  })
  
  return await response.json()
}
```
