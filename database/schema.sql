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

-- Marketplace products table (for selling 3D models)
CREATE TABLE IF NOT EXISTS marketplace_products (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL, -- Designer/seller
  file_id uuid REFERENCES files(id), -- Optional: if based on uploaded file
  title text NOT NULL,
  description text,
  short_description text,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  price numeric(10,2) NOT NULL DEFAULT 0,
  original_price numeric(10,2), -- For showing discounts
  currency text DEFAULT 'INR',
  material_codes text[] DEFAULT '{}', -- References materials.code
  print_time_hours numeric(5,2),
  complexity integer CHECK (complexity >= 1 AND complexity <= 5) DEFAULT 3,
  file_size_mb numeric(8,2),
  dimensions jsonb, -- {length, width, height} in mm
  preview_images text[] DEFAULT '{}', -- Array of image URLs
  model_file_url text, -- URL to downloadable model file
  download_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  rating_average numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  is_approved boolean DEFAULT false, -- For moderation
  license_type text DEFAULT 'standard', -- standard, commercial, royalty_free
  supports_required boolean DEFAULT false,
  raft_required boolean DEFAULT false,
  infill_percentage integer DEFAULT 20,
  metadata jsonb DEFAULT '{}', -- Additional product data
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id uuid REFERENCES marketplace_products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review_text text,
  images text[] DEFAULT '{}',
  is_verified_purchase boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(product_id, user_id) -- One review per user per product
);

-- Product categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text, -- Icon name or URL
  parent_id uuid REFERENCES product_categories(id), -- For subcategories
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Product downloads tracking
CREATE TABLE IF NOT EXISTS product_downloads (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id uuid REFERENCES marketplace_products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  download_type text DEFAULT 'purchase', -- purchase, free, preview
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Wishlist/favorites table
CREATE TABLE IF NOT EXISTS user_wishlists (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  product_id uuid REFERENCES marketplace_products(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, product_id)
);

-- Insert default product categories
INSERT INTO product_categories (name, slug, description, icon, sort_order) VALUES
('Accessories', 'accessories', 'Phone stands, organizers, and everyday items', 'smartphone', 1),
('Office & Workspace', 'office', 'Desk organizers, cable management, and office tools', 'briefcase', 2),
('Figurines & Models', 'figurines', 'Decorative figures, miniatures, and collectibles', 'trophy', 3),
('Home & Living', 'home', 'Household items, decor, and practical home solutions', 'home', 4),
('Gaming & Entertainment', 'gaming', 'Gaming accessories, dice, and entertainment items', 'gamepad-2', 5),
('Tools & Hardware', 'tools', 'Practical tools, fixtures, and mechanical parts', 'wrench', 6),
('Art & Sculpture', 'art', 'Artistic pieces, vases, and decorative sculptures', 'palette', 7),
('Automotive', 'automotive', 'Car accessories, mounts, and automotive tools', 'car', 8),
('Educational', 'educational', 'Learning models, puzzles, and educational tools', 'graduation-cap', 9),
('Prototyping', 'prototyping', 'Engineering prototypes and functional parts', 'cpu', 10)
ON CONFLICT (slug) DO NOTHING;

-- RLS Policies for marketplace tables

-- Marketplace products: Public read, owners can modify
ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active approved products" ON marketplace_products 
  FOR SELECT USING (is_active = true AND is_approved = true);
CREATE POLICY "Users can view own products" ON marketplace_products 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON marketplace_products 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON marketplace_products 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all products" ON marketplace_products 
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Product reviews: Public read, authenticated users can add
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reviews" ON product_reviews FOR SELECT USING (true);
CREATE POLICY "Users can add reviews" ON product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON product_reviews FOR UPDATE USING (auth.uid() = user_id);

-- Product categories: Public read
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON product_categories FOR SELECT USING (is_active = true);

-- Product downloads: Users can view own downloads
ALTER TABLE product_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own downloads" ON product_downloads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert downloads" ON product_downloads FOR INSERT WITH CHECK (true);

-- Wishlists: Users can manage own wishlist
ALTER TABLE user_wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own wishlist" ON user_wishlists FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_products_category ON marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_user_id ON marketplace_products(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_active_approved ON marketplace_products(is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_featured ON marketplace_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_rating ON marketplace_products(rating_average DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_created_at ON marketplace_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_price ON marketplace_products(price);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_downloads_product_id ON product_downloads(product_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON user_wishlists(user_id);

-- Create trigger for marketplace products updated_at
CREATE TRIGGER set_timestamp_marketplace_products BEFORE UPDATE ON marketplace_products FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- Function to update product rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the product's rating average and count
  UPDATE marketplace_products 
  SET 
    rating_average = (
      SELECT COALESCE(AVG(rating)::numeric(3,2), 0) 
      FROM product_reviews 
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for rating updates
CREATE TRIGGER update_product_rating_on_insert AFTER INSERT ON product_reviews FOR EACH ROW EXECUTE FUNCTION update_product_rating();
CREATE TRIGGER update_product_rating_on_update AFTER UPDATE ON product_reviews FOR EACH ROW EXECUTE FUNCTION update_product_rating();
CREATE TRIGGER update_product_rating_on_delete AFTER DELETE ON product_reviews FOR EACH ROW EXECUTE FUNCTION update_product_rating();