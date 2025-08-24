-- Business Finance Management Migration
-- Add comprehensive business finance, accounting, billing, and invoicing capabilities
-- Run this after the main database setup

-- =============================================================================
-- BUSINESS FINANCE TABLES
-- =============================================================================

-- 1. Enhanced Orders Table (add missing fields)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS invoice_id UUID,
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,6) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC(10,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(10,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS business_notes TEXT,
ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- 2. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Invoice Details
  invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded')),
  
  -- Financial Amounts
  subtotal NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  discount_amount NUMERIC(10,2) DEFAULT 0.0,
  shipping_amount NUMERIC(10,2) DEFAULT 0.0,
  total_amount NUMERIC(10,2) NOT NULL,
  paid_amount NUMERIC(10,2) DEFAULT 0.0,
  balance_due NUMERIC(10,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  
  -- Currency & Locale
  currency_code TEXT DEFAULT 'INR',
  exchange_rate NUMERIC(10,6) DEFAULT 1.0,
  
  -- Addresses
  billing_address JSONB NOT NULL,
  shipping_address JSONB,
  
  -- Terms & Notes
  payment_terms TEXT DEFAULT 'Net 30',
  notes TEXT,
  internal_notes TEXT,
  
  -- Metadata
  pdf_url TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 3. Invoice Line Items
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  order_item_id UUID,
  
  -- Item Details
  description TEXT NOT NULL,
  sku TEXT,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  -- Tax Information
  tax_rate NUMERIC(5,4) DEFAULT 0.0,
  tax_amount NUMERIC(10,2) GENERATED ALWAYS AS (line_total * tax_rate) STORED,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  
  -- References
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Payment Details
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency_code TEXT DEFAULT 'INR',
  exchange_rate NUMERIC(10,6) DEFAULT 1.0,
  
  -- Payment Method
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'upi', 'netbanking', 'wallet', 'cash', 'bank_transfer', 'cheque')),
  payment_gateway TEXT,
  transaction_id TEXT,
  gateway_response JSONB,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  failure_reason TEXT,
  
  -- References
  reference_number TEXT,
  notes TEXT,
  internal_notes TEXT,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Refunds Table
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  refund_number TEXT UNIQUE NOT NULL,
  
  -- References
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Refund Details
  refund_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency_code TEXT DEFAULT 'INR',
  
  -- Reason & Status
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Gateway Information
  gateway_refund_id TEXT,
  gateway_response JSONB,
  
  -- Notes
  notes TEXT,
  internal_notes TEXT,
  
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Accounting Entries (Double-entry bookkeeping)
CREATE TABLE IF NOT EXISTS public.accounting_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entry_number TEXT UNIQUE NOT NULL,
  
  -- References
  reference_type TEXT NOT NULL CHECK (reference_type IN ('invoice', 'payment', 'refund', 'expense', 'adjustment')),
  reference_id UUID NOT NULL,
  
  -- Entry Details
  entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  description TEXT NOT NULL,
  
  -- Financial Period
  fiscal_year INTEGER NOT NULL,
  fiscal_period INTEGER NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Accounting Entry Lines (Chart of Accounts)
CREATE TABLE IF NOT EXISTS public.accounting_entry_lines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entry_id UUID REFERENCES public.accounting_entries(id) ON DELETE CASCADE NOT NULL,
  
  -- Account Information
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  
  -- Amounts
  debit_amount NUMERIC(10,2) DEFAULT 0.0,
  credit_amount NUMERIC(10,2) DEFAULT 0.0,
  
  -- Currency
  currency_code TEXT DEFAULT 'INR',
  
  -- Description
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Revenue Recognition
CREATE TABLE IF NOT EXISTS public.revenue_recognition (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- References
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- Recognition Details
  recognition_date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'recognized', 'deferred', 'cancelled')),
  
  -- Method
  recognition_method TEXT DEFAULT 'completion' CHECK (recognition_method IN ('completion', 'milestone', 'time_based')),
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- 9. Business Metrics & Analytics
CREATE TABLE IF NOT EXISTS public.business_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Period
  metric_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  
  -- Revenue Metrics
  total_revenue NUMERIC(12,2) DEFAULT 0.0,
  net_revenue NUMERIC(12,2) DEFAULT 0.0,
  recurring_revenue NUMERIC(12,2) DEFAULT 0.0,
  
  -- Order Metrics
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  average_order_value NUMERIC(10,2) DEFAULT 0.0,
  
  -- Customer Metrics
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  customer_lifetime_value NUMERIC(10,2) DEFAULT 0.0,
  
  -- Cost Metrics
  total_costs NUMERIC(12,2) DEFAULT 0.0,
  material_costs NUMERIC(12,2) DEFAULT 0.0,
  labor_costs NUMERIC(12,2) DEFAULT 0.0,
  overhead_costs NUMERIC(12,2) DEFAULT 0.0,
  
  -- Profitability
  gross_profit NUMERIC(12,2) DEFAULT 0.0,
  net_profit NUMERIC(12,2) DEFAULT 0.0,
  profit_margin NUMERIC(5,4) DEFAULT 0.0,
  
  -- Additional Metrics
  metrics_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Customer Credit & Balances
