-- REYAL 3D Printing Platform - Complete Database Setup Script
-- This is the single, comprehensive database setup script
-- Run this script in Supabase SQL Editor to set up the entire database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- DROP EXISTING TABLES (if re-running script)
-- =============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS handle_files_updated_at ON public.files;
DROP TRIGGER IF EXISTS handle_print_jobs_updated_at ON public.print_jobs;
DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS handle_marketplace_products_updated_at ON public.marketplace_products;
DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.orders;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.generate_order_number();
DROP FUNCTION IF EXISTS search_marketplace_products(TEXT, TEXT, NUMERIC, NUMERIC, TEXT[], TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS increment_product_view_count(UUID);
DROP FUNCTION IF EXISTS get_featured_products(INTEGER);
DROP FUNCTION IF EXISTS get_trending_products(INTEGER);

DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.user_wishlists CASCADE;
DROP TABLE IF EXISTS public.product_reviews CASCADE;
DROP TABLE IF EXISTS public.product_categories CASCADE;
DROP TABLE IF EXISTS public.marketplace_products CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.print_jobs CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP SEQUENCE IF EXISTS order_sequence;

-- =============================================================================
-- CREATE TABLES
-- =============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  address JSONB,
  is_admin BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  credits DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files table for uploaded 3D models
CREATE TABLE public.files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Print jobs table
CREATE TABLE public.print_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES public.files ON DELETE CASCADE NOT NULL,
  settings JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'confirmed', 'printing', 'completed', 'shipped', 'delivered', 'cancelled')),
  cost_breakdown JSONB,
  total_cost DECIMAL(10,2),
  estimated_delivery DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  taxes DECIMAL(10,2) NOT NULL,
  shipping DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  shipping_address JSONB NOT NULL,
  billing_address JSONB NOT NULL,
  payment_intent_id TEXT,
  tracking_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product categories table
CREATE TABLE public.product_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketplace products table
CREATE TABLE public.marketplace_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  designer_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  material TEXT NOT NULL,
  print_time TEXT,
  complexity INTEGER CHECK (complexity BETWEEN 1 AND 5),
  file_path TEXT NOT NULL,
  preview_images TEXT[] DEFAULT '{}',
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  rating_average NUMERIC(2,1) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product reviews table
CREATE TABLE public.product_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.marketplace_products ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  images TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- User wishlists table
CREATE TABLE public.user_wishlists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.marketplace_products ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX idx_files_user_id ON public.files(user_id);
CREATE INDEX idx_files_status ON public.files(upload_status);
CREATE INDEX idx_print_jobs_user_id ON public.print_jobs(user_id);
CREATE INDEX idx_print_jobs_status ON public.print_jobs(status);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_marketplace_products_category ON public.marketplace_products(category);
CREATE INDEX idx_marketplace_products_featured ON public.marketplace_products(is_featured);
CREATE INDEX idx_marketplace_products_active ON public.marketplace_products(is_active, is_approved);
CREATE INDEX idx_marketplace_products_price ON public.marketplace_products(price);
CREATE INDEX idx_marketplace_products_rating ON public.marketplace_products(rating_average);
CREATE INDEX idx_marketplace_products_created_at ON public.marketplace_products(created_at);
CREATE INDEX idx_marketplace_products_tags ON public.marketplace_products USING GIN(tags);
CREATE INDEX idx_marketplace_products_search ON public.marketplace_products USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_rating ON public.product_reviews(rating);
CREATE INDEX idx_user_wishlists_user_id ON public.user_wishlists(user_id);
CREATE INDEX idx_user_wishlists_product_id ON public.user_wishlists(product_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);
CREATE INDEX idx_product_categories_active ON public.product_categories(is_active);
CREATE INDEX idx_product_categories_sort ON public.product_categories(sort_order);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CREATE RLS POLICIES
-- =============================================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Files policies
CREATE POLICY "Users can view own files" ON public.files
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files" ON public.files
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files" ON public.files
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" ON public.files
FOR DELETE USING (auth.uid() = user_id);

-- Print jobs policies
CREATE POLICY "Users can view own print jobs" ON public.print_jobs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own print jobs" ON public.print_jobs
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own print jobs" ON public.print_jobs
FOR UPDATE USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON public.orders
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Marketplace products policies
CREATE POLICY "Anyone can view active products" ON public.marketplace_products
FOR SELECT USING (is_active = true AND is_approved = true);

