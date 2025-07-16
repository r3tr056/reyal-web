-- Supabase Database Schema for REYAL 3D Printing Service

-- Enable RLS (Row Level Security)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  company text,
  address text,
  city text,
  country text DEFAULT 'India',
  is_admin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  price_per_hour numeric(10,2) NOT NULL,
  price_per_gram numeric(10,2),
  density numeric(5,2), -- g/cm³
  available boolean DEFAULT true,
  properties jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Files table (for uploaded 3D models)
CREATE TABLE IF NOT EXISTS files (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  original_filename text NOT NULL,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  mime_type text,
  analysis jsonb, -- stores 3D model analysis data
  is_analyzed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Print settings table
CREATE TABLE IF NOT EXISTS print_settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  material_id uuid REFERENCES materials(id),
  quality text CHECK (quality IN ('draft', 'standard', 'high', 'ultra')) DEFAULT 'standard',
  layer_height numeric(4,3),
  infill_density integer CHECK (infill_density >= 0 AND infill_density <= 100) DEFAULT 20,
  supports boolean DEFAULT false,
  raft boolean DEFAULT false,
  brim boolean DEFAULT false,
  post_processing boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  file_id uuid REFERENCES files(id) NOT NULL,
  quote_number text UNIQUE NOT NULL,
  settings jsonb NOT NULL, -- print settings
  cost_breakdown jsonb NOT NULL, -- detailed cost analysis
  total_cost numeric(10,2) NOT NULL,
  estimated_days integer NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'expired', 'converted')) DEFAULT 'pending',
  valid_until timestamp with time zone NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  order_number text UNIQUE NOT NULL,
  status text CHECK (status IN ('pending', 'confirmed', 'in_production', 'quality_check', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
  total_amount numeric(10,2) NOT NULL,
  payment_status text CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
  payment_method text,
  payment_id text,
  shipping_address jsonb,
  notes text,
  estimated_delivery timestamp with time zone,
  actual_delivery timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  quote_id uuid REFERENCES quotes(id) NOT NULL,
  file_id uuid REFERENCES files(id) NOT NULL,
  quantity integer DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  settings jsonb NOT NULL,
  status text CHECK (status IN ('pending', 'in_queue', 'printing', 'post_processing', 'completed', 'failed')) DEFAULT 'pending',
  print_started_at timestamp with time zone,
  print_completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cart table (for storing items before checkout)
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  quote_id uuid REFERENCES quotes(id) NOT NULL,
  quantity integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, quote_id)
);

-- Order tracking/history table
CREATE TABLE IF NOT EXISTS order_history (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL,
  message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by uuid REFERENCES auth.users(id)
);

-- Admin analytics/statistics table
CREATE TABLE IF NOT EXISTS analytics (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  metric_name text NOT NULL,
  metric_value numeric,
  metadata jsonb,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default materials
INSERT INTO materials (name, code, description, price_per_hour, density, properties) VALUES
('Bambu PLA Basic', 'pla', 'Eco-friendly, easy to print, great for prototypes', 35.00, 1.24, '{"temp_bed": 60, "temp_nozzle": 210, "speed": "medium"}'),
('Bambu PLA-CF', 'pla-cf', 'Carbon fiber reinforced, high strength', 55.00, 1.30, '{"temp_bed": 65, "temp_nozzle": 220, "speed": "medium", "strength": "high"}'),
('Bambu ABS', 'abs', 'Engineering grade, heat resistant, durable', 45.00, 1.04, '{"temp_bed": 100, "temp_nozzle": 250, "speed": "medium", "heat_resistance": "high"}'),
('Bambu PETG-CF', 'petg-cf', 'Chemical resistant, carbon fiber reinforced', 65.00, 1.38, '{"temp_bed": 80, "temp_nozzle": 240, "speed": "slow", "chemical_resistance": "high"}'),
('Bambu TPU 95A', 'tpu', 'Flexible, rubber-like properties', 85.00, 1.20, '{"temp_bed": 50, "temp_nozzle": 230, "speed": "very_slow", "flexibility": "high"}'),
('Bambu PVA Support', 'pva', 'Water-soluble support material', 120.00, 1.23, '{"temp_bed": 60, "temp_nozzle": 200, "soluble": true}')
ON CONFLICT (code) DO NOTHING;

-- Create functions for auto-updating timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER set_timestamp_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_quotes BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_orders BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- Row Level Security (RLS) Policies

-- Profiles: Users can only see/update their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Files: Users can only see their own files, admins can see all
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own files" ON files FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Users can insert own files" ON files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own files" ON files FOR UPDATE USING (auth.uid() = user_id);

-- Quotes: Users can see their own quotes, admins can see all
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own quotes" ON quotes FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Users can insert own quotes" ON quotes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Orders: Users can see their own orders, admins can see all
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON orders FOR UPDATE USING (auth.uid() = user_id);

-- Order items: Users can see items from their orders
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Cart: Users can only see/modify their own cart
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cart" ON cart_items FOR ALL USING (auth.uid() = user_id);

-- Materials: Public read access
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view materials" ON materials FOR SELECT USING (true);

-- Print settings: Public read access
ALTER TABLE print_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view print settings" ON print_settings FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_file_id ON quotes(file_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);

-- Create function to generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS text AS $$
BEGIN
  RETURN 'Q' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('quote_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
BEGIN
  RETURN 'ORD' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create sequences for quote and order numbers
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;