// API Configuration
export const API_CONFIG = {
  // Rate limiting configuration
  RATE_LIMITS: {
    DEFAULT: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      message: 'Too many requests, please try again later'
    },
    ADMIN: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 500,
      message: 'Admin rate limit exceeded'
    },
    PDF_GENERATION: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20,
      message: 'PDF generation rate limit exceeded'
    },
    PAYMENT_PROCESSING: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20,
      message: 'Payment processing rate limit exceeded'
    },
    MARKETPLACE_READ: {
      windowMs: 60 * 1000,
      maxRequests: 100,
      message: 'Market place read limit exceeded'
    }, // 100 requests per minute
    STATS_READ: {
      windowMs: 60 * 1000,
      maxRequests: 30,
      message: 'Stats read limit exceeded'
    }, // 30 requests per minute
    FILTERS_READ: {
      windowMs: 60 * 1000,
      maxRequests: 20,
      message: 'Filters read limit exceeded'
    }, // 20 requests per minute
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
    DEFAULT_PAGE: 1
  },

  // Validation rules
  VALIDATION: {
    MATERIALS: {
      name: {
        required: true,
        minLength: 1,
        maxLength: 255,
        pattern: /^[a-zA-Z0-9\s\-_.]+$/
      },
      type: {
        required: true,
        enum: ['filament', 'resin', 'powder', 'support', 'other']
      },
      cost_per_unit: {
        required: true,
        min: 0,
        max: 10000,
        type: 'number'
      },
      current_stock: {
        required: true,
        min: 0,
        type: 'number'
      },
      minimum_stock: {
        required: true,
        min: 0,
        type: 'number'
      },
      unit: {
        required: true,
        enum: ['kg', 'g', 'ml', 'l', 'pieces', 'sheets']
      }
    },
    
    INVOICES: {
      amount: {
        required: true,
        min: 0.01,
        max: 1000000,
        type: 'number'
      },
      due_date: {
        required: true,
        type: 'date',
        future: true
      },
      notes: {
        maxLength: 1000
      }
    },
    
    PAYMENTS: {
      amount: {
        required: true,
        min: 0.01,
        max: 1000000,
        type: 'number'
      },
      method: {
        required: true,
        enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'other']
      }
    },
    
    ORDERS: {
      shipping_address: {
        required: true,
        type: 'object',
        properties: {
          name: { required: true, minLength: 1, maxLength: 100 },
          address_line_1: { required: true, minLength: 1, maxLength: 200 },
          city: { required: true, minLength: 1, maxLength: 100 },
          state: { required: true, minLength: 1, maxLength: 100 },
          postal_code: { required: true, pattern: /^\d{6}$/ },
          country: { required: true, minLength: 2, maxLength: 3 }
        }
      },
      payment_method: {
        required: true,
        enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'razorpay', 'other']
      },
      currency_code: {
        enum: ['INR', 'USD', 'EUR', 'GBP'],
        default: 'INR'
      },
      exchange_rate: {
        type: 'number',
        min: 0.001,
        max: 1000,
        default: 1.0
      },
      discount_amount: {
        type: 'number',
        min: 0,
        max: 100000
      },
      shipping_amount: {
        type: 'number',
        min: 0,
        max: 10000
      },
      notes: {
        maxLength: 1000
      },
      customer_notes: {
        maxLength: 500
      }
    },
    
    ACCOUNTING: {
      account_code: {
        required: true,
        pattern: /^\d{4}$/
      },
      debit_amount: {
        min: 0,
        type: 'number'
      },
      credit_amount: {
        min: 0,
        type: 'number'
      },
      description: {
        required: true,
        minLength: 1,
        maxLength: 500
      }
    }
  },

  // Business rules
  BUSINESS_RULES: {
    // Tax rates by region/country
    TAX_RATES: {
      DEFAULT: 0.10, // 10%
      US: 0.08,      // 8%
      EU: 0.20,      // 20%
      UK: 0.20,      // 20%
      CA: 0.13       // 13%
    },
    
    // Invoice payment terms (days)
    PAYMENT_TERMS: {
      NET_15: 15,
      NET_30: 30,
      NET_60: 60,
      NET_90: 90
    },
    
    // Material stock thresholds
    STOCK_THRESHOLDS: {
      LOW_STOCK_MULTIPLIER: 1.5, // Alert when stock < minimum_stock * 1.5
      CRITICAL_STOCK_MULTIPLIER: 1.0, // Critical when stock <= minimum_stock
      REORDER_MULTIPLIER: 2.0 // Suggest reorder to minimum_stock * 2.0
    },
    
    // Financial periods
    FINANCIAL_PERIODS: {
      DAILY: 1,
      WEEKLY: 7,
      MONTHLY: 30,
      QUARTERLY: 90,
      YEARLY: 365
    },
    
    // Order processing rules
    ORDER_RULES: {
      AUTO_INVOICE_ON_CONFIRM: true,
      AUTO_PAYMENT_RECORD_ON_PAID: true,
      REQUIRE_PAYMENT_FOR_PRODUCTION: true,
      DEFAULT_SHIPPING_DAYS: 7
    }
  },

  // Chart of Accounts structure
  CHART_OF_ACCOUNTS: {
    ASSETS: {
      range: [1000, 1999],
      accounts: {
        1100: 'Cash',
        1110: 'Petty Cash',
        1200: 'Accounts Receivable',
        1300: 'Inventory - Raw Materials',
        1310: 'Inventory - Work in Process',
        1320: 'Inventory - Finished Goods',
        1400: 'Prepaid Expenses',
        1500: 'Equipment',
        1510: 'Accumulated Depreciation - Equipment',
        1600: 'Furniture & Fixtures',
        1610: 'Accumulated Depreciation - Furniture'
      }
    },
    LIABILITIES: {
      range: [2000, 2999],
      accounts: {
        2100: 'Accounts Payable',
        2200: 'Accrued Expenses',
        2300: 'Customer Deposits',
        2400: 'Sales Tax Payable',
        2500: 'Payroll Liabilities',
        2600: 'Notes Payable - Short Term',
        2700: 'Notes Payable - Long Term'
      }
    },
    EQUITY: {
      range: [3000, 3999],
      accounts: {
        3100: 'Owner\'s Equity',
        3200: 'Retained Earnings',
        3300: 'Current Year Earnings'
      }
    },
    REVENUE: {
      range: [4000, 4999],
      accounts: {
        4000: 'Sales Revenue',
        4100: 'Service Revenue',
        4200: 'Shipping Revenue',
        4300: 'Other Revenue',
        4400: 'Returns and Allowances'
      }
    },
    EXPENSES: {
      range: [5000, 6999],
      accounts: {
        5000: 'Cost of Goods Sold',
        5100: 'Materials Cost',
        5200: 'Labor Cost',
        5300: 'Manufacturing Overhead',
        6000: 'Operating Expenses',
        6100: 'Rent Expense',
        6200: 'Utilities Expense',
        6300: 'Office Supplies',
        6400: 'Marketing Expense',
        6500: 'Professional Services',
        6600: 'Insurance Expense',
        6700: 'Depreciation Expense',
        6800: 'Interest Expense',
        6900: 'Other Expenses'
      }
    }
  },

  // File upload configuration
  FILE_UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
    STORAGE_PATH: {
      INVOICES: 'invoices/',
      RECEIPTS: 'receipts/',
      MATERIALS: 'materials/'
    }
  },

  // Email configuration
  EMAIL: {
    TEMPLATES: {
      INVOICE_CREATED: 'invoice_created',
      INVOICE_REMINDER: 'invoice_reminder',
      PAYMENT_RECEIVED: 'payment_received',
      REFUND_PROCESSED: 'refund_processed',
      LOW_STOCK_ALERT: 'low_stock_alert'
    },
    SENDER: {
      name: 'Reyal Finance',
      email: 'finance@reyal.com'
    }
  },

  // Integration settings
  INTEGRATIONS: {
    PAYMENT_GATEWAYS: {
      STRIPE: {
        enabled: true,
        test_mode: process.env.NODE_ENV !== 'production',
        webhook_endpoint: '/api/webhooks/stripe'
      },
      PAYPAL: {
        enabled: false,
        test_mode: process.env.NODE_ENV !== 'production',
        webhook_endpoint: '/api/webhooks/paypal'
      }
    },
    ACCOUNTING_SOFTWARE: {
      QUICKBOOKS: {
        enabled: false,
        sync_enabled: false
      },
      XERO: {
        enabled: false,
        sync_enabled: false
      }
    }
  },

  // Security settings
  SECURITY: {
    ENCRYPTION: {
      PAYMENT_DATA: true,
      CUSTOMER_DATA: true,
      FINANCIAL_REPORTS: true
    },
    ACCESS_CONTROL: {
      REQUIRE_MFA_FOR_ADMIN: false,
      SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes
    },
    AUDIT_LOGGING: {
      ENABLED: true,
      LOG_PAYMENTS: true,
      LOG_INVOICES: true,
      LOG_REFUNDS: true,
      LOG_ADMIN_ACTIONS: true,
      RETENTION_DAYS: 2555 // 7 years
    }
  },

  // Reporting configuration
  REPORTING: {
    FORMATS: ['json', 'csv', 'pdf'],
    MAX_EXPORT_RECORDS: 10000,
    SCHEDULED_REPORTS: {
      DAILY_SALES: true,
      WEEKLY_FINANCIAL: true,
      MONTHLY_RECONCILIATION: true
    }
  }
}