CREATE POLICY "Designers can manage own products" ON public.marketplace_products
FOR ALL USING (auth.uid() = designer_id);

-- Product categories policies
CREATE POLICY "Anyone can view active categories" ON public.product_categories
FOR SELECT USING (is_active = true);

-- Product reviews policies
CREATE POLICY "Anyone can view reviews" ON public.product_reviews
FOR SELECT USING (true);

CREATE POLICY "Users can insert own reviews" ON public.product_reviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON public.product_reviews
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON public.product_reviews
FOR DELETE USING (auth.uid() = user_id);

-- User wishlists policies
CREATE POLICY "Users can view own wishlist" ON public.user_wishlists
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist" ON public.user_wishlists
FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- CREATE FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_print_jobs_updated_at
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_marketplace_products_updated_at
  BEFORE UPDATE ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_sequence')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE order_sequence START 1;

-- Trigger for order number generation
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- Function to increment product view count
CREATE OR REPLACE FUNCTION increment_product_view_count(product_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE marketplace_products 
  SET view_count = view_count + 1
  WHERE id = product_uuid AND is_active = true AND is_approved = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get featured products
CREATE OR REPLACE FUNCTION get_featured_products(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price NUMERIC,
  preview_images TEXT[],
  rating_average NUMERIC,
  rating_count INTEGER,
  category TEXT,
  download_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.title,
    mp.price,
    mp.preview_images,
    mp.rating_average,
    mp.rating_count,
    mp.category,
    mp.download_count
  FROM marketplace_products mp
  WHERE mp.is_featured = true 
    AND mp.is_active = true 
    AND mp.is_approved = true
  ORDER BY mp.rating_average DESC, mp.download_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending products
CREATE OR REPLACE FUNCTION get_trending_products(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price NUMERIC,
  preview_images TEXT[],
  rating_average NUMERIC,
  rating_count INTEGER,
  category TEXT,
  download_count INTEGER,
  view_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.title,
    mp.price,
    mp.preview_images,
    mp.rating_average,
    mp.rating_count,
    mp.category,
    mp.download_count,
    mp.view_count
  FROM marketplace_products mp
  WHERE mp.is_active = true 
    AND mp.is_approved = true
    AND mp.created_at >= NOW() - INTERVAL '30 days'
  ORDER BY (mp.download_count * 0.4 + mp.view_count * 0.6) DESC, mp.rating_average DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Advanced search function for marketplace products
CREATE OR REPLACE FUNCTION search_marketplace_products(
  search_query TEXT DEFAULT '',
  category_filter TEXT DEFAULT '',
  min_price NUMERIC DEFAULT 0,
  max_price NUMERIC DEFAULT 999999,
  tag_filters TEXT[] DEFAULT '{}',
  sort_by TEXT DEFAULT 'popularity',
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  short_description TEXT,
  price NUMERIC,
  original_price NUMERIC,
  category TEXT,
  tags TEXT[],
  material TEXT,
  print_time TEXT,
  complexity INTEGER,
  preview_images TEXT[],
  download_count INTEGER,
  view_count INTEGER,
  rating_average NUMERIC,
  rating_count INTEGER,
  is_featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.title,
    mp.short_description,
    mp.price,
    mp.original_price,
    mp.category,
    mp.tags,
    mp.material,
    mp.print_time,
    mp.complexity,
    mp.preview_images,
    mp.download_count,
    mp.view_count,
    mp.rating_average,
    mp.rating_count,
    mp.is_featured,
    mp.created_at
  FROM marketplace_products mp
  WHERE 
    mp.is_active = true 
    AND mp.is_approved = true
    AND (search_query = '' OR mp.title ILIKE '%' || search_query || '%' OR mp.description ILIKE '%' || search_query || '%')
    AND (category_filter = '' OR mp.category = category_filter)
    AND mp.price >= min_price
    AND mp.price <= max_price
    AND (array_length(tag_filters, 1) IS NULL OR mp.tags && tag_filters)
  ORDER BY 
    CASE 
      WHEN sort_by = 'price_low' THEN mp.price 
      ELSE NULL 
    END ASC,
    CASE 
      WHEN sort_by = 'price_high' THEN mp.price 
      ELSE NULL 
    END DESC,
    CASE 
      WHEN sort_by = 'rating' THEN mp.rating_average 
      ELSE NULL 
    END DESC,
    CASE 
      WHEN sort_by = 'newest' THEN mp.created_at 
      ELSE NULL 
    END DESC,
    CASE 
      WHEN sort_by = 'popularity' THEN (mp.download_count * 0.6 + mp.view_count * 0.4)
      ELSE NULL 
    END DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INSERT SEED DATA
-- =============================================================================

-- Insert categories
INSERT INTO public.product_categories (name, slug, description, icon, sort_order) VALUES
('Accessories', 'accessories', 'Phone stands, keychains, and daily-use items', 'Smartphone', 1),
('Office & Workspace', 'office-workspace', 'Desk organizers, pen holders, office tools', 'Briefcase', 2),
('Home & Living', 'home-living', 'Planters, decorative items, household tools', 'Home', 3),
('Gaming & Entertainment', 'gaming-entertainment', 'Gaming accessories, entertainment items', 'Gamepad2', 4),
('Art & Sculpture', 'art-sculpture', 'Artistic pieces and decorative sculptures', 'Palette', 5),
('Tools & Hardware', 'tools-hardware', 'Workshop tools, organizers, hardware', 'Wrench', 6),
('Figurines & Models', 'figurines-models', 'Character figurines and model collectibles', 'Users', 7),
('Automotive', 'automotive', 'Car accessories and automotive tools', 'Car', 8),
('Educational', 'educational', 'Learning aids and educational models', 'GraduationCap', 9),
('Prototyping', 'prototyping', 'Rapid prototyping and design validation', 'Zap', 10);

-- Note: Marketplace products will be inserted after users are created
-- You can run the following INSERT after setting up authentication:

/*
-- Sample marketplace products (run after creating test users)
INSERT INTO public.marketplace_products (
  designer_id, title, description, short_description, price, original_price, 
  category, tags, material, print_time, complexity, file_path, 
  preview_images, is_featured, download_count, view_count, rating_average, rating_count
) VALUES
(
  (SELECT id FROM auth.users LIMIT 1), -- Replace with actual user ID
  'Professional Phone Stand',
  'Precision-engineered phone stand designed for all smartphone sizes. Features adjustable angle, cable management, and anti-slip base for maximum stability.',
  'Precision-engineered phone stand for all devices',
  299, 399,
  'Accessories',
  ARRAY['Professional', 'New', 'Featured'],
  'PLA+',
  '3.5h',
  3,
  'marketplace/phone-stand.stl',
  ARRAY['/api/placeholder/300/300'],
  true,
  156, 892, 4.8, 32
);
*/

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify tables are created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'files', 'print_jobs', 'orders', 'marketplace_products', 'product_categories', 'product_reviews', 'user_wishlists', 'notifications');
  
  IF table_count = 9 THEN
    RAISE NOTICE 'SUCCESS: All 9 tables created successfully';
  ELSE
    RAISE NOTICE 'WARNING: Only % tables created out of 9', table_count;
  END IF;
END $$;

-- Verify indexes are created
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count 
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%';
  
  RAISE NOTICE 'INFO: % performance indexes created', index_count;
END $$;

-- Verify functions are created
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count 
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION';
  
  RAISE NOTICE 'INFO: % custom functions created', function_count;
END $$;

-- Verify RLS is enabled
DO $$
DECLARE
  rls_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_count 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND rowsecurity = true;
  
  RAISE NOTICE 'INFO: RLS enabled on % tables', rls_count;
END $$;

-- =============================================================================
-- PRICING CONFIGURATION TABLE
-- =============================================================================

-- Add pricing configuration table for dynamic pricing multipliers
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

-- RLS for pricing_config
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view pricing config
CREATE POLICY "Pricing config viewable by authenticated users" ON public.pricing_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can modify pricing config
CREATE POLICY "Pricing config modifiable by admins only" ON public.pricing_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'REYAL 3D Printing Platform Database Setup Complete!';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Set up Supabase Storage buckets (3d-models, product-images, user-avatars)';
  RAISE NOTICE '2. Configure authentication settings';
  RAISE NOTICE '3. Add your environment variables to your application';
  RAISE NOTICE '4. Test the database connection from your application';
  RAISE NOTICE '5. Insert sample data after creating test users';
  RAISE NOTICE '=================================================================';
END $$;