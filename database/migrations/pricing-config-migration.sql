-- Pricing Configuration Migration
-- Run this in Supabase SQL Editor if you already have the database set up

-- Create the pricing_config table
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quality_multipliers JSONB DEFAULT '{
    "draft": 0.7,
    "standard": 1.0,
    "high": 1.4,
    "ultra": 2.0
  }'::jsonb,
  urgency_multipliers JSONB DEFAULT '{
    "standard": 1.0,
    "express": 1.5,
    "rush": 2.0
  }'::jsonb,
  base_labor_rate NUMERIC(10,2) DEFAULT 50.00,
  base_machine_rate NUMERIC(10,2) DEFAULT 25.00,
  tax_rate NUMERIC(5,4) DEFAULT 0.18,
  profit_margin NUMERIC(5,4) DEFAULT 0.35,
  currency_code TEXT DEFAULT 'INR',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- Insert default pricing configuration
INSERT INTO public.pricing_config (quality_multipliers, urgency_multipliers, base_labor_rate, base_machine_rate, tax_rate, profit_margin)
VALUES (
  '{
    "draft": 0.7,
    "standard": 1.0,
    "high": 1.4,
    "ultra": 2.0
  }'::jsonb,
  '{
    "standard": 1.0,
    "express": 1.5,
    "rush": 2.0
  }'::jsonb,
  50.00,
  25.00,
  0.18,
  0.35
) ON CONFLICT DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER handle_pricing_config_updated_at 
  BEFORE UPDATE ON public.pricing_config 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view pricing config
CREATE POLICY "Pricing config viewable by authenticated users" ON public.pricing_config
  FOR SELECT USING (true); -- Allow public access for estimates

-- Only admins can modify pricing config
CREATE POLICY "Pricing config modifiable by admins only" ON public.pricing_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'super_admin')
    )
  );