// Validation functions
export const validateInput = (data: any, schema: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]
    const fieldRules = rules as any
    
    // Required field check
    if (fieldRules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`)
      continue
    }
    
    // Skip other validations if field is not provided and not required
    if (value === undefined || value === null) continue
    
    // Type validation
    if (fieldRules.type) {
      switch (fieldRules.type) {
        case 'number':
          if (isNaN(Number(value))) {
            errors.push(`${field} must be a number`)
            continue
          }
          break
        case 'date':
          if (isNaN(Date.parse(value))) {
            errors.push(`${field} must be a valid date`)
            continue
          }
          break
      }
    }
    
    // String length validation
    if (typeof value === 'string') {
      if (fieldRules.minLength && value.length < fieldRules.minLength) {
        errors.push(`${field} must be at least ${fieldRules.minLength} characters`)
      }
      if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
        errors.push(`${field} must be no more than ${fieldRules.maxLength} characters`)
      }
    }
    
    // Number range validation
    if (fieldRules.type === 'number') {
      const numValue = Number(value)
      if (fieldRules.min !== undefined && numValue < fieldRules.min) {
        errors.push(`${field} must be at least ${fieldRules.min}`)
      }
      if (fieldRules.max !== undefined && numValue > fieldRules.max) {
        errors.push(`${field} must be no more than ${fieldRules.max}`)
      }
    }
    
    // Enum validation
    if (fieldRules.enum && !fieldRules.enum.includes(value)) {
      errors.push(`${field} must be one of: ${fieldRules.enum.join(', ')}`)
    }
    
    // Pattern validation
    if (fieldRules.pattern && typeof value === 'string' && !fieldRules.pattern.test(value)) {
      errors.push(`${field} has an invalid format`)
    }
    
    // Date validation
    if (fieldRules.future && fieldRules.type === 'date') {
      if (new Date(value) <= new Date()) {
        errors.push(`${field} must be a future date`)
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Tax calculation helper
export const calculateTax = (amount: number, countryCode?: string): number => {
  const taxRates = API_CONFIG.BUSINESS_RULES.TAX_RATES as Record<string, number>
  const taxRate = taxRates[countryCode || 'DEFAULT'] || taxRates.DEFAULT
  return Math.round(amount * taxRate * 100) / 100
}

// Account code validation
export const validateAccountCode = (code: string): boolean => {
  const numCode = parseInt(code)
  
  // Check if it's in any valid range
  for (const category of Object.values(API_CONFIG.CHART_OF_ACCOUNTS)) {
    const [min, max] = category.range
    if (numCode >= min && numCode <= max) {
      return true
    }
  }
  
  return false
}

// Get account category from code
export const getAccountCategory = (code: string): string | null => {
  const numCode = parseInt(code)
  
  for (const [categoryName, category] of Object.entries(API_CONFIG.CHART_OF_ACCOUNTS)) {
    const [min, max] = category.range
    if (numCode >= min && numCode <= max) {
      return categoryName
    }
  }
  
  return null
}