CREATE TABLE IF NOT EXISTS public.customer_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Balances
  credit_balance NUMERIC(10,2) DEFAULT 0.0,
  outstanding_balance NUMERIC(10,2) DEFAULT 0.0,
  total_paid NUMERIC(12,2) DEFAULT 0.0,
  total_refunded NUMERIC(12,2) DEFAULT 0.0,
  
  -- Credit Limits
  credit_limit NUMERIC(10,2) DEFAULT 0.0,
  credit_used NUMERIC(10,2) DEFAULT 0.0,
  
  -- Payment Terms
  payment_terms TEXT DEFAULT 'Net 30',
  credit_hold BOOLEAN DEFAULT false,
  
  -- Statistics
  total_orders INTEGER DEFAULT 0,
  average_payment_days NUMERIC(5,1) DEFAULT 0.0,
  payment_history_score NUMERIC(3,2) DEFAULT 0.0,
  
  last_payment_date TIMESTAMP WITH TIME ZONE,
  last_order_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON public.invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_total_amount ON public.invoices(total_amount);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON public.payments(payment_method);

-- Accounting indexes
CREATE INDEX IF NOT EXISTS idx_accounting_entries_reference ON public.accounting_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_entry_date ON public.accounting_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_fiscal ON public.accounting_entries(fiscal_year, fiscal_period);
CREATE INDEX IF NOT EXISTS idx_accounting_entry_lines_account ON public.accounting_entry_lines(account_code, account_type);

-- Business metrics indexes
CREATE INDEX IF NOT EXISTS idx_business_metrics_date ON public.business_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_business_metrics_period ON public.business_metrics(period_type, metric_date);

-- =============================================================================
-- UPDATED TRIGGERS
-- =============================================================================

-- Add updated_at triggers for new tables
CREATE TRIGGER handle_invoices_updated_at 
  BEFORE UPDATE ON public.invoices 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_payments_updated_at 
  BEFORE UPDATE ON public.payments 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_refunds_updated_at 
  BEFORE UPDATE ON public.refunds 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_accounting_entries_updated_at 
  BEFORE UPDATE ON public.accounting_entries 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_business_metrics_updated_at 
  BEFORE UPDATE ON public.business_metrics 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_customer_balances_updated_at 
  BEFORE UPDATE ON public.customer_balances 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- BUSINESS FUNCTIONS
-- =============================================================================

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_number TEXT;
BEGIN
  -- Get next invoice number for the current year
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM invoices 
  WHERE invoice_number LIKE 'INV-' || EXTRACT(YEAR FROM NOW()) || '-%';
  
  invoice_number := 'INV-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(next_number::TEXT, 6, '0');
  
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Generate payment number
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  payment_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 'PAY-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM payments 
  WHERE payment_number LIKE 'PAY-' || EXTRACT(YEAR FROM NOW()) || '-%';
  
  payment_number := 'PAY-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(next_number::TEXT, 6, '0');
  
  RETURN payment_number;
END;
$$ LANGUAGE plpgsql;

-- Calculate customer payment score
CREATE OR REPLACE FUNCTION calculate_payment_score(customer_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  on_time_payments INTEGER;
  total_payments INTEGER;
  avg_days_late NUMERIC;
  score NUMERIC;
BEGIN
  -- Get payment statistics
  SELECT 
    COUNT(CASE WHEN p.payment_date <= i.due_date THEN 1 END),
    COUNT(*),
    AVG(GREATEST(0, EXTRACT(DAY FROM p.payment_date - i.due_date)))
  INTO on_time_payments, total_payments, avg_days_late
  FROM payments p
  JOIN invoices i ON p.invoice_id = i.id
  WHERE i.user_id = customer_id AND p.status = 'completed';
  
  IF total_payments = 0 THEN
    RETURN 0.5; -- Neutral score for new customers
  END IF;
  
  -- Calculate score (0-1 scale)
  score := (on_time_payments::NUMERIC / total_payments) * 0.7 + 
           GREATEST(0, 1 - (avg_days_late / 30)) * 0.3;
  
  RETURN LEAST(1.0, GREATEST(0.0, score));
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_recognition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_balances ENABLE ROW LEVEL SECURITY;

-- User access policies
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own refunds" ON public.refunds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own customer balance" ON public.customer_balances
  FOR SELECT USING (auth.uid() = user_id);

-- Admin access policies
CREATE POLICY "Admins can manage all financial data" ON public.invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage all payments" ON public.payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage all refunds" ON public.refunds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage accounting" ON public.accounting_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can view business metrics" ON public.business_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Business Finance Management Migration Complete!';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'New Tables Added:';
  RAISE NOTICE '- invoices (comprehensive invoice management)';
  RAISE NOTICE '- invoice_line_items (detailed line items)';
  RAISE NOTICE '- payments (payment tracking and processing)';
  RAISE NOTICE '- refunds (refund management)';
  RAISE NOTICE '- accounting_entries (double-entry bookkeeping)';
  RAISE NOTICE '- accounting_entry_lines (chart of accounts)';
  RAISE NOTICE '- revenue_recognition (revenue recognition rules)';
  RAISE NOTICE '- business_metrics (analytics and KPIs)';
  RAISE NOTICE '- customer_balances (customer credit management)';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Implement business finance APIs';
  RAISE NOTICE '2. Set up PDF generation for invoices';
  RAISE NOTICE '3. Configure payment gateway integrations';
  RAISE NOTICE '4. Set up automated accounting entries';
  RAISE NOTICE '5. Implement revenue recognition automation';
  RAISE NOTICE '=================================================================';
END $$;
